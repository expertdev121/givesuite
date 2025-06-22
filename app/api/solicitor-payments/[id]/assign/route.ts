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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const paymentId = parseInt(id, 10);
  try {
    const body = await request.json();
    const { solicitorId } = body;

    if (!solicitorId) {
      return NextResponse.json(
        { error: "Solicitor ID is required" },
        { status: 400 }
      );
    }

    // Get payment details
    const paymentDetails = await db
      .select({
        id: payment.id,
        amountUsd: payment.amountUsd,
        paymentDate: payment.paymentDate,
        categoryName: category.name,
      })
      .from(payment)
      .innerJoin(pledge, eq(payment.pledgeId, pledge.id))
      .leftJoin(category, eq(pledge.categoryId, category.id))
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (paymentDetails.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paymentInfo = paymentDetails[0];
    const paymentAmount = parseFloat(paymentInfo.amountUsd || "0");
    const paymentDate = paymentInfo.paymentDate;
    const isDonation = paymentInfo.categoryName
      ?.toLowerCase()
      .includes("donation");

    // Find applicable bonus rules
    const applicableRules = await db
      .select()
      .from(bonusRule)
      .where(
        and(
          eq(bonusRule.solicitorId, solicitorId),
          eq(bonusRule.isActive, true),
          lte(bonusRule.effectiveFrom, paymentDate),
          sql`(${bonusRule.effectiveTo} IS NULL OR ${bonusRule.effectiveTo} >= ${paymentDate})`,
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
      const rule = applicableRules[0]; // Highest priority rule
      bonusPercentage = rule.bonusPercentage || "0";
      bonusAmount = (
        (paymentAmount * parseFloat(bonusPercentage)) /
        100
      ).toFixed(2);
      bonusRuleId = rule.id;
    }

    // Update payment with solicitor assignment
    const updatedPayment = await db
      .update(payment)
      .set({
        solicitorId,
        bonusPercentage,
        bonusAmount,
        bonusRuleId,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))
      .returning();

    // Create bonus calculation record
    if (parseFloat(bonusAmount) > 0) {
      await db.insert(bonusCalculation).values({
        paymentId,
        solicitorId,
        bonusRuleId,
        paymentAmount: paymentAmount.toString(),
        bonusPercentage,
        bonusAmount,
        calculatedAt: new Date(),
        isPaid: false,
        notes: `Auto-calculated on assignment using rule: ${applicableRules[0]?.ruleName}`,
      });
    }

    return NextResponse.json({
      payment: updatedPayment[0],
      bonusCalculated: parseFloat(bonusAmount) > 0,
    });
  } catch (error) {
    console.error("Error assigning payment:", error);
    return NextResponse.json(
      { error: "Failed to assign payment" },
      { status: 500 }
    );
  }
}
