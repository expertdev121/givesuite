import { db } from "@/lib/db";
import { category, pledge } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contactId = parseInt(id, 10);

  try {
    const categoriesWithTotals = await db
      .select({
        categoryId: category.id,
        categoryName: category.name,
        categoryDescription: category.description,
        totalPledgedUsd: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0)`,
        totalPaidUsd: sql<number>`COALESCE(SUM(${pledge.totalPaidUsd}), 0)`,
        currentBalanceUsd: sql<number>`COALESCE(SUM(${pledge.balanceUsd}), 0)`,
        pledgeCount: sql<number>`COUNT(${pledge.id})`,
      })
      .from(category)
      .leftJoin(pledge, eq(category.id, pledge.categoryId))
      .where(eq(pledge.contactId, contactId))
      .groupBy(category.id, category.name, category.description)
      .orderBy(desc(sql`SUM(${pledge.originalAmountUsd})`));

    return NextResponse.json({ categories: categoriesWithTotals });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
