import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  payment,
  pledge,
  paymentPlan,
  installmentSchedule,
  contact,
  paymentAllocations
} from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const contactId = searchParams.get('contactId');

    // Fetch all payments with related data
    const paymentsData = await db
      .select({
        paymentId: payment.id,
        paymentDate: payment.paymentDate,
        amount: payment.amountUsd,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        isThirdParty: payment.isThirdPartyPayment,
        contactName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        pledgeAmount: pledge.originalAmountUsd,
        pledgeBalance: pledge.balanceUsd,
      })
      .from(payment)
      .innerJoin(pledge, sql`${payment.pledgeId} = ${pledge.id}`)
      .innerJoin(contact, sql`${pledge.contactId} = ${contact.id}`)
      .where(contactId ? sql`${contact.id} = ${contactId}` : sql`true`)
      .orderBy(payment.paymentDate);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Payment ID',
        'Payment Date',
        'Contact Name',
        'Amount (USD)',
        'Currency',
        'Payment Method',
        'Status',
        'Third Party',
        'Pledge Amount',
        'Pledge Balance'
      ];

      const csvContent = [
        headers.join(','),
        ...paymentsData.map(row => [
          row.paymentId,
          row.paymentDate,
          `"${row.contactName}"`,
          row.amount,
          row.currency,
          row.paymentMethod,
          row.paymentStatus,
          row.isThirdParty ? 'Yes' : 'No',
          row.pledgeAmount,
          row.pledgeBalance
        ].join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'pdf') {
      // For PDF, we'll return JSON for now - in a real app you'd use a PDF library
      return NextResponse.json({
        message: 'PDF export not implemented yet',
        data: paymentsData
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error("Error exporting dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to export dashboard data" },
      { status: 500 }
    );
  }
}
