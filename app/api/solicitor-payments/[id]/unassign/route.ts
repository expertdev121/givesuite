import { db } from "@/lib/db";
import { bonusCalculation, payment } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const paymentId = parseInt(id, 10);
  try {
    // Remove bonus calculation if exists
    await db
      .delete(bonusCalculation)
      .where(eq(bonusCalculation.paymentId, paymentId));

    // Update payment to remove solicitor assignment
    const updatedPayment = await db
      .update(payment)
      .set({
        solicitorId: null,
        bonusPercentage: null,
        bonusAmount: null,
        bonusRuleId: null,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentId))
      .returning();

    if (updatedPayment.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ payment: updatedPayment[0] });
  } catch (error) {
    console.error("Error unassigning payment:", error);
    return NextResponse.json(
      { error: "Failed to unassign payment" },
      { status: 500 }
    );
  }
}
