import { db } from "@/lib/db";
import { bonusRule } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ruleId = parseInt(id, 10);
  try {
    const body = await request.json();
    const updatedRule = await db
      .update(bonusRule)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(bonusRule.id, ruleId))
      .returning();

    if (updatedRule.length === 0) {
      return NextResponse.json(
        { error: "Bonus rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ bonusRule: updatedRule[0] });
  } catch (error) {
    console.error("Error updating bonus rule:", error);
    return NextResponse.json(
      { error: "Failed to update bonus rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ruleId = parseInt(id, 10);
  try {
    const deletedRule = await db
      .delete(bonusRule)
      .where(eq(bonusRule.id, ruleId))
      .returning();

    if (deletedRule.length === 0) {
      return NextResponse.json(
        { error: "Bonus rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Bonus rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting bonus rule:", error);
    return NextResponse.json(
      { error: "Failed to delete bonus rule" },
      { status: 500 }
    );
  }
}
