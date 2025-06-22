/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { solicitor, contact, payment, bonusCalculation } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build where conditions array
    const whereConditions = [];

    if (status && status !== "all") {
      whereConditions.push(eq(solicitor.status, status as any));
    }

    if (search) {
      whereConditions.push(
        sql`(
          LOWER(${contact.firstName}) LIKE LOWER(${"%" + search + "%"}) OR
          LOWER(${contact.lastName}) LIKE LOWER(${"%" + search + "%"}) OR
          LOWER(${contact.email}) LIKE LOWER(${"%" + search + "%"}) OR
          LOWER(${solicitor.solicitorCode}) LIKE LOWER(${"%" + search + "%"})
        )`
      );
    }

    // Build the complete query with where conditions applied before groupBy
    const query = db
      .select({
        id: solicitor.id,
        contactId: solicitor.contactId,
        solicitorCode: solicitor.solicitorCode,
        status: solicitor.status,
        commissionRate: solicitor.commissionRate,
        hireDate: solicitor.hireDate,
        terminationDate: solicitor.terminationDate,
        notes: solicitor.notes,
        // Contact info
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        // Performance metrics (calculated)
        totalRaised: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentsCount: sql<number>`COUNT(${payment.id})`,
        bonusEarned: sql<number>`COALESCE(SUM(${bonusCalculation.bonusAmount}), 0)`,
        lastActivity: sql<string>`MAX(${payment.paymentDate})`,
      })
      .from(solicitor)
      .innerJoin(contact, eq(solicitor.contactId, contact.id))
      .leftJoin(payment, eq(payment.solicitorId, solicitor.id))
      .leftJoin(
        bonusCalculation,
        eq(bonusCalculation.solicitorId, solicitor.id)
      )
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(
        solicitor.id,
        solicitor.contactId,
        solicitor.solicitorCode,
        solicitor.status,
        solicitor.commissionRate,
        solicitor.hireDate,
        solicitor.terminationDate,
        solicitor.notes,
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone
      )
      .orderBy(desc(solicitor.id));

    const solicitors = await query;

    return NextResponse.json({ solicitors });
  } catch (error) {
    console.error("Error fetching solicitors:", error);
    return NextResponse.json(
      { error: "Failed to fetch solicitors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contactId,
      solicitorCode,
      status = "active",
      commissionRate,
      hireDate,
      notes,
    } = body;

    // Validate required fields
    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    // Check if contact exists
    const existingContact = await db
      .select()
      .from(contact)
      .where(eq(contact.id, contactId))
      .limit(1);

    if (existingContact.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Check if solicitor already exists for this contact
    const existingSolicitor = await db
      .select()
      .from(solicitor)
      .where(eq(solicitor.contactId, contactId))
      .limit(1);

    if (existingSolicitor.length > 0) {
      return NextResponse.json(
        { error: "Solicitor already exists for this contact" },
        { status: 409 }
      );
    }

    const newSolicitor = await db
      .insert(solicitor)
      .values({
        contactId,
        solicitorCode,
        status,
        commissionRate,
        hireDate,
        notes,
      })
      .returning();

    return NextResponse.json({ solicitor: newSolicitor[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating solicitor:", error);
    return NextResponse.json(
      { error: "Failed to create solicitor" },
      { status: 500 }
    );
  }
}
