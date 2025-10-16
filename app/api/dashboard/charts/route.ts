import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, asc } from "drizzle-orm";
import {
  payment,
  pledge,
  contact
} from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const period = searchParams.get('period') || '12'; // months

    // Base conditions
    const baseConditions = contactId && contactId !== "all"
      ? sql`${pledge.contactId} = ${contactId}`
      : sql`1=1`;

    // Payment trends over time (monthly)
    const paymentTrends = await db
      .select({
        month: sql<string>`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(*)`,
      })
      .from(payment)
      .innerJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${baseConditions}`)
      .groupBy(sql`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`)
      .orderBy(asc(sql`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`))
      .limit(parseInt(period));

    // Balance over time (cumulative)
    const balanceOverTime = await db
      .select({
        month: sql<string>`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`,
        cumulativePaid: sql<number>`SUM(SUM(${payment.amountUsd})) OVER (ORDER BY TO_CHAR(${payment.paymentDate}, 'YYYY-MM'))`,
        cumulativeOwed: sql<number>`SUM(${pledge.originalAmountUsd}) OVER (ORDER BY TO_CHAR(${payment.paymentDate}, 'YYYY-MM'))`,
      })
      .from(payment)
      .innerJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${baseConditions}`)
      .groupBy(sql`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`, pledge.originalAmountUsd)
      .orderBy(asc(sql`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`))
      .limit(parseInt(period));

    // Payment method distribution
    const paymentMethodDistribution = await db
      .select({
        method: payment.paymentMethod,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(payment)
      .innerJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${baseConditions}`)
      .groupBy(payment.paymentMethod)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

    // Top contributors (by payment amount)
    const topContributors = await db
      .select({
        contactId: contact.id,
        contactName: contact.displayName,
        totalPaid: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
      })
      .from(contact)
      .innerJoin(pledge, sql`${contact.id} = ${pledge.contactId}`)
      .innerJoin(payment, sql`${pledge.id} = ${payment.pledgeId}`)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${baseConditions}`)
      .groupBy(contact.id, contact.displayName)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`))
      .limit(10);

    // Pledge status distribution
    const pledgeStatusData = await db
      .select({
        status: sql<string>`CASE
          WHEN ${pledge.balanceUsd} = 0 THEN 'Fully Paid'
          WHEN ${pledge.balanceUsd} > 0 AND ${pledge.balanceUsd} < ${pledge.originalAmountUsd} * 0.5 THEN 'Partially Paid'
          WHEN ${pledge.balanceUsd} >= ${pledge.originalAmountUsd} * 0.5 THEN 'Mostly Unpaid'
          ELSE 'Unknown'
        END`,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0)`,
      })
      .from(pledge)
      .where(sql`${pledge.isActive} = true AND ${baseConditions}`)
      .groupBy(sql`CASE
        WHEN ${pledge.balanceUsd} = 0 THEN 'Fully Paid'
        WHEN ${pledge.balanceUsd} > 0 AND ${pledge.balanceUsd} < ${pledge.originalAmountUsd} * 0.5 THEN 'Partially Paid'
        WHEN ${pledge.balanceUsd} >= ${pledge.originalAmountUsd} * 0.5 THEN 'Mostly Unpaid'
        ELSE 'Unknown'
      END`);

    return NextResponse.json({
      paymentTrends,
      balanceOverTime,
      paymentMethodDistribution,
      topContributors,
      pledgeStatusData,
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
