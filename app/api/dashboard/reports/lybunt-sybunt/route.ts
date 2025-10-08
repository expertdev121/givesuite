import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc, and, gte, lt, eq } from "drizzle-orm";
import { payment, contact, pledge, paymentAllocations } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const currentYear = new Date().getFullYear();

    // LYBUNT: Donors who gave last year but not this year
    const lybuntQuery = db
      .select({
        contactId: contact.id,
        contactName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        email: contact.email,
        lastYearTotal: sql<number>`COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM ${payment.paymentDate}) = ${currentYear - 1} THEN ${payment.amountUsd} ELSE 0 END), 0)`,
        thisYearTotal: sql<number>`COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM ${payment.paymentDate}) = ${currentYear} THEN ${payment.amountUsd} ELSE 0 END), 0)`,
        lastPaymentDate: sql<string>`MAX(${payment.paymentDate})`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
      })
      .from(contact)
      .leftJoin(pledge, sql`${contact.id} = ${pledge.contactId}`)
      .leftJoin(payment, sql`${pledge.id} = ${payment.pledgeId}`)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.pledgeId} = ${pledge.id}`)
      .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL`)
      .groupBy(contact.id, contact.firstName, contact.lastName, contact.email)
      .having(sql`COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM ${payment.paymentDate}) = ${currentYear - 1} THEN ${payment.amountUsd} ELSE 0 END), 0) > 0
                 AND COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM ${payment.paymentDate}) = ${currentYear} THEN ${payment.amountUsd} ELSE 0 END), 0) = 0`)
      .orderBy(desc(sql`COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM ${payment.paymentDate}) = ${currentYear - 1} THEN ${payment.amountUsd} ELSE 0 END), 0)`));

    // SYBUNT: Donors who gave in the past but not this year
    const sybuntQuery = db
      .select({
        contactId: contact.id,
        contactName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        email: contact.email,
        totalGiven: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        lastPaymentDate: sql<string>`MAX(${payment.paymentDate})`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
        yearsActive: sql<number>`COUNT(DISTINCT EXTRACT(YEAR FROM ${payment.paymentDate}))`,
      })
      .from(contact)
      .leftJoin(pledge, sql`${contact.id} = ${pledge.contactId}`)
      .leftJoin(payment, sql`${pledge.id} = ${payment.pledgeId}`)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.pledgeId} = ${pledge.id}`)
      .where(sql`(${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL)
                AND EXTRACT(YEAR FROM ${payment.paymentDate}) < ${currentYear}`)
      .groupBy(contact.id, contact.firstName, contact.lastName, contact.email)
      .having(sql`COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM ${payment.paymentDate}) = ${currentYear} THEN ${payment.amountUsd} ELSE 0 END), 0) = 0`)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

    const [lybuntResults, sybuntResults] = await Promise.all([
      lybuntQuery,
      sybuntQuery
    ]);

    // Summary statistics
    const lybuntSummary = {
      totalDonors: lybuntResults.length,
      totalAmount: lybuntResults.reduce((sum, donor) => sum + (Number(donor.lastYearTotal) || 0), 0),
      averageAmount: lybuntResults.length > 0 ? lybuntResults.reduce((sum, donor) => sum + (Number(donor.lastYearTotal) || 0), 0) / lybuntResults.length : 0,
    };

    const sybuntSummary = {
      totalDonors: sybuntResults.length,
      totalAmount: sybuntResults.reduce((sum, donor) => sum + (Number(donor.totalGiven) || 0), 0),
      averageAmount: sybuntResults.length > 0 ? sybuntResults.reduce((sum, donor) => sum + (Number(donor.totalGiven) || 0), 0) / sybuntResults.length : 0,
    };

    return NextResponse.json({
      lybunt: {
        donors: lybuntResults,
        summary: lybuntSummary,
      },
      sybunt: {
        donors: sybuntResults,
        summary: sybuntSummary,
      },
    });
  } catch (error) {
    console.error("Error fetching LYBUNT/SYBUNT data:", error);
    return NextResponse.json(
      { error: "Failed to fetch LYBUNT/SYBUNT data" },
      { status: 500 }
    );
  }
}
