import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc } from "drizzle-orm";
import { payment, contact, pledge, paymentAllocations } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    // Donor contributions: aggregate payments by donor
    const donorContributions = await db
      .select({
        contactId: contact.id,
        contactName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        email: contact.email,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
        averageAmount: sql<number>`COALESCE(AVG(${payment.amountUsd}), 0)`,
        firstPaymentDate: sql<string>`MIN(${payment.paymentDate})`,
        lastPaymentDate: sql<string>`MAX(${payment.paymentDate})`,
        currency: sql<string>`COALESCE(MIN(${payment.currency}), 'USD')`,
      })
      .from(contact)
      .leftJoin(pledge, sql`${contact.id} = ${pledge.contactId}`)
      .leftJoin(payment, sql`${pledge.id} = ${payment.pledgeId}`)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL`)
      .groupBy(contact.id, contact.firstName, contact.lastName, contact.email)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`))
      .limit(100);

    // Summary statistics
    const summary = await db
      .select({
        totalDonors: sql<number>`COUNT(DISTINCT ${contact.id})`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        averageDonation: sql<number>`COALESCE(AVG(${payment.amountUsd}), 0)`,
        maxDonation: sql<number>`COALESCE(MAX(${payment.amountUsd}), 0)`,
      })
      .from(contact)
      .leftJoin(pledge, sql`${contact.id} = ${pledge.contactId}`)
      .leftJoin(payment, sql`${pledge.id} = ${payment.pledgeId}`)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL`);

    return NextResponse.json({
      donorContributions,
      summary: summary[0] || {
        totalDonors: 0,
        totalAmount: 0,
        averageDonation: 0,
        maxDonation: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching donor contributions:", error);
    return NextResponse.json(
      { error: "Failed to fetch donor contributions" },
      { status: 500 }
    );
  }
}
