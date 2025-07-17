import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pledge, NewPledge } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";

const pledgeSchema = z.object({
  contactId: z.number().positive(),
  categoryId: z.number().positive().optional(),
  pledgeDate: z.string().min(1, "Pledge date is required"),
  description: z.string().min(1, "Description is required"),
  originalAmount: z.number().positive("Pledge amount must be positive"),
  currency: z
    .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
    .default("USD"),
  originalAmountUsd: z
    .number()
    .positive("Pledge amount in USD must be positive"),
  exchangeRate: z.number().positive("Exchange rate must be positive"),
  campaignCode: z.string().optional(), // Added campaign code field
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = pledgeSchema.parse(body);
    const balance = validatedData.originalAmount;
    const balanceUsd = validatedData.originalAmountUsd;

    const newPledge: NewPledge = {
      contactId: validatedData.contactId,
      categoryId: validatedData.categoryId || null,
      pledgeDate: validatedData.pledgeDate,
      description: validatedData.description,
      originalAmount: validatedData.originalAmount.toString(),
      currency: validatedData.currency,
      originalAmountUsd: validatedData.originalAmountUsd.toString(),
      exchangeRate: validatedData.exchangeRate.toString(),
      campaignCode: validatedData.campaignCode || null, // Added campaign code field
      totalPaid: "0",
      totalPaidUsd: "0",
      balance: balance.toString(),
      balanceUsd: balanceUsd.toString(),
      isActive: true,
      notes: validatedData.notes || null,
    };

    const result = await db.insert(pledge).values(newPledge).returning();

    return NextResponse.json(
      {
        message: "Pledge created successfully",
        pledge: result[0],
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

    console.error("Error creating pledge:", error);
    return ErrorHandler.handle(error);
  }
}

const querySchema = z.object({
  contactId: z.number().positive().optional(),
  categoryId: z.number().positive().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(["fullyPaid", "partiallyPaid", "unpaid"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  campaignCode: z.string().optional(), // Added campaign code filter
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = querySchema.safeParse({
      contactId: searchParams.get("contactId")
        ? parseInt(searchParams.get("contactId")!)
        : undefined,
      categoryId: searchParams.get("categoryId")
        ? parseInt(searchParams.get("categoryId")!)
        : undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      campaignCode: searchParams.get("campaignCode") ?? undefined, // Added campaign code filter
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
      contactId,
      categoryId,
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
      campaignCode, // Added campaign code filter
    } = parsedParams.data;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];

    if (contactId) {
      conditions.push(eq(pledge.contactId, contactId));
    }

    if (categoryId) {
      conditions.push(eq(pledge.categoryId, categoryId));
    }

    if (search) {
      conditions.push(
        sql`${pledge.description} ILIKE ${"%" + search + "%"} OR ${
          pledge.notes
        } ILIKE ${"%" + search + "%"} OR ${
          pledge.campaignCode
        } ILIKE ${"%" + search + "%"}`
      );
    }

    if (campaignCode) {
      conditions.push(eq(pledge.campaignCode, campaignCode));
    }

    if (status) {
      switch (status) {
        case "fullyPaid":
          conditions.push(sql`${pledge.balance}::numeric = 0`);
          break;
        case "partiallyPaid":
          conditions.push(
            sql`${pledge.totalPaid}::numeric > 0 AND ${pledge.balance}::numeric > 0`
          );
          break;
        case "unpaid":
          conditions.push(sql`${pledge.totalPaid}::numeric = 0`);
          break;
      }
    }

    if (startDate) {
      conditions.push(sql`${pledge.pledgeDate} >= ${startDate}`);
    }

    if (endDate) {
      conditions.push(sql`${pledge.pledgeDate} <= ${endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Execute queries
    const pledgesQuery = db
      .select({
        id: pledge.id,
        contactId: pledge.contactId,
        categoryId: pledge.categoryId,
        pledgeDate: pledge.pledgeDate,
        description: pledge.description,
        originalAmount: pledge.originalAmount,
        currency: pledge.currency,
        originalAmountUsd: pledge.originalAmountUsd,
        exchangeRate: pledge.exchangeRate,
        campaignCode: pledge.campaignCode, // Added campaign code to response
        totalPaid: pledge.totalPaid,
        totalPaidUsd: pledge.totalPaidUsd,
        balance: pledge.balance,
        balanceUsd: pledge.balanceUsd,
        isActive: pledge.isActive,
        notes: pledge.notes,
        createdAt: pledge.createdAt,
        updatedAt: pledge.updatedAt,
        // Calculate progress percentage
        progressPercentage: sql<number>`
          CASE 
            WHEN ${pledge.originalAmount}::numeric = 0 THEN 0
            ELSE ROUND((${pledge.totalPaid}::numeric / ${pledge.originalAmount}::numeric) * 100)
          END
        `.as("progressPercentage"),
        // Add category name via subquery
        categoryName: sql<string>`(
          SELECT name FROM category WHERE id = ${pledge.categoryId}
        )`.as("categoryName"),
        categoryDescription: sql<string>`(
          SELECT description FROM category WHERE id = ${pledge.categoryId}
        )`.as("categoryDescription"),
      })
      .from(pledge)
      .where(whereClause)
      .orderBy(sql`${pledge.updatedAt} DESC`)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(pledge)
      .where(whereClause);

    const [pledges, totalCountResult] = await Promise.all([
      pledgesQuery.execute(),
      countQuery.execute(),
    ]);

    const totalCount = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      pledges,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        contactId,
        categoryId,
        search,
        status,
        startDate,
        endDate,
        campaignCode, // Added campaign code to filters response
      },
    };

    return NextResponse.json(response, {
      headers: {
        "X-Total-Count": response.pagination.totalCount.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching pledges:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch pledges",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}