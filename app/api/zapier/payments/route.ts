import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payment } from "@/lib/db/schema";

export async function GET() {
  try {
    const payments = await db.select().from(payment);
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
