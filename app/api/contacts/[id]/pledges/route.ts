import { db } from "@/lib/db";
import { pledge, category, contact, paymentPlan } from "@/lib/db/schema";
import { sql, eq, and, or, gte, lte, ilike, SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactId = parseInt(id, 10);

    const { searchParams } = new URL(request.url);

    if (isNaN(contactId) || contactId <= 0) {
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

    // Get payment plan data with more detailed information
    let paymentPlanData: Record<number, {
      totalScheduledAmount: string;
      activePlanCount: number;
      hasActivePlan: boolean;
    }> = {};
    
    try {
      const scheduledData = await db
        .select({
          pledgeId: paymentPlan.pledgeId,
          totalScheduledAmount: sql<string>`COALESCE(SUM(${paymentPlan.totalPlannedAmount}), '0')`.as('totalScheduledAmount'),
          activePlanCount: sql<number>`COUNT(*)`.as('activePlanCount'),
        })
        .from(paymentPlan)
        .where(
          and(
            eq(paymentPlan.isActive, true),
            eq(paymentPlan.planStatus, 'active')
          )
        )
        .groupBy(paymentPlan.pledgeId);
      
      // Convert to lookup object with additional metadata
      paymentPlanData = scheduledData.reduce((acc, item) => {
        acc[item.pledgeId] = {
          totalScheduledAmount: item.totalScheduledAmount,
          activePlanCount: item.activePlanCount,
          hasActivePlan: parseFloat(item.totalScheduledAmount) > 0
        };
        return acc;
      }, {} as Record<number, {
        totalScheduledAmount: string;
        activePlanCount: number;
        hasActivePlan: boolean;
      }>);
    } catch (paymentPlanError) {
      console.warn('Warning: Could not fetch payment plan data, using default values:', paymentPlanError);
      // Continue with empty payment plan data
    }

    // Build main query
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

    // Always filter by contactId
    conditions.push(eq(pledge.contactId, contactId));

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
      searchConditions.push(
        ilike(sql`COALESCE(${pledge.description}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${pledge.notes}, '')`, `%${search}%`)
      );
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions)!);
      }
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const pledgesData = await query;

    // Post-process the results to add payment plan information
    const pledges = pledgesData.map(pledge => {
      const planData = paymentPlanData[pledge.id];
      const scheduledAmount = planData?.totalScheduledAmount || '0';
      const activePlanCount = planData?.activePlanCount || 0;
      const hasActivePlan = planData?.hasActivePlan || false;
      
      const scheduledAmountNum = parseFloat(scheduledAmount);
      const balanceNum = parseFloat(pledge.balance);
      
      // Calculate unscheduled amount (balance minus scheduled amount, but not negative)
      const unscheduledAmount = Math.max(0, balanceNum - scheduledAmountNum).toString();

      return {
        ...pledge,
        // Payment plan related fields
        scheduledAmount,
        unscheduledAmount,
        activePlanCount,
        hasActivePlan,
        // Additional computed fields for UI
        paymentPlanStatus: hasActivePlan ? 'active' : 'none',
        schedulePercentage: balanceNum > 0 ? 
          Math.round((scheduledAmountNum / balanceNum) * 100) : 0,
      };
    });

    // Get total count for pagination (if needed)
    // You might want to add this for better pagination
    const totalCountQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(pledge)
      .leftJoin(contact, eq(pledge.contactId, contact.id));
    
    if (conditions.length > 0) {
      totalCountQuery.where(and(...conditions));
    }
    
    const [{ count: totalCount }] = await totalCountQuery;

    return NextResponse.json({ 
      pledges,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching pledges:', error);
    return NextResponse.json(
      { error: "Failed to fetch pledges", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}