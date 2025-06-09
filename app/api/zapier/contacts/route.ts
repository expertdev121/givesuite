import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contact } from "@/lib/db/schema";

export async function GET() {
  try {
    const contacts = await db.select().from(contact);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}
