import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { category } from "@/lib/db/schema";

export async function GET() {
  try {
    const categories = await db.select().from(category);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
