import { db } from "@/lib/db";
import { pledge, category } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contactId = parseInt(id, 10);
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");

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
            WHEN ${pledge.originalAmount} > 0 
            THEN ROUND((${pledge.totalPaid} / ${pledge.originalAmount}) * 100, 1)
            ELSE 0 
          END
        `,
      })
      .from(pledge)
      .leftJoin(category, eq(pledge.categoryId, category.id))
      .where(eq(pledge.contactId, contactId))
      .$dynamic();

    if (categoryId) {
      query = query.where(eq(pledge.categoryId, parseInt(categoryId)));
    }

    const pledges = await query.orderBy(desc(pledge.pledgeDate));

    return NextResponse.json({ pledges });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch pledges" },
      { status: 500 }
    );
  }
}
