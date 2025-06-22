import { db } from "@/lib/db";
import { bonusCalculation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const calculationId = parseInt(id, 10);
  try {
    const updatedCalculation = await db
      .update(bonusCalculation)
      .set({
        isPaid: true,
        paidAt: new Date(),
      })
      .where(eq(bonusCalculation.id, calculationId))
      .returning();

    if (updatedCalculation.length === 0) {
      return NextResponse.json(
        { error: "Bonus calculation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ bonusCalculation: updatedCalculation[0] });
  } catch (error) {
    console.error("Error marking bonus as paid:", error);
    return NextResponse.json(
      { error: "Failed to mark bonus as paid" },
      { status: 500 }
    );
  }
}
