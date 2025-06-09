import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { relationships } from "@/lib/db/schema";

export async function GET() {
  try {
    const relationshipData = await db.select().from(relationships);
    return NextResponse.json(relationshipData);
  } catch (error) {
    console.error("Error fetching relationships:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationships" },
      { status: 500 }
    );
  }
}
