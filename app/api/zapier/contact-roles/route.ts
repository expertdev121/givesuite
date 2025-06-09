import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactRoles } from "@/lib/db/schema";

export async function GET() {
  try {
    const roles = await db.select().from(contactRoles);
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching contact roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact roles" },
      { status: 500 }
    );
  }
}
