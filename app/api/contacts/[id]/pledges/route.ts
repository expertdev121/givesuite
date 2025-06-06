import { db } from "@/lib/db";
import { pledge, category, contact } from "@/lib/db/schema";
import { sql, eq, and, or, gte, lte, ilike, SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const { id } = await params;
  const contactId = id ? parseInt(id, 10) : null;

  const { searchParams } = new URL(request.url);

  if (contactId !== null && (isNaN(contactId) || contactId <= 0)) {
    return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
  }

  const categoryId = searchParams.get("categoryId")
    ? parseInt(searchParams.get("categoryId")!, 10)
    : null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  if (isNaN(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: "Invalid limit, must be between 1 and 100" },
      { status: 400 }
    );
  }

  if (categoryId && (isNaN(categoryId) || categoryId <= 0)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  try {
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
      .leftJoin(contact, eq(pledge.contactId, contact.id))
      .$dynamic();

    const conditions: SQL<unknown>[] = [];

    if (contactId !== null) {
      conditions.push(eq(pledge.contactId, contactId));
    }

    if (categoryId) {
      conditions.push(eq(pledge.categoryId, categoryId));
    }
    if (startDate) {
      conditions.push(gte(pledge.pledgeDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(pledge.pledgeDate, endDate));
    }
    if (status === "fullyPaid") {
      conditions.push(eq(pledge.balance, "0"));
    } else if (status === "partiallyPaid") {
      conditions.push(
        and(
          sql`${pledge.balance}::numeric > 0`,
          sql`${pledge.totalPaid}::numeric > 0`
        )!
      );
    } else if (status === "unpaid") {
      conditions.push(eq(pledge.totalPaid, "0"));
    }
    if (search) {
      const searchConditions: SQL<unknown>[] = [];
      if (pledge.description) {
        searchConditions.push(
          ilike(sql`COALESCE(${pledge.description}, '')`, `%${search}%`)
        );
      }
      if (pledge.notes) {
        searchConditions.push(
          ilike(sql`COALESCE(${pledge.notes}, '')`, `%${search}%`)
        );
      }
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions)!);
      }
    }

    // Apply conditions only if there are any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const pledges = await query;

    return NextResponse.json({ pledges });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch pledges" },
      { status: 500 }
    );
  }
}
