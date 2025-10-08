import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, asc } from "drizzle-orm";
import {
  bonusCalculation,
  solicitor,
  contact,
  payment,
  pledge,
  bonusRule
} from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const solicitorId = searchParams.get('solicitorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Base conditions
    let conditions = sql`1=1`;

    if (solicitorId && solicitorId !== "all") {
      conditions = sql`${conditions} AND ${bonusCalculation.solicitorId} = ${solicitorId}`;
    }

    if (startDate) {
      conditions = sql`${conditions} AND ${payment.paymentDate} >= ${startDate}`;
    }

    if (endDate) {
      conditions = sql`${conditions} AND ${payment.paymentDate} <= ${endDate}`;
    }

    // Bonus calculations with details
    const bonusCalculations = await db
      .select({
        id: bonusCalculation.id,
        paymentId: bonusCalculation.paymentId,
        solicitorId: bonusCalculation.solicitorId,
        bonusRuleId: bonusCalculation.bonusRuleId,
        paymentAmount: bonusCalculation.paymentAmount,
        bonusPercentage: bonusCalculation.bonusPercentage,
        bonusAmount: bonusCalculation.bonusAmount,
        calculatedAt: bonusCalculation.calculatedAt,
        isPaid: bonusCalculation.isPaid,
        paidAt: bonusCalculation.paidAt,
        solicitorName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        solicitorCode: solicitor.solicitorCode,
        ruleName: bonusRule.ruleName,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        pledgeDescription: pledge.description,
      })
      .from(bonusCalculation)
      .innerJoin(solicitor, sql`${bonusCalculation.solicitorId} = ${solicitor.id}`)
      .innerJoin(contact, sql`${solicitor.contactId} = ${contact.id}`)
      .innerJoin(payment, sql`${bonusCalculation.paymentId} = ${payment.id}`)
      .leftJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .leftJoin(bonusRule, sql`${bonusCalculation.bonusRuleId} = ${bonusRule.id}`)
      .where(conditions)
      .orderBy(desc(bonusCalculation.calculatedAt));

    // Summary by solicitor
    const solicitorSummary = await db
      .select({
        solicitorId: solicitor.id,
        solicitorName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        solicitorCode: solicitor.solicitorCode,
        totalBonusAmount: sql<number>`COALESCE(SUM(${bonusCalculation.bonusAmount}), 0)`,
        totalPayments: sql<number>`COUNT(${bonusCalculation.id})`,
        paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${bonusCalculation.isPaid} = true THEN ${bonusCalculation.bonusAmount} ELSE 0 END), 0)`,
        unpaidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${bonusCalculation.isPaid} = false THEN ${bonusCalculation.bonusAmount} ELSE 0 END), 0)`,
      })
      .from(solicitor)
      .innerJoin(contact, sql`${solicitor.contactId} = ${contact.id}`)
      .leftJoin(bonusCalculation, sql`${solicitor.id} = ${bonusCalculation.solicitorId}`)
      .leftJoin(payment, sql`${bonusCalculation.paymentId} = ${payment.id}`)
      .where(sql`${solicitorId && solicitorId !== "all" ? sql`${solicitor.id} = ${solicitorId}` : sql`1=1`} AND ${startDate ? sql`${payment.paymentDate} >= ${startDate}` : sql`1=1`} AND ${endDate ? sql`${payment.paymentDate} <= ${endDate}` : sql`1=1`}`)
      .groupBy(solicitor.id, contact.firstName, contact.lastName, solicitor.solicitorCode)
      .orderBy(desc(sql`COALESCE(SUM(${bonusCalculation.bonusAmount}), 0)`));

    // Overall summary
    const overallSummary = await db
      .select({
        totalBonusAmount: sql<number>`COALESCE(SUM(${bonusCalculation.bonusAmount}), 0)`,
        totalCalculations: sql<number>`COUNT(${bonusCalculation.id})`,
        paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${bonusCalculation.isPaid} = true THEN ${bonusCalculation.bonusAmount} ELSE 0 END), 0)`,
        unpaidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${bonusCalculation.isPaid} = false THEN ${bonusCalculation.bonusAmount} ELSE 0 END), 0)`,
        uniqueSolicitors: sql<number>`COUNT(DISTINCT ${bonusCalculation.solicitorId})`,
      })
      .from(bonusCalculation)
      .where(conditions);

    return NextResponse.json({
      bonusCalculations,
      solicitorSummary,
      summary: overallSummary[0] || {
        totalBonusAmount: 0,
        totalCalculations: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        uniqueSolicitors: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching bonus calculations:", error);
    return NextResponse.json(
      { error: "Failed to fetch bonus calculations" },
      { status: 500 }
    );
  }
}
