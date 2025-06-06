import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, asc, or, ilike, and, eq } from "drizzle-orm";
import { z } from "zod";
import { unstable_cache } from "next/cache";
import { ErrorHandler } from "@/lib/error-handler";
import { NewStudentRole, studentRoles } from "@/lib/db/schema";

const CACHE_TTL_SECONDS = 60;

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  program: z.enum(["LH", "LLC", "ML", "Kollel", "Madrich"]).optional(),
  status: z
    .enum([
      "Student",
      "Active Soldier",
      "Staff",
      "Withdrew",
      "Transferred Out",
      "Left Early",
      "Asked to Leave",
    ])
    .optional(),
  year: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  contactId: z.coerce.number().positive().optional(),
});

const studentRoleSchema = z
  .object({
    contactId: z.number().positive(),
    year: z.string().default("2024-2025"),
    program: z.enum(["LH", "LLC", "ML", "Kollel", "Madrich"]),
    track: z.enum(["Alef", "Bet", "Gimmel", "Dalet", "Heh"]),
    trackDetail: z
      .enum(["Full Year", "Fall", "Spring", "Until Pesach"])
      .optional(),
    status: z.enum([
      "Student",
      "Active Soldier",
      "Staff",
      "Withdrew",
      "Transferred Out",
      "Left Early",
      "Asked to Leave",
    ]),
    machzor: z.enum(["10.5", "10", "9.5", "9", "8.5", "8"]).optional(),
    startDate: z.string().datetime().optional().or(z.date().optional()),
    endDate: z.string().datetime().optional().or(z.date().optional()),
    isActive: z.boolean().default(true),
    additionalNotes: z.string().optional(),
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
      program: searchParams.get("program") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      year: searchParams.get("year") ?? undefined,
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
      program,
      status,
      year,
      isActive,
      contactId,
    } = parsedParams.data;
    const offset = (page - 1) * limit;

    const cacheKey = `studentRoles:${page}:${limit}:${
      search || ""
    }:${sortBy}:${sortOrder}:${program || ""}:${status || ""}:${year || ""}:${
      isActive ?? ""
    }:${contactId || ""}`;
    const cacheTags = [
      `studentRoles`,
      `studentRoles:page:${page}`,
      search && `studentRoles:search:${search}`,
      program && `studentRoles:program:${program}`,
      status && `studentRoles:status:${status}`,
      year && `studentRoles:year:${year}`,
      contactId && `studentRoles:contactId:${contactId}`,
    ].filter(Boolean) as string[];

    const cachedQuery = unstable_cache(
      async () => {
        const conditions = [];

        if (search) {
          conditions.push(
            or(
              ilike(studentRoles.program, `%${search}%`),
              ilike(studentRoles.status, `%${search}%`),
              ilike(studentRoles.year, `%${search}%`),
              ilike(studentRoles.track, `%${search}%`),
              ilike(studentRoles.additionalNotes, `%${search}%`)
            )
          );
        }
        if (program) conditions.push(eq(studentRoles.program, program));
        if (status) conditions.push(eq(studentRoles.status, status));
        if (year) conditions.push(eq(studentRoles.year, year));
        if (isActive !== undefined)
          conditions.push(eq(studentRoles.isActive, isActive));
        if (contactId) conditions.push(eq(studentRoles.contactId, contactId));

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;
        let orderByClause;
        switch (sortBy) {
          case "id":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.id)
                : desc(studentRoles.id);
            break;
          case "contactId":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.contactId)
                : desc(studentRoles.contactId);
            break;
          case "year":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.year)
                : desc(studentRoles.year);
            break;
          case "program":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.program)
                : desc(studentRoles.program);
            break;
          case "track":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.track)
                : desc(studentRoles.track);
            break;
          case "status":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.status)
                : desc(studentRoles.status);
            break;
          case "machzor":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.machzor)
                : desc(studentRoles.machzor);
            break;
          case "startDate":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.startDate)
                : desc(studentRoles.startDate);
            break;
          case "endDate":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.endDate)
                : desc(studentRoles.endDate);
            break;
          case "isActive":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.isActive)
                : desc(studentRoles.isActive);
            break;
          case "createdAt":
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.createdAt)
                : desc(studentRoles.createdAt);
            break;
          case "updatedAt":
          default:
            orderByClause =
              sortOrder === "asc"
                ? asc(studentRoles.updatedAt)
                : desc(studentRoles.updatedAt);
            break;
        }

        const query = db
          .select()
          .from(studentRoles)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);

        const countQuery = db
          .select({
            count: sql<number>`count(*)`.as("count"),
          })
          .from(studentRoles)
          .where(whereClause);

        const [roles, totalCountResult] = await Promise.all([
          query.execute(),
          countQuery.execute(),
        ]);

        const totalCount = Number(totalCountResult[0]?.count || 0);
        const totalPages = Math.ceil(totalCount / limit);

        return {
          studentRoles: roles,
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
            program,
            status,
            year,
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
    console.error("Error fetching student roles:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch student roles",
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
    const validatedData = studentRoleSchema.parse(body);
    const existingRole = await db
      .select()
      .from(studentRoles)
      .where(
        and(
          eq(studentRoles.contactId, validatedData.contactId),
          eq(studentRoles.year, validatedData.year),
          eq(studentRoles.isActive, true)
        )
      )
      .limit(1);

    if (existingRole.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate role",
          message: `Contact already has an active role for year ${validatedData.year}`,
        },
        { status: 409 }
      );
    }

    const newStudentRole: NewStudentRole = {
      ...validatedData,
      startDate: validatedData.startDate
        ? new Date(validatedData.startDate).toISOString().split("T")[0]
        : undefined,
      endDate: validatedData.endDate
        ? new Date(validatedData.endDate).toISOString().split("T")[0]
        : undefined,
    };

    const result = await db
      .insert(studentRoles)
      .values(newStudentRole)
      .returning();
    await Promise.all([]);

    return NextResponse.json(
      {
        message: "Student role created successfully",
        studentRole: result[0],
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
