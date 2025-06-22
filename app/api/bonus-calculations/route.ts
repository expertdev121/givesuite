import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import {
  bonusCalculation,
  contact,
  solicitor,
  payment,
  bonusRule,
} from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const solicitorId = searchParams.get("solicitorId");
    const isPaid = searchParams.get("isPaid");

    // eslint-disable-next-line prefer-const
    let whereConditions = [];

    if (solicitorId) {
      whereConditions.push(
        eq(bonusCalculation.solicitorId, parseInt(solicitorId))
      );
    }

    if (isPaid !== null) {
      whereConditions.push(eq(bonusCalculation.isPaid, isPaid === "true"));
    }

    const calculations = await db
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
        notes: bonusCalculation.notes,
        // Solicitor info
        solicitorFirstName: contact.firstName,
        solicitorLastName: contact.lastName,
        solicitorCode: solicitor.solicitorCode,
        // Payment info
        paymentDate: payment.paymentDate,
        paymentReference: payment.referenceNumber,
        // Bonus rule info
        ruleName: bonusRule.ruleName,
      })
      .from(bonusCalculation)
      .innerJoin(solicitor, eq(bonusCalculation.solicitorId, solicitor.id))
      .innerJoin(contact, eq(solicitor.contactId, contact.id))
      .innerJoin(payment, eq(bonusCalculation.paymentId, payment.id))
      .leftJoin(bonusRule, eq(bonusCalculation.bonusRuleId, bonusRule.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(bonusCalculation.calculatedAt));

    return NextResponse.json({ bonusCalculations: calculations });
  } catch (error) {
    console.error("Error fetching bonus calculations:", error);
    return NextResponse.json(
      { error: "Failed to fetch bonus calculations" },
      { status: 500 }
    );
  }
}
