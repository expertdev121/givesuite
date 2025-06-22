import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, desc, isNull, isNotNull, and } from "drizzle-orm";
import { payment, contact, pledge, category, solicitor } from "@/lib/db/schema";
import { alias } from "drizzle-orm/pg-core";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assigned = searchParams.get("assigned");
    const solicitorId = searchParams.get("solicitorId");
    const whereConditions = [];

    if (assigned === "true") {
      whereConditions.push(isNotNull(payment.solicitorId));
    } else if (assigned === "false") {
      whereConditions.push(isNull(payment.solicitorId));
    }

    if (solicitorId) {
      whereConditions.push(eq(payment.solicitorId, parseInt(solicitorId)));
    }
    const solicitorContact = alias(contact, "s_contact");
    const payments = await db
      .select({
        id: payment.id,
        amount: payment.amount,
        amountUsd: payment.amountUsd,
        currency: payment.currency,
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        referenceNumber: payment.referenceNumber,
        solicitorId: payment.solicitorId,
        bonusPercentage: payment.bonusPercentage,
        bonusAmount: payment.bonusAmount,
        bonusRuleId: payment.bonusRuleId,
        notes: payment.notes,

        contactFirstName: contact.firstName,
        contactLastName: contact.lastName,
        contactEmail: contact.email,
        pledgeDescription: pledge.description,
        categoryName: category.name,
        solicitorFirstName: solicitorContact.firstName,
        solicitorLastName: solicitorContact.lastName,
        solicitorCode: solicitor.solicitorCode,
      })
      .from(payment)
      .innerJoin(pledge, eq(payment.pledgeId, pledge.id))
      .innerJoin(contact, eq(pledge.contactId, contact.id))
      .leftJoin(category, eq(pledge.categoryId, category.id))
      .leftJoin(solicitor, eq(payment.solicitorId, solicitor.id))
      .leftJoin(solicitorContact, eq(solicitor.contactId, solicitorContact.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(payment.paymentDate));

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
