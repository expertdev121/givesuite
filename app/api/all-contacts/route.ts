import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, asc, or, ilike, and, eq } from "drizzle-orm";
import { z } from "zod";
import { unstable_cache } from "next/cache";
import { contact } from "@/lib/db/schema";

const CACHE_TTL_SECONDS = 60;

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  title: z.enum(["mr", "mrs", "ms", "dr", "prof", "eng", "other"]).optional(),
  gender: z.enum(["male", "female"]).optional(),
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
      title: searchParams.get("title") ?? undefined,
      gender: searchParams.get("gender") ?? undefined,
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

    const { page, limit, search, sortBy, sortOrder, title, gender } =
      parsedParams.data;
    const offset = (page - 1) * limit;

    const cacheKey = `contacts:${page}:${limit}:${
      search || ""
    }:${sortBy}:${sortOrder}:${title || ""}:${gender || ""}`;
    const cacheTags = [
      `contacts`,
      `contacts:page:${page}`,
      search && `contacts:search:${search}`,
      title && `contacts:title:${title}`,
      gender && `contacts:gender:${gender}`,
    ].filter(Boolean) as string[];

    const cachedQuery = unstable_cache(
      async () => {
        const conditions = [];

        if (search) {
          conditions.push(
            or(
              ilike(contact.firstName, `%${search}%`),
              ilike(contact.lastName, `%${search}%`),
              ilike(contact.email, `%${search}%`),
              ilike(contact.phone, `%${search}%`),
              ilike(contact.address, `%${search}%`)
            )
          );
        }
        if (title) conditions.push(eq(contact.title, title));
        if (gender) conditions.push(eq(contact.gender, gender));

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;
        let orderByClause;
        switch (sortBy) {
          case "id":
            orderByClause =
              sortOrder === "asc" ? asc(contact.id) : desc(contact.id);
            break;
          case "firstName":
            orderByClause =
              sortOrder === "asc"
                ? asc(contact.firstName)
                : desc(contact.firstName);
            break;
          case "lastName":
            orderByClause =
              sortOrder === "asc"
                ? asc(contact.lastName)
                : desc(contact.lastName);
            break;
          case "email":
            orderByClause =
              sortOrder === "asc" ? asc(contact.email) : desc(contact.email);
            break;
          case "phone":
            orderByClause =
              sortOrder === "asc" ? asc(contact.phone) : desc(contact.phone);
            break;
          case "title":
            orderByClause =
              sortOrder === "asc" ? asc(contact.title) : desc(contact.title);
            break;
          case "gender":
            orderByClause =
              sortOrder === "asc" ? asc(contact.gender) : desc(contact.gender);
            break;
          case "createdAt":
            orderByClause =
              sortOrder === "asc"
                ? asc(contact.createdAt)
                : desc(contact.createdAt);
            break;
          case "updatedAt":
          default:
            orderByClause =
              sortOrder === "asc"
                ? asc(contact.updatedAt)
                : desc(contact.updatedAt);
            break;
        }

        const query = db
          .select()
          .from(contact)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);

        const countQuery = db
          .select({
            count: sql<number>`count(*)`.as("count"),
          })
          .from(contact)
          .where(whereClause);

        const [contacts, totalCountResult] = await Promise.all([
          query.execute(),
          countQuery.execute(),
        ]);

        const totalCount = Number(totalCountResult[0]?.count || 0);
        const totalPages = Math.ceil(totalCount / limit);

        return {
          contacts,
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
            title,
            gender,
            sortBy,
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
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch contacts",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
