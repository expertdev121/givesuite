import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, sql, desc, asc, like, or, ilike } from "drizzle-orm";
import {
  contact,
  pledge,
  studentRoles,
  contactRoles,
  payment,
} from "@/lib/db/schema";
import { z } from "zod";
import { unstable_cache } from "next/cache";

// Define the response type
interface ContactResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  gender: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  totalPledgedUsd: number;
  totalPaidUsd: number;
  currentBalanceUsd: number;
  studentProgram: string | null;
  studentStatus: string | null;
  roleName: string | null;
  lastPaymentDate: Date | null;
}

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z
    .enum(["updatedAt", "firstName", "lastName", "totalPledgedUsd"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const CACHE_TTL_SECONDS = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
    });

    if (!parsedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsedParams.error },
        { status: 400 }
      );
    }

    const { page, limit, search, sortBy, sortOrder } = parsedParams.data;
    const offset = (page - 1) * limit;

    const cacheKey = `contacts:${page}:${limit}:${
      search || ""
    }:${sortBy}:${sortOrder}`;
    const cacheTags = [
      `contacts`,
      `contacts:${page}`,
      `contacts:search:${search || "all"}`,
    ];

    const cachedQuery = unstable_cache(
      async () => {
        const totalPledgedUsd =
          sql<number>`COALESCE(SUM(${pledge.originalAmount}), 0)`.as(
            "totalPledgedUsd"
          );
        const totalPaidUsd =
          sql<number>`COALESCE(SUM(${pledge.totalPaidUsd}), 0)`.as(
            "totalPaidUsd"
          );
        const currentBalanceUsd =
          sql<number>`COALESCE(SUM(${pledge.balanceUsd}), 0)`.as(
            "currentBalanceUsd"
          );
        const lastPaymentDate = sql<Date>`MAX(${payment.paymentDate})`.as(
          "lastPaymentDate"
        );

        let query = db
          .select({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
            gender: contact.gender,
            address: contact.address,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
            totalPledgedUsd,
            totalPaidUsd,
            currentBalanceUsd,
            studentProgram: studentRoles.program,
            studentStatus: studentRoles.status,
            roleName: contactRoles.roleName,
            lastPaymentDate,
          })
          .from(contact)
          .leftJoin(pledge, eq(contact.id, pledge.contactId))
          .leftJoin(studentRoles, eq(contact.id, studentRoles.contactId))
          .leftJoin(contactRoles, eq(contact.id, contactRoles.contactId))
          .leftJoin(payment, eq(pledge.id, payment.pledgeId))
          .groupBy(
            contact.id,
            contact.firstName,
            contact.lastName,
            contact.email,
            contact.phone,
            contact.title,
            contact.gender,
            contact.address,
            contact.createdAt,
            contact.updatedAt,
            studentRoles.program,
            studentRoles.status,
            contactRoles.roleName
          );

        // Add search conditions
        if (search) {
          query = query.where(
            or(
              ilike(contact.firstName, `%${search}%`),
              ilike(contact.lastName, `%${search}%`),
              ilike(contact.email, `%${search}%`),
              like(contact.phone, `%${search}%`)
            )
          );
        }

        // Add sorting
        switch (sortBy) {
          case "updatedAt":
            query = query.orderBy(
              sortOrder === "asc"
                ? asc(contact.updatedAt)
                : desc(contact.updatedAt)
            );
            break;
          case "firstName":
            query = query.orderBy(
              sortOrder === "asc"
                ? asc(contact.firstName)
                : desc(contact.firstName)
            );
            break;
          case "lastName":
            query = query.orderBy(
              sortOrder === "asc"
                ? asc(contact.lastName)
                : desc(contact.lastName)
            );
            break;
          case "totalPledgedUsd":
            query = query.orderBy(
              sortOrder === "asc" ? asc(totalPledgedUsd) : desc(totalPledgedUsd)
            );
            break;
        }

        const [contacts, totalCountResult] = await Promise.all([
          query.limit(limit).offset(offset).execute(),
          db
            .select({ count: sql<number>`count(*)` })
            .from(contact)
            .execute(),
        ]);

        const totalCount = Number(totalCountResult[0]?.count || 0);
        const totalPages = Math.ceil(totalCount / limit);

        return {
          contacts: contacts as ContactResponse[],
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
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
        Vary: "Origin",
      },
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch contacts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
