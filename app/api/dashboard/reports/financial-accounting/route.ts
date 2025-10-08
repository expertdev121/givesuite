import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc } from "drizzle-orm";
import { payment, contact, pledge, paymentAllocations } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const currentYear = new Date().getFullYear();

    // Overall financial summary
    const overallSummary = await db
      .select({
        totalPledged: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(${pledge.totalPaidUsd}), 0)`,
        totalBalance: sql<number>`COALESCE(SUM(${pledge.balanceUsd}), 0)`,
        totalPayments: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(DISTINCT ${payment.id})`,
      })
      .from(pledge)
      .leftJoin(payment, sql`${pledge.id} = ${payment.pledgeId}`)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL OR ${payment.id} IS NULL`);

    // Monthly financial data for the current year
    const monthlyData = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${payment.paymentDate})`,
        year: sql<number>`EXTRACT(YEAR FROM ${payment.paymentDate})`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
      })
      .from(payment)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
      .where(sql`(${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL) AND EXTRACT(YEAR FROM ${payment.paymentDate}) = ${currentYear}`)
      .groupBy(sql`EXTRACT(YEAR FROM ${payment.paymentDate})`, sql`EXTRACT(MONTH FROM ${payment.paymentDate})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${payment.paymentDate})`);

    // Payment method breakdown
    const paymentMethodData = await db
      .select({
        method: payment.paymentMethod,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
      })
      .from(payment)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL`)
      .groupBy(payment.paymentMethod)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

    // Currency breakdown
    const currencyData = await db
      .select({
        currency: payment.currency,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
      })
      .from(payment)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL`)
      .groupBy(payment.currency)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

    // Year-over-year comparison
    const yearlyComparison = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${payment.paymentDate})`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
      })
      .from(payment)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
      .where(sql`(${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL) AND EXTRACT(YEAR FROM ${payment.paymentDate}) >= ${currentYear - 2}`)
      .groupBy(sql`EXTRACT(YEAR FROM ${payment.paymentDate})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${payment.paymentDate})`);

    return NextResponse.json({
      summary: overallSummary[0] || {
        totalPledged: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalPayments: 0,
        paymentCount: 0,
      },
      monthlyData,
      paymentMethodData,
      currencyData,
      yearlyComparison,
    });
  } catch (error) {
    console.error("Error fetching financial accounting data:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial accounting data" },
      { status: 500 }
    );
  }
}
