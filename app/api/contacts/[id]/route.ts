import { db } from "@/lib/db";
import { contact, pledge, contactRoles, studentRoles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contactId = parseInt(id, 10);
  if (isNaN(contactId) || contactId <= 0) {
    return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = (page - 1) * limit;

  try {
    const [contactData] = await db
      .select({
        contact: contact,
        contactRoles: sql<unknown[]>`COALESCE(
          (SELECT ARRAY_AGG(row_to_json(${contactRoles}))
           FROM ${contactRoles}
           WHERE ${contactRoles.contactId} = ${contact.id}
           LIMIT ${limit} OFFSET ${offset}),
          '{}'
        )`.as("contactRoles"),
        studentRoles: sql<unknown[]>`COALESCE(
          (SELECT ARRAY_AGG(row_to_json(${studentRoles}))
           FROM ${studentRoles}
           WHERE ${studentRoles.contactId} = ${contact.id}
           LIMIT ${limit} OFFSET ${offset}),
          '{}'
        )`.as("studentRoles"),
      })
      .from(contact)
      .where(eq(contact.id, contactId))
      .limit(1);

    if (!contactData) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const [financialSummary] = await db
      .select({
        totalPledgedUsd: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0)`,
        totalPaidUsd: sql<number>`COALESCE(SUM(${pledge.totalPaidUsd}), 0)`,
        currentBalanceUsd: sql<number>`COALESCE(SUM(${pledge.balanceUsd}), 0)`,
      })
      .from(pledge)
      .where(eq(pledge.contactId, contactId));

    const [roleCounts] = await db
      .select({
        totalContactRoles: sql<number>`COUNT(*)`.as("totalContactRoles"),
        totalStudentRoles: sql<number>`COUNT(*)`.as("totalStudentRoles"),
      })
      .from(contactRoles)
      .where(eq(contactRoles.contactId, contactId))
      .fullJoin(studentRoles, eq(studentRoles.contactId, contactId));

    const responseData = {
      contact: {
        ...contactData.contact,
        contactRoles: contactData.contactRoles,
        studentRoles: contactData.studentRoles,
      },
      financialSummary: financialSummary || {
        totalPledgedUsd: 0,
        totalPaidUsd: 0,
        currentBalanceUsd: 0,
      },
      pagination: {
        page,
        limit,
        totalContactRoles: roleCounts?.totalContactRoles || 0,
        totalStudentRoles: roleCounts?.totalStudentRoles || 0,
      },
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("Failed to fetch contact", {
      contactId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}
