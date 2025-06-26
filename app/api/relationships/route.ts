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
    if (contactId) conditions.push(eq(relationships.contactId, contactId));
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

    // Modified query with join to get related contact's name
    const query = db
      .select({
        id: relationships.id,
        contactId: relationships.contactId,
        relatedContactId: relationships.relatedContactId,
        relationshipType: relationships.relationshipType,
        isActive: relationships.isActive,
        notes: relationships.notes,
        createdAt: relationships.createdAt,
        updatedAt: relationships.updatedAt,
        relatedContactName:
          sql<string>`concat(${contact.firstName}, ' ', ${contact.lastName})`.as(
            "relatedContactName"
          ),
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
