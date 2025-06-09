import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentRoles } from "@/lib/db/schema";

export async function GET() {
  try {
    const roles = await db.select().from(studentRoles);
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching student roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch student roles" },
      { status: 500 }
    );
  }
}
