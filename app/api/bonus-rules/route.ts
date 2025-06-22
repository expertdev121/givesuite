// app/api/bonus-rules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { bonusRule, contact, solicitor } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const solicitorId = searchParams.get("solicitorId");
    const whereConditions = [];

    if (solicitorId) {
      whereConditions.push(eq(bonusRule.solicitorId, parseInt(solicitorId)));
    }
    const query = db
      .select({
        id: bonusRule.id,
        solicitorId: bonusRule.solicitorId,
        ruleName: bonusRule.ruleName,
        bonusPercentage: bonusRule.bonusPercentage,
        paymentType: bonusRule.paymentType,
        minAmount: bonusRule.minAmount,
        maxAmount: bonusRule.maxAmount,
        effectiveFrom: bonusRule.effectiveFrom,
        effectiveTo: bonusRule.effectiveTo,
        isActive: bonusRule.isActive,
        priority: bonusRule.priority,
        notes: bonusRule.notes,
        // Solicitor info
        solicitorFirstName: contact.firstName,
        solicitorLastName: contact.lastName,
        solicitorCode: solicitor.solicitorCode,
      })
      .from(bonusRule)
      .innerJoin(solicitor, eq(bonusRule.solicitorId, solicitor.id))
      .innerJoin(contact, eq(solicitor.contactId, contact.id))
      .where(whereConditions.length > 0 ? whereConditions[0] : undefined)
      .orderBy(desc(bonusRule.priority), desc(bonusRule.id));

    const rules = await query;

    return NextResponse.json({ bonusRules: rules });
  } catch (error) {
    console.error("Error fetching bonus rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch bonus rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      solicitorId,
      ruleName,
      bonusPercentage,
      paymentType = "both",
      minAmount,
      maxAmount,
      effectiveFrom,
      effectiveTo,
      isActive = true,
      priority = 1,
      notes,
    } = body;

    // Validate required fields
    if (!solicitorId || !ruleName || !bonusPercentage || !effectiveFrom) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if solicitor exists
    const existingSolicitor = await db
      .select()
      .from(solicitor)
      .where(eq(solicitor.id, solicitorId))
      .limit(1);

    if (existingSolicitor.length === 0) {
      return NextResponse.json(
        { error: "Solicitor not found" },
        { status: 404 }
      );
    }

    const newRule = await db
      .insert(bonusRule)
      .values({
        solicitorId,
        ruleName,
        bonusPercentage,
        paymentType,
        minAmount,
        maxAmount,
        effectiveFrom,
        effectiveTo,
        isActive,
        priority,
        notes,
      })
      .returning();

    return NextResponse.json({ bonusRule: newRule[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating bonus rule:", error);
    return NextResponse.json(
      { error: "Failed to create bonus rule" },
      { status: 500 }
    );
  }
}
