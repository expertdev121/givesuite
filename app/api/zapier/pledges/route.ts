import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pledge } from "@/lib/db/schema";

export async function GET() {
  try {
    const pledges = await db.select().from(pledge);
    return NextResponse.json(pledges);
  } catch (error) {
    console.error("Error fetching pledges:", error);
    return NextResponse.json(
      { error: "Failed to fetch pledges" },
      { status: 500 }
    );
  }
}
