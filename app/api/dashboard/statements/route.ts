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

    // Base query conditions
    const baseConditions = contactId && contactId !== "all"
      ? sql`${pledge.contactId} = ${contactId}`
      : sql`1=1`;

    // Detailed payment breakdown
    const paymentBreakdown = await db
      .select({
        id: payment.id,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        contactName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        pledgeDescription: pledge.description,
        solicitorCode: solicitor.solicitorCode,
        bonusAmount: bonusCalculation.bonusAmount,
      })
      .from(payment)
      .innerJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .innerJoin(contact, sql`${pledge.contactId} = ${contact.id}`)
      .leftJoin(solicitor, sql`${payment.solicitorId} = ${solicitor.id}`)
      .leftJoin(bonusCalculation, sql`${bonusCalculation.paymentId} = ${payment.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${baseConditions}`)
      .orderBy(desc(payment.paymentDate));

    // Outstanding balances by pledge
    const outstandingBalances = await db
      .select({
        pledgeId: pledge.id,
        contactName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        description: pledge.description,
        originalAmount: pledge.originalAmount,
        currency: pledge.currency,
        totalPaid: pledge.totalPaid,
        balance: pledge.balance,
        originalAmountUsd: pledge.originalAmountUsd,
        totalPaidUsd: pledge.totalPaidUsd,
        balanceUsd: pledge.balanceUsd,
      })
      .from(pledge)
      .innerJoin(contact, sql`${pledge.contactId} = ${contact.id}`)
      .where(sql`${pledge.isActive} = true AND ${pledge.balance} > 0 AND ${baseConditions}`)
      .orderBy(desc(pledge.balanceUsd));

    // Payment summary by month
    const monthlyPayments = await db
      .select({
        month: sql<string>`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(*)`,
      })
      .from(payment)
      .innerJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${baseConditions}`)
      .groupBy(sql`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`)
      .orderBy(asc(sql`TO_CHAR(${payment.paymentDate}, 'YYYY-MM')`));

    // Total owed vs paid summary
    const summary = await db
      .select({
        totalOwed: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(${pledge.totalPaidUsd}), 0)`,
        totalBalance: sql<number>`COALESCE(SUM(${pledge.balanceUsd}), 0)`,
        totalPledges: sql<number>`COUNT(DISTINCT ${pledge.id})`,
        totalContacts: sql<number>`COUNT(DISTINCT ${pledge.contactId})`,
      })
      .from(pledge)
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
