import { db } from "@/lib/db";
import { bonusCalculation } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { calculationIds } = body;

    if (!Array.isArray(calculationIds) || calculationIds.length === 0) {
      return NextResponse.json(
        { error: "Calculation IDs array is required" },
        { status: 400 }
      );
    }

    const updatedCalculations = await db
      .update(bonusCalculation)
      .set({
        isPaid: true,
        paidAt: new Date(),
      })
      .where(sql`${bonusCalculation.id} = ANY(${calculationIds})`)
      .returning();

    return NextResponse.json({
      bonusCalculations: updatedCalculations,
      count: updatedCalculations.length,
    });
  } catch (error) {
    console.error("Error bulk marking bonuses as paid:", error);
    return NextResponse.json(
      { error: "Failed to bulk mark bonuses as paid" },
      { status: 500 }
    );
  }
}
