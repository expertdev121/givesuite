import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, asc, or, ilike, and, eq } from "drizzle-orm";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";
import { relationships, NewRelationship, contact } from "@/lib/db/schema";
import { relationshipSchema } from "@/lib/form-schemas/relationships";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  relationshipType: z
    .enum([
      "mother",
      "father",
      "grandmother",
      "grandfather",
      "sister",
      "spouse",
      "brother",
      "partner",
      "step-brother",
      "step-sister",
      "stepmother",
      "stepfather",
      "divorced co-parent",
      "separated co-parent",
      "legal guardian",
      "step-parent",
      "legal guardian partner",
      "grandparent",
      "aunt",
      "uncle",
      "aunt/uncle",
    ])
    .optional(),
  isActive: z.coerce.boolean().optional(),
  contactId: z.coerce.number().positive().optional(),
  relatedContactId: z.coerce.number().positive().optional(),
});

// Helper function to get the reciprocal relationship display name
const getReciprocalRelationship = (relationshipType: string): string => {
  const reciprocalMap: Record<string, string> = {
    mother: "child",
    father: "child",
    grandmother: "grandchild",
    grandfather: "grandchild",
    sister: "sister", // Sister of sister is sister
    brother: "brother", // Brother of brother is brother
    spouse: "spouse", // Spouse is reciprocal
    partner: "partner", // Partner is reciprocal
    "step-brother": "step-sibling",
    "step-sister": "step-sibling",
    stepmother: "step-child",
    stepfather: "step-child",
    "divorced co-parent": "child",
    "separated co-parent": "child",
    "legal guardian": "ward",
    "step-parent": "step-child",
    "legal guardian partner": "ward",
    grandparent: "grandchild",
    aunt: "niece/nephew",
    uncle: "niece/nephew",
    "aunt/uncle": "niece/nephew",
  };

  return reciprocalMap[relationshipType] || relationshipType;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      relationshipType: searchParams.get("relationshipType") ?? undefined,
      isActive: searchParams.get("isActive") ?? undefined,
      contactId: searchParams.get("contactId") ?? undefined,
      relatedContactId: searchParams.get("relatedContactId") ?? undefined,
    });

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsedParams.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      relationshipType,
      isActive,
      contactId,
      relatedContactId,
    } = parsedParams.data;
    const offset = (page - 1) * limit;

    // If querying for a specific contact's relationships, show both directions
    if (contactId) {
      const conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(relationships.relationshipType, `%${search}%`),
            ilike(relationships.notes, `%${search}%`)
          )
        );
      }
      if (relationshipType)
        conditions.push(eq(relationships.relationshipType, relationshipType));
      if (isActive !== undefined)
        conditions.push(eq(relationships.isActive, isActive));
      if (relatedContactId)
        conditions.push(
          or(
            eq(relationships.relatedContactId, relatedContactId),
            eq(relationships.contactId, relatedContactId)
          )
        );

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get relationships where the contact is the source (contactId)
      const forwardRelationsQuery = db
        .select({
          id: relationships.id,
          contactId: sql<number>`${contactId}`.as("contactId"),
          relatedContactId: relationships.relatedContactId,
          relationshipType: relationships.relationshipType,
          displayRelationshipType: relationships.relationshipType,
          isActive: relationships.isActive,
          notes: relationships.notes,
          createdAt: relationships.createdAt,
          updatedAt: relationships.updatedAt,
          relatedContactName:
            sql<string>`concat(${contact.firstName}, ' ', ${contact.lastName})`.as(
              "relatedContactName"
            ),
          isReverse: sql<boolean>`false`.as("isReverse"),
        })
        .from(relationships)
        .leftJoin(contact, eq(relationships.relatedContactId, contact.id))
        .where(and(eq(relationships.contactId, contactId), whereClause));

      // Get relationships where the contact is the target (relatedContactId)
      const reverseRelationsQuery = db
        .select({
          id: sql<number>`${relationships.id} + 1000000`.as("id"), // Offset to avoid ID conflicts
          contactId: sql<number>`${contactId}`.as("contactId"),
          relatedContactId: relationships.contactId,
          relationshipType: relationships.relationshipType,
          displayRelationshipType: relationships.relationshipType, // We'll map this in JavaScript
          isActive: relationships.isActive,
          notes: relationships.notes,
          createdAt: relationships.createdAt,
          updatedAt: relationships.updatedAt,
          relatedContactName:
            sql<string>`concat(${contact.firstName}, ' ', ${contact.lastName})`.as(
              "relatedContactName"
            ),
          isReverse: sql<boolean>`true`.as("isReverse"),
        })
        .from(relationships)
        .leftJoin(contact, eq(relationships.contactId, contact.id))
        .where(and(eq(relationships.relatedContactId, contactId), whereClause));

      // Execute both queries
      const [forwardRelations, reverseRelations] = await Promise.all([
        forwardRelationsQuery.execute(),
        reverseRelationsQuery.execute(),
      ]);

      // Map reverse relationships to show reciprocal types
      const mappedReverseRelations = reverseRelations.map((rel) => ({
        ...rel,
        displayRelationshipType: getReciprocalRelationship(
          rel.relationshipType
        ),
        notes: rel.notes
          ? `Reciprocal: ${rel.notes}`
          : "Auto-generated reciprocal relationship",
      }));

      // Combine results
      const allRelations = [...forwardRelations, ...mappedReverseRelations];

      // Apply sorting
      let sortedRelations = allRelations;
      switch (sortBy) {
        case "relatedContactName":
          sortedRelations = allRelations.sort((a, b) => {
            const comparison = a.relatedContactName.localeCompare(
              b.relatedContactName
            );
            return sortOrder === "asc" ? comparison : -comparison;
          });
          break;
        case "relationshipType":
          sortedRelations = allRelations.sort((a, b) => {
            const comparison = a.displayRelationshipType.localeCompare(
              b.displayRelationshipType
            );
            return sortOrder === "asc" ? comparison : -comparison;
          });
          break;
        case "createdAt":
          sortedRelations = allRelations.sort((a, b) => {
            const comparison =
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return sortOrder === "asc" ? comparison : -comparison;
          });
          break;
        case "updatedAt":
        default:
          sortedRelations = allRelations.sort((a, b) => {
            const comparison =
              new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            return sortOrder === "asc" ? comparison : -comparison;
          });
          break;
      }

      // Apply pagination
      const paginatedRelations = sortedRelations.slice(offset, offset + limit);
      const totalCount = sortedRelations.length;
      const totalPages = Math.ceil(totalCount / limit);

      const response = {
        relationships: paginatedRelations,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        filters: {
          search,
          relationshipType,
          isActive,
          contactId,
          relatedContactId,
          sortBy: sortBy,
          sortOrder,
        },
      };

      return NextResponse.json(response, {
        headers: {
          "X-Total-Count": response.pagination.totalCount.toString(),
        },
      });
    }

    // Original query logic for non-contact-specific queries
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(relationships.relationshipType, `%${search}%`),
          ilike(relationships.notes, `%${search}%`)
        )
      );
    }
    if (relationshipType)
      conditions.push(eq(relationships.relationshipType, relationshipType));
    if (isActive !== undefined)
      conditions.push(eq(relationships.isActive, isActive));
    if (relatedContactId)
      conditions.push(eq(relationships.relatedContactId, relatedContactId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    let orderByClause;
    switch (sortBy) {
      case "id":
        orderByClause =
          sortOrder === "asc" ? asc(relationships.id) : desc(relationships.id);
        break;
      case "contactId":
        orderByClause =
          sortOrder === "asc"
            ? asc(relationships.contactId)
            : desc(relationships.contactId);
        break;
      case "relatedContactId":
        orderByClause =
          sortOrder === "asc"
            ? asc(relationships.relatedContactId)
            : desc(relationships.relatedContactId);
        break;
      case "relationshipType":
        orderByClause =
          sortOrder === "asc"
            ? asc(relationships.relationshipType)
            : desc(relationships.relationshipType);
        break;
      case "isActive":
        orderByClause =
          sortOrder === "asc"
            ? asc(relationships.isActive)
            : desc(relationships.isActive);
        break;
      case "createdAt":
        orderByClause =
          sortOrder === "asc"
            ? asc(relationships.createdAt)
            : desc(relationships.createdAt);
        break;
      case "updatedAt":
      default:
        orderByClause =
          sortOrder === "asc"
            ? asc(relationships.updatedAt)
            : desc(relationships.updatedAt);
        break;
    }

    // Original query with join to get related contact's name
    const query = db
      .select({
        id: relationships.id,
        contactId: relationships.contactId,
        relatedContactId: relationships.relatedContactId,
        relationshipType: relationships.relationshipType,
        displayRelationshipType: relationships.relationshipType,
        isActive: relationships.isActive,
        notes: relationships.notes,
        createdAt: relationships.createdAt,
        updatedAt: relationships.updatedAt,
        relatedContactName:
          sql<string>`concat(${contact.firstName}, ' ', ${contact.lastName})`.as(
            "relatedContactName"
          ),
        isReverse: sql<boolean>`false`.as("isReverse"),
      })
      .from(relationships)
      .leftJoin(contact, eq(relationships.relatedContactId, contact.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(relationships)
      .where(whereClause);

    const [relations, totalCountResult] = await Promise.all([
      query.execute(),
      countQuery.execute(),
    ]);

    const totalCount = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      relationships: relations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        search,
        relationshipType,
        isActive,
        contactId,
        relatedContactId,
        sortBy: sortBy,
        sortOrder,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "X-Total-Count": response.pagination.totalCount.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching relationships:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch relationships",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = relationshipSchema.parse(body);

    const existingRelationship = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.contactId, validatedData.contactId),
          eq(relationships.relatedContactId, validatedData.relatedContactId),
          eq(relationships.relationshipType, validatedData.relationshipType),
          eq(relationships.isActive, true)
        )
      )
      .limit(1);

    if (existingRelationship.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate relationship",
          message: `Active relationship of type '${validatedData.relationshipType}' already exists between contact ${validatedData.contactId} and related contact ${validatedData.relatedContactId}`,
        },
        { status: 409 }
      );
    }

    const newRelationship: NewRelationship = {
      ...validatedData,
    };

    const result = await db
      .insert(relationships)
      .values(newRelationship)
      .returning();

    return NextResponse.json(
      {
        message: "Relationship created successfully",
        relationship: result[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    return ErrorHandler.handle(error);
  }
}
