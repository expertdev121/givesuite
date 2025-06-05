/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { pledge, category } from "@/lib/db/schema";
import {
  sql,
  eq,
  desc,
  asc,
  and,
  or,
  gte,
  lte,
  like,
  isNull,
  isNotNull,
  SQL,
} from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contactId = parseInt(id, 10);
  const { searchParams } = new URL(request.url);

  // Extract all query parameters
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "pledgeDate";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const minBalance = searchParams.get("minBalance");
  const maxBalance = searchParams.get("maxBalance");
  const currency = searchParams.get("currency");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status"); // 'paid', 'unpaid', 'partial'
  const hasNotes = searchParams.get("hasNotes"); // 'true', 'false'
  const minProgress = searchParams.get("minProgress");
  const maxProgress = searchParams.get("maxProgress");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  try {
    // Build the base query
    let query = db
      .select({
        id: pledge.id,
        pledgeDate: pledge.pledgeDate,
        description: pledge.description,
        originalAmount: pledge.originalAmount,
        currency: pledge.currency,
        originalAmountUsd: pledge.originalAmountUsd,
        totalPaid: pledge.totalPaid,
        totalPaidUsd: pledge.totalPaidUsd,
        balance: pledge.balance,
        balanceUsd: pledge.balanceUsd,
        notes: pledge.notes,
        categoryId: pledge.categoryId,
        categoryName: category.name,
        categoryDescription: category.description,
        progressPercentage: sql<number>`
          CASE 
            WHEN ${pledge.originalAmount}::numeric > 0 
            THEN ROUND((${pledge.totalPaid}::numeric / ${pledge.originalAmount}::numeric) * 100, 1)
            ELSE 0 
          END
        `,
      })
      .from(pledge)
      .leftJoin(category, eq(pledge.categoryId, category.id))
      .$dynamic();

    // Build WHERE conditions
    const conditions: SQL[] = [eq(pledge.contactId, contactId)];

    // Category filter
    if (categoryId) {
      conditions.push(eq(pledge.categoryId, parseInt(categoryId)));
    }

    // Search functionality (search in description, notes, and category name)
    if (search) {
      const searchTerm = `%${search}%`;
      const searchConditions = [
        like(pledge.description, searchTerm),
        like(pledge.notes, searchTerm),
        like(category.name, searchTerm),
      ].filter(Boolean);

      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions) as unknown as SQL<unknown>);
      }
    }

    // Amount range filters (using string comparison for PgNumeric)
    if (minAmount) {
      conditions.push(
        sql`${pledge.originalAmount}::numeric >= ${parseFloat(minAmount)}`
      );
    }
    if (maxAmount) {
      conditions.push(
        sql`${pledge.originalAmount}::numeric <= ${parseFloat(maxAmount)}`
      );
    }

    // Balance range filters (using string comparison for PgNumeric)
    if (minBalance) {
      conditions.push(
        sql`${pledge.balance}::numeric >= ${parseFloat(minBalance)}`
      );
    }
    if (maxBalance) {
      conditions.push(
        sql`${pledge.balance}::numeric <= ${parseFloat(maxBalance)}`
      );
    }

    // Currency filter
    if (currency) {
      conditions.push(eq(pledge.currency, currency as unknown as SQL<unknown>));
    }

    // Date range filters
    if (dateFrom) {
      conditions.push(gte(pledge.pledgeDate, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(
        lte(pledge.pledgeDate, new Date(dateTo)) as unknown as SQL<unknown>
      );
    }

    // Status filter (based on balance)
    if (status === "paid") {
      conditions.push(sql`${pledge.balance}::numeric = 0`);
    } else if (status === "unpaid") {
      conditions.push(sql`${pledge.totalPaid}::numeric = 0`);
    } else if (status === "partial") {
      conditions.push(
        sql`${pledge.totalPaid}::numeric > 0 AND ${pledge.balance}::numeric > 0`
      );
    }

    // Notes filter
    if (hasNotes === "true") {
      conditions.push(isNotNull(pledge.notes));
    } else if (hasNotes === "false") {
      conditions.push(or(isNull(pledge.notes), eq(pledge.notes, "")) as any);
    }

    // Progress percentage filters
    if (minProgress) {
      conditions.push(
        sql`
          CASE 
            WHEN ${pledge.originalAmount}::numeric > 0 
            THEN (${pledge.totalPaid}::numeric / ${
          pledge.originalAmount
        }::numeric) * 100
            ELSE 0 
          END >= ${parseFloat(minProgress)}
        `
      );
    }
    if (maxProgress) {
      conditions.push(
        sql`
          CASE 
            WHEN ${pledge.originalAmount}::numeric > 0 
            THEN (${pledge.totalPaid}::numeric / ${
          pledge.originalAmount
        }::numeric) * 100
            ELSE 0 
          END <= ${parseFloat(maxProgress)}
        `
      );
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const validSortFields = {
      pledgeDate: pledge.pledgeDate,
      originalAmount: pledge.originalAmount,
      originalAmountUsd: pledge.originalAmountUsd,
      totalPaid: pledge.totalPaid,
      totalPaidUsd: pledge.totalPaidUsd,
      balance: pledge.balance,
      balanceUsd: pledge.balanceUsd,
      categoryName: category.name,
      description: pledge.description,
      progressPercentage: sql`
        CASE 
          WHEN ${pledge.originalAmount}::numeric > 0 
          THEN (${pledge.totalPaid}::numeric / ${pledge.originalAmount}::numeric) * 100
          ELSE 0 
        END
      `,
    };

    const sortField =
      validSortFields[sortBy as keyof typeof validSortFields] ||
      pledge.pledgeDate;
    const sortDirection = sortOrder === "asc" ? asc : desc;
    query = query.orderBy(sortDirection(sortField));

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(pledge)
      .leftJoin(category, eq(pledge.categoryId, category.id));

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [pledges, totalCountResult] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery,
    ]);

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate summary statistics
    const summaryQuery = db
      .select({
        totalPledgedUsd: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}::numeric), 0)`,
        totalPaidUsd: sql<number>`COALESCE(SUM(${pledge.totalPaidUsd}::numeric), 0)`,
        totalBalanceUsd: sql<number>`COALESCE(SUM(${pledge.balanceUsd}::numeric), 0)`,
        avgProgressPercentage: sql<number>`
          COALESCE(AVG(
            CASE 
              WHEN ${pledge.originalAmount}::numeric > 0 
              THEN (${pledge.totalPaid}::numeric / ${pledge.originalAmount}::numeric) * 100
              ELSE 0 
            END
          ), 0)
        `,
        fullyPaidCount: sql<number>`SUM(CASE WHEN ${pledge.balance}::numeric = 0 THEN 1 ELSE 0 END)`,
        unpaidCount: sql<number>`SUM(CASE WHEN ${pledge.totalPaid}::numeric = 0 THEN 1 ELSE 0 END)`,
        partiallyPaidCount: sql<number>`
          SUM(CASE 
            WHEN ${pledge.totalPaid}::numeric > 0 AND ${pledge.balance}::numeric > 0 
            THEN 1 ELSE 0 
          END)
        `,
      })
      .from(pledge)
      .leftJoin(category, eq(pledge.categoryId, category.id));

    if (conditions.length > 0) {
      summaryQuery.where(and(...conditions));
    }

    const summary = await summaryQuery;

    // Get unique currencies for filter options
    const currenciesQuery = db
      .selectDistinct({ currency: pledge.currency })
      .from(pledge)
      .where(eq(pledge.contactId, contactId))
      .orderBy(asc(pledge.currency));

    const currencies = await currenciesQuery;

    // Get categories for filter options
    const categoriesQuery = db
      .select({
        id: category.id,
        name: category.name,
        pledgeCount: sql<number>`COUNT(${pledge.id})`,
      })
      .from(category)
      .leftJoin(
        pledge,
        and(eq(pledge.categoryId, category.id), eq(pledge.contactId, contactId))
      )
      .groupBy(category.id, category.name)
      .having(sql`COUNT(${pledge.id}) > 0`)
      .orderBy(asc(category.name));

    const categories = await categoriesQuery;

    return NextResponse.json({
      pledges,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary: summary[0],
      filterOptions: {
        currencies: currencies.map((c) => c.currency).filter(Boolean),
        categories,
      },
      appliedFilters: {
        categoryId,
        search,
        sortBy,
        sortOrder,
        minAmount,
        maxAmount,
        minBalance,
        maxBalance,
        currency,
        dateFrom,
        dateTo,
        status,
        hasNotes,
        minProgress,
        maxProgress,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching pledges:", error);
    return NextResponse.json(
      { error: "Failed to fetch pledges" },
      { status: 500 }
    );
  }
}
