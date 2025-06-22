import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { solicitor, payment, bonusCalculation } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  console.log(request);
  try {
    const solicitorStats = await db
      .select({
        status: solicitor.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(solicitor)
      .groupBy(solicitor.status);

    const paymentStats = await db
      .select({
        assigned: sql<number>`COUNT(*) FILTER (WHERE ${payment.solicitorId} IS NOT NULL)`,
        unassigned: sql<number>`COUNT(*) FILTER (WHERE ${payment.solicitorId} IS NULL)`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        assignedAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}) FILTER (WHERE ${payment.solicitorId} IS NOT NULL), 0)`,
      })
      .from(payment);

    const bonusStats = await db
      .select({
        totalBonuses: sql<number>`COALESCE(SUM(${bonusCalculation.bonusAmount}), 0)`,
        paidBonuses: sql<number>`COALESCE(SUM(${bonusCalculation.bonusAmount}) FILTER (WHERE ${bonusCalculation.isPaid} = true), 0)`,
        unpaidBonuses: sql<number>`COALESCE(SUM(${bonusCalculation.bonusAmount}) FILTER (WHERE ${bonusCalculation.isPaid} = false), 0)`,
        totalCalculations: sql<number>`COUNT(*)`,
        unpaidCalculations: sql<number>`COUNT(*) FILTER (WHERE ${bonusCalculation.isPaid} = false)`,
      })
      .from(bonusCalculation);

    const activeSolicitors =
      solicitorStats.find((s) => s.status === "active")?.count || 0;
    const totalSolicitors = solicitorStats.reduce((sum, s) => sum + s.count, 0);

    const paymentData = paymentStats[0] || {
      assigned: 0,
      unassigned: 0,
      totalAmount: 0,
      assignedAmount: 0,
    };

    const bonusData = bonusStats[0] || {
      totalBonuses: 0,
      paidBonuses: 0,
      unpaidBonuses: 0,
      totalCalculations: 0,
      unpaidCalculations: 0,
    };

    return NextResponse.json({
      solicitors: {
        active: activeSolicitors,
        total: totalSolicitors,
        breakdown: solicitorStats,
      },
      payments: {
        assigned: paymentData.assigned,
        unassigned: paymentData.unassigned,
        totalAmount: paymentData.totalAmount,
        assignedAmount: paymentData.assignedAmount,
      },
      bonuses: {
        totalAmount: bonusData.totalBonuses,
        paidAmount: bonusData.paidBonuses,
        unpaidAmount: bonusData.unpaidBonuses,
        totalCalculations: bonusData.totalCalculations,
        unpaidCalculations: bonusData.unpaidCalculations,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
