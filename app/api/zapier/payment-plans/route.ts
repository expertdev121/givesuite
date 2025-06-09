import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlan } from "@/lib/db/schema";

export async function GET() {
  try {
    const plans = await db.select().from(paymentPlan);
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching payment plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment plans" },
      { status: 500 }
    );
  }
}
