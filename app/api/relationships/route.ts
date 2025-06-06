import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, asc, or, ilike, and, eq } from "drizzle-orm";
import { z } from "zod";
import { unstable_cache } from "next/cache";
import { ErrorHandler } from "@/lib/error-handler";
import { relationships, NewRelationship } from "@/lib/db/schema";

const CACHE_TTL_SECONDS = 60;

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

const relationshipSchema = z
  .object({
    contactId: z.number().positive(),
    relatedContactId: z.number().positive(),
    relationshipType: z.enum([
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
    ]),
    isActive: z.boolean().default(true),
    notes: z.string().optional(),
  })
  .refine((data) => data.contactId !== data.relatedContactId, {
    message: "Contact ID and Related Contact ID cannot be the same",
    path: ["relatedContactId"],
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

    const cacheKey = `relationships:${page}:${limit}:${
      search || ""
    }:${sortBy}:${sortOrder}:${relationshipType || ""}:${isActive ?? ""}:${
      contactId || ""
    }:${relatedContactId || ""}`;
    const cacheTags = [
      `relationships`,
      `relationships:page:${page}`,
      search && `relationships:search:${search}`,
      relationshipType && `relationships:relationshipType:${relationshipType}`,
      contactId && `relationships:contactId:${contactId}`,
      relatedContactId && `relationships:relatedContactId:${relatedContactId}`,
    ].filter(Boolean) as string[];

    const cachedQuery = unstable_cache(
      async () => {
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

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;
        let orderByClause;
        switch (sortBy) {
          case "id":
            orderByClause =
              sortOrder === "asc"
                ? asc(relationships.id)
                : desc(relationships.id);
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

        const query = db
          .select()
          .from(relationships)
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

        return {
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
      },
      [cacheKey],
      {
        tags: cacheTags,
        revalidate: CACHE_TTL_SECONDS,
      }
    );

    const response = await cachedQuery();

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}`,
        Vary: "Origin, Accept-Encoding",
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
