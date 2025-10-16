import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, asc } from "drizzle-orm";
import {
  payment,
  pledge,
  paymentPlan,
  installmentSchedule,
  contact,
  paymentAllocations,
  solicitor,
  bonusCalculation
} from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Base query conditions
    const baseConditions = contactId && contactId !== "all"
      ? sql`${pledge.contactId} = ${contactId}`
      : sql`1=1`;

    // Add date conditions for payments
    let paymentDateConditions = sql`1=1`;
    if (startDate) {
      paymentDateConditions = sql`${paymentDateConditions} AND ${payment.paymentDate} >= ${startDate}`;
    }
    if (endDate) {
      paymentDateConditions = sql`${paymentDateConditions} AND ${payment.paymentDate} <= ${endDate}`;
    }

    // Define endDate for balance calculations (use far future if no endDate)
    const endDateParam = endDate || '9999-12-31';

    // Detailed payment breakdown
    const paymentBreakdown = await db
      .select({
        id: payment.id,
        paymentDate: sql<string>`TO_CHAR(${payment.receivedDate}, 'DD-MON-YYYY')`,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        contactName: contact.displayName,
        pledgeDescription: pledge.description,
        solicitorCode: solicitor.solicitorCode,
        bonusAmount: bonusCalculation.bonusAmount,
      })
      .from(payment)
      .innerJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .innerJoin(contact, sql`${pledge.contactId} = ${contact.id}`)
      .leftJoin(solicitor, sql`${payment.solicitorId} = ${solicitor.id}`)
      .leftJoin(bonusCalculation, sql`${bonusCalculation.paymentId} = ${payment.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${payment.receivedDate} IS NOT NULL AND ${baseConditions} AND ${paymentDateConditions}`)
      .orderBy(desc(payment.receivedDate), desc(payment.id));

    // Outstanding balances by pledge
    const outstandingBalances = await db
      .select({
        pledgeId: pledge.id,
        pledgeDate: pledge.pledgeDate,
        contactName: contact.displayName,
        description: pledge.description,
        originalAmount: pledge.originalAmount,
        currency: pledge.currency,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payment.paymentDate} <= ${endDateParam} THEN ${payment.amountUsd} ELSE 0 END), 0)`,
        balance: sql<number>`${pledge.originalAmountUsd} - COALESCE(SUM(CASE WHEN ${payment.paymentDate} <= ${endDateParam} THEN ${payment.amountUsd} ELSE 0 END), 0)`,
        originalAmountUsd: pledge.originalAmountUsd,
        totalPaidUsd: sql<number>`COALESCE(SUM(CASE WHEN ${payment.paymentDate} <= ${endDateParam} THEN ${payment.amountUsd} ELSE 0 END), 0)`,
        balanceUsd: sql<number>`${pledge.originalAmountUsd} - COALESCE(SUM(CASE WHEN ${payment.paymentDate} <= ${endDateParam} THEN ${payment.amountUsd} ELSE 0 END), 0)`,
      })
      .from(pledge)
      .innerJoin(contact, sql`${pledge.contactId} = ${contact.id}`)
      .leftJoin(payment, sql`${payment.pledgeId} = ${pledge.id} AND ${payment.paymentStatus} = 'completed'`)
      .where(sql`${pledge.isActive} = true AND ${baseConditions}`)
      .groupBy(pledge.id, pledge.pledgeDate, contact.displayName, pledge.description, pledge.originalAmount, pledge.currency, pledge.originalAmountUsd)
      .having(sql`${pledge.originalAmountUsd} - COALESCE(SUM(CASE WHEN ${payment.paymentDate} <= ${endDateParam} THEN ${payment.amountUsd} ELSE 0 END), 0) > 0`)
      .orderBy(desc(pledge.pledgeDate), desc(pledge.id));

    // Determine grouping: by day if range < 60 days, else by month
    const isShortRange = startDate && endDate ? (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) < 60 : false;
    const groupByExpr = isShortRange ? sql`DATE_TRUNC('day', ${payment.paymentDate})` : sql`DATE_TRUNC('month', ${payment.paymentDate})`;
    const periodExpr = isShortRange ? sql`TO_CHAR(DATE_TRUNC('day', ${payment.paymentDate}), 'YYYY-MM-DD')` : sql`TO_CHAR(DATE_TRUNC('month', ${payment.paymentDate}), 'YYYY-MM')`;

    // Payment summary by period (month or day)
    const monthlyPayments = await db
      .select({
        period: periodExpr,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(*)`,
      })
      .from(payment)
      .innerJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${baseConditions} AND ${paymentDateConditions}`)
      .groupBy(groupByExpr)
      .orderBy(asc(groupByExpr));

    // Total owed vs paid summary
    const summary = await db
      .select({
        totalOwed: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payment.paymentDate} <= ${endDateParam} THEN ${payment.amountUsd} ELSE 0 END), 0)`,
        totalBalance: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0) - COALESCE(SUM(CASE WHEN ${payment.paymentDate} <= ${endDateParam} THEN ${payment.amountUsd} ELSE 0 END), 0)`,
        totalPledges: sql<number>`COUNT(DISTINCT ${pledge.id})`,
        totalContacts: sql<number>`COUNT(DISTINCT ${pledge.contactId})`,
      })
      .from(pledge)
      .leftJoin(payment, sql`${payment.pledgeId} = ${pledge.id} AND ${payment.paymentStatus} = 'completed'`)
      .where(sql`${pledge.isActive} = true AND ${baseConditions}`);

    return NextResponse.json({
      summary: summary[0] || {
        totalOwed: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalPledges: 0,
        totalContacts: 0,
      },
      paymentBreakdown,
      outstandingBalances,
      monthlyPayments,
    });
  } catch (error) {
    console.error("Error fetching statements data:", error);
    return NextResponse.json(
      { error: "Failed to fetch statements data" },
      { status: 500 }
    );
  }
}
