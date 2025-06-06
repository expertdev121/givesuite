import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, asc, or, ilike, and, eq } from "drizzle-orm";
import { z } from "zod";
import { unstable_cache } from "next/cache";
import { ErrorHandler } from "@/lib/error-handler";
import { contactRoles, NewContactRole } from "@/lib/db/schema";

const CACHE_TTL_SECONDS = 60;

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  roleName: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  contactId: z.coerce.number().positive().optional(),
});

const contactRoleSchema = z
  .object({
    contactId: z.number().positive(),
    roleName: z.string().min(1, "Role name is required"),
    isActive: z.boolean().default(true),
    startDate: z.string().datetime().optional().or(z.date().optional()),
    endDate: z.string().datetime().optional().or(z.date().optional()),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end > start;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      roleName: searchParams.get("roleName") ?? undefined,
      isActive: searchParams.get("isActive") ?? undefined,
      contactId: searchParams.get("contactId") ?? undefined,
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
      roleName,
      isActive,
      contactId,
    } = parsedParams.data;
    const offset = (page - 1) * limit;

    const cacheKey = `contactRoles:${page}:${limit}:${
      search || ""
    }:${sortBy}:${sortOrder}:${roleName || ""}:${isActive ?? ""}:${
      contactId || ""
    }`;
    const cacheTags = [
      `contactRoles`,
      `contactRoles:page:${page}`,
      search && `contactRoles:search:${search}`,
      roleName && `contactRoles:roleName:${roleName}`,
      contactId && `contactRoles:contactId:${contactId}`,
    ].filter(Boolean) as string[];

    const cachedQuery = unstable_cache(
      async () => {
        const conditions = [];

        if (search) {
          conditions.push(
            or(
              ilike(contactRoles.roleName, `%${search}%`),
              ilike(contactRoles.notes, `%${search}%`)
            )
          );
        }
        if (roleName) conditions.push(eq(contactRoles.roleName, roleName));
        if (isActive !== undefined)
          conditions.push(eq(contactRoles.isActive, isActive));
        if (contactId) conditions.push(eq(contactRoles.contactId, contactId));

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;
        let orderByClause;
        switch (sortBy) {
          case "id":
            orderByClause =
              sortOrder === "asc"
                ? asc(contactRoles.id)
                : desc(contactRoles.id);
            break;
          case "contactId":
            orderByClause =
              sortOrder === "asc"
                ? asc(contactRoles.contactId)
                : desc(contactRoles.contactId);
            break;
          case "roleName":
            orderByClause =
              sortOrder === "asc"
                ? asc(contactRoles.roleName)
                : desc(contactRoles.roleName);
            break;
          case "startDate":
            orderByClause =
              sortOrder === "asc"
                ? asc(contactRoles.startDate)
                : desc(contactRoles.startDate);
            break;
          case "endDate":
            orderByClause =
              sortOrder === "asc"
                ? asc(contactRoles.endDate)
                : desc(contactRoles.endDate);
            break;
          case "isActive":
            orderByClause =
              sortOrder === "asc"
                ? asc(contactRoles.isActive)
                : desc(contactRoles.isActive);
            break;
          case "createdAt":
            orderByClause =
              sortOrder === "asc"
                ? asc(contactRoles.createdAt)
                : desc(contactRoles.createdAt);
            break;
          case "updatedAt":
          default:
            orderByClause =
              sortOrder === "asc"
                ? asc(contactRoles.updatedAt)
                : desc(contactRoles.updatedAt);
            break;
        }

        const query = db
          .select()
          .from(contactRoles)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);

        const countQuery = db
          .select({
            count: sql<number>`count(*)`.as("count"),
          })
          .from(contactRoles)
          .where(whereClause);

        const [roles, totalCountResult] = await Promise.all([
          query.execute(),
          countQuery.execute(),
        ]);

        const totalCount = Number(totalCountResult[0]?.count || 0);
        const totalPages = Math.ceil(totalCount / limit);

        return {
          contactRoles: roles,
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
            roleName,
            isActive,
            contactId,
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
    console.error("Error fetching contact roles:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch contact roles",
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
    const validatedData = contactRoleSchema.parse(body);

    const existingRole = await db
      .select()
      .from(contactRoles)
      .where(
        and(
          eq(contactRoles.contactId, validatedData.contactId),
          eq(contactRoles.roleName, validatedData.roleName),
          eq(contactRoles.isActive, true)
        )
      )
      .limit(1);

    if (existingRole.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate role",
          message: `Contact already has an active role '${validatedData.roleName}'`,
        },
        { status: 409 }
      );
    }

    const newContactRole: NewContactRole = {
      ...validatedData,
      startDate: validatedData.startDate
        ? new Date(validatedData.startDate).toISOString().split("T")[0]
        : undefined,
      endDate: validatedData.endDate
        ? new Date(validatedData.endDate).toISOString().split("T")[0]
        : undefined,
    };

    const result = await db
      .insert(contactRoles)
      .values(newContactRole)
      .returning();

    return NextResponse.json(
      {
        message: "Contact role created successfully",
        contactRole: result[0],
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
