import { db } from "@/lib/db";
import {
  payment,
  category,
  pledge,
  bonusRule,
  bonusCalculation,
} from "@/lib/db/schema";
import { eq, and, lte, sql, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const paymentDetails = await db
      .select({
        id: payment.id,
        solicitorId: payment.solicitorId,
        amountUsd: payment.amountUsd,
        paymentDate: payment.paymentDate,
        categoryName: category.name,
      })
      .from(payment)
      .innerJoin(pledge, eq(payment.pledgeId, pledge.id))
      .leftJoin(category, eq(pledge.categoryId, category.id))
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (paymentDetails.length === 0 || !paymentDetails[0].solicitorId) {
      return NextResponse.json(
        { error: "Payment not found or not assigned to solicitor" },
        { status: 404 }
      );
    }

    const paymentInfo = paymentDetails[0];

    const solicitorId = paymentInfo.solicitorId as number;

    const paymentAmount = parseFloat(paymentInfo.amountUsd || "0");
    const isDonation = paymentInfo.categoryName
      ?.toLowerCase()
      .includes("donation");

    const applicableRules = await db
      .select()
      .from(bonusRule)
      .where(
        and(
          eq(bonusRule.solicitorId, solicitorId), // Now guaranteed to be a number
          eq(bonusRule.isActive, true),
          lte(bonusRule.effectiveFrom, paymentInfo.paymentDate),
          sql`(${bonusRule.effectiveTo} IS NULL OR ${bonusRule.effectiveTo} >= ${paymentInfo.paymentDate})`,
          sql`(${bonusRule.paymentType} = 'both' OR 
                 (${bonusRule.paymentType} = 'donation' AND ${isDonation}) OR
                 (${bonusRule.paymentType} = 'tuition' AND NOT ${isDonation}))`,
          sql`(${bonusRule.minAmount} IS NULL OR ${bonusRule.minAmount} <= ${paymentAmount})`,
          sql`(${bonusRule.maxAmount} IS NULL OR ${bonusRule.maxAmount} >= ${paymentAmount})`
        )
      )
      .orderBy(desc(bonusRule.priority));

    let bonusPercentage = "0";
    let bonusAmount = "0";
    let bonusRuleId = null;

    if (applicableRules.length > 0) {
      const rule = applicableRules[0];
      bonusPercentage = rule.bonusPercentage || "0";
      bonusAmount = (
        (paymentAmount * parseFloat(bonusPercentage)) /
        100
      ).toFixed(2);
      bonusRuleId = rule.id;
    }

    await db
      .update(payment)
      .set({
        bonusPercentage,
        bonusAmount,
        bonusRuleId,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentId));

    // Delete existing bonus calculation
    await db
      .delete(bonusCalculation)
      .where(eq(bonusCalculation.paymentId, paymentId));

    // Create new bonus calculation if there's a bonus
    let newCalculation = null;
    if (parseFloat(bonusAmount) > 0) {
      const result = await db
        .insert(bonusCalculation)
        .values({
          paymentId,
          solicitorId, // Use the type-asserted solicitorId
          bonusRuleId,
          paymentAmount: paymentAmount.toString(),
          bonusPercentage,
          bonusAmount,
          calculatedAt: new Date(),
          isPaid: false,
          notes: `Recalculated using rule: ${applicableRules[0]?.ruleName}`,
        })
        .returning();

      newCalculation = result[0];
    }

    return NextResponse.json({
      bonusCalculation: newCalculation,
      recalculated: true,
      bonusAmount: parseFloat(bonusAmount),
    });
  } catch (error) {
    console.error("Error recalculating bonus:", error);
    return NextResponse.json(
      { error: "Failed to recalculate bonus" },
      { status: 500 }
    );
  }
}
