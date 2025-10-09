import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc } from "drizzle-orm";
import {
  payment,
  pledge,
  paymentPlan,
  installmentSchedule,
  contact,
  paymentAllocations
} from "@/lib/db/schema";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Server-side currency formatter
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const contactId = searchParams.get('contactId');
    const report = searchParams.get('report');

    if (report === 'donor-contributions') {
      // Export donor contributions data
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
        .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

      if (format === 'csv') {
        const headers = [
          'Contact ID',
          'Contact Name',
          'Email',
          'Total Amount (USD)',
          'Payment Count',
          'Average Amount (USD)',
          'First Payment Date',
          'Last Payment Date',
          'Currency'
        ];

        const csvContent = [
          headers.join(','),
          ...donorContributions.map(row => [
            row.contactId,
            `"${row.contactName}"`,
            row.email,
            row.totalAmount,
            row.paymentCount,
            row.averageAmount,
            row.firstPaymentDate,
            row.lastPaymentDate,
            row.currency
          ].join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="donor-contributions-export-${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }
    }

    // Default: Fetch all payments with related data
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
      if (report === 'financial-accounting') {
        // Fetch financial accounting data
        const currentYear = new Date().getFullYear();

        const overallSummary = await db
          .select({
            totalPledged: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0)`,
            totalPaid: sql<number>`COALESCE(SUM(${pledge.totalPaidUsd}), 0)`,
            totalBalance: sql<number>`COALESCE(SUM(${pledge.balanceUsd}), 0)`,
            totalPayments: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
            paymentCount: sql<number>`COUNT(DISTINCT ${payment.id})`,
          })
          .from(pledge)
          .leftJoin(payment, sql`${pledge.id} = ${payment.pledgeId}`)
          .leftJoin(paymentAllocations, sql`${paymentAllocations.pledgeId} = ${pledge.id}`)
          .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL OR ${payment.id} IS NULL`);

        const monthlyData = await db
          .select({
            month: sql<number>`EXTRACT(MONTH FROM ${payment.paymentDate})`,
            year: sql<number>`EXTRACT(YEAR FROM ${payment.paymentDate})`,
            totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
            paymentCount: sql<number>`COUNT(${payment.id})`,
          })
          .from(payment)
          .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
          .where(sql`(${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL) AND EXTRACT(YEAR FROM ${payment.paymentDate}) = ${currentYear}`)
          .groupBy(sql`EXTRACT(YEAR FROM ${payment.paymentDate})`, sql`EXTRACT(MONTH FROM ${payment.paymentDate})`)
          .orderBy(sql`EXTRACT(MONTH FROM ${payment.paymentDate})`);

        const paymentMethodData = await db
          .select({
            method: payment.paymentMethod,
            totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
            paymentCount: sql<number>`COUNT(${payment.id})`,
          })
          .from(payment)
          .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
          .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL`)
          .groupBy(payment.paymentMethod)
          .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

        const currencyData = await db
          .select({
            currency: payment.currency,
            totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
            paymentCount: sql<number>`COUNT(${payment.id})`,
          })
          .from(payment)
          .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
          .where(sql`${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL`)
          .groupBy(payment.currency)
          .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

        const yearlyComparison = await db
          .select({
            year: sql<number>`EXTRACT(YEAR FROM ${payment.paymentDate})`,
            totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
            paymentCount: sql<number>`COUNT(${payment.id})`,
          })
          .from(payment)
          .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
          .where(sql`(${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL) AND EXTRACT(YEAR FROM ${payment.paymentDate}) >= ${currentYear - 2}`)
          .groupBy(sql`EXTRACT(YEAR FROM ${payment.paymentDate})`)
          .orderBy(sql`EXTRACT(YEAR FROM ${payment.paymentDate})`);

        const summary = overallSummary[0] || {
          totalPledged: 0,
          totalPaid: 0,
          totalBalance: 0,
          totalPayments: 0,
          paymentCount: 0,
        };

        // Generate PDF with jsPDF
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text('Financial & Accounting Report', 105, 15, { align: 'center' });
        
        let yPos = 30;
        
        // Summary Section
        doc.setFontSize(16);
        doc.text('Summary', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.text(`Total Pledged: ${formatCurrency(Number(summary.totalPledged))}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Paid: ${formatCurrency(Number(summary.totalPaid))}`, 14, yPos);
        yPos += 7;
        doc.text(`Outstanding Balance: ${formatCurrency(Number(summary.totalBalance))}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Payments: ${formatCurrency(Number(summary.totalPayments))}`, 14, yPos);
        yPos += 7;
        doc.text(`Payment Count: ${summary.paymentCount}`, 14, yPos);
        yPos += 15;

        // Year-over-Year Comparison
        doc.setFontSize(16);
        doc.text('Year-over-Year Comparison', 14, yPos);
        yPos += 7;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Year', 'Total Amount', 'Transactions', 'Avg per Transaction']],
          body: yearlyComparison.map(year => [
            year.year.toString(),
            formatCurrency(Number(year.totalAmount)),
            year.paymentCount.toString(),
            formatCurrency(Number(year.totalAmount / year.paymentCount || 0))
          ]),
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Monthly Trends
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(16);
        doc.text('Monthly Trends', 14, yPos);
        yPos += 7;
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        autoTable(doc, {
          startY: yPos,
          head: [['Month', 'Total Amount', 'Transactions', 'Avg per Transaction']],
          body: monthlyData.map(month => [
            `${monthNames[month.month - 1]} ${month.year}`,
            formatCurrency(Number(month.totalAmount)),
            month.paymentCount.toString(),
            formatCurrency(Number(month.totalAmount / month.paymentCount || 0))
          ]),
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Payment Methods
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(16);
        doc.text('Payment Methods', 14, yPos);
        yPos += 7;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Method', 'Total Amount', 'Transactions', 'Percentage']],
          body: paymentMethodData.map(method => {
            const percentage = summary.totalPayments > 0 ? ((method.totalAmount / summary.totalPayments) * 100).toFixed(1) : '0';
            return [
              method.method,
              formatCurrency(Number(method.totalAmount)),
              method.paymentCount.toString(),
              `${percentage}%`
            ];
          }),
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Currencies
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(16);
        doc.text('Currencies', 14, yPos);
        yPos += 7;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Currency', 'Total Amount', 'Transactions', 'Percentage']],
          body: currencyData.map(currency => {
            const percentage = summary.totalPayments > 0 ? ((currency.totalAmount / summary.totalPayments) * 100).toFixed(1) : '0';
            return [
              currency.currency,
              formatCurrency(Number(currency.totalAmount)),
              currency.paymentCount.toString(),
              `${percentage}%`
            ];
          }),
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] }
        });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="financial-accounting-report-${new Date().toISOString().split('T')[0]}.pdf"`
          }
        });
      } else if (report === 'donor-contributions') {
        // Generate PDF for donor contributions
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
          .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

        const doc = new jsPDF('landscape');
        
        doc.setFontSize(20);
        doc.text('Donor Contributions Report', 148, 15, { align: 'center' });
        
        autoTable(doc, {
          startY: 25,
          head: [['Contact Name', 'Email', 'Total Amount', 'Payment Count', 'Average Amount', 'First Payment', 'Last Payment', 'Currency']],
          body: donorContributions.map(donor => [
            donor.contactName,
            donor.email,
            formatCurrency(Number(donor.totalAmount)),
            donor.paymentCount.toString(),
            formatCurrency(Number(donor.averageAmount)),
            donor.firstPaymentDate || 'N/A',
            donor.lastPaymentDate || 'N/A',
            donor.currency
          ]),
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] },
          styles: { fontSize: 8 }
        });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="donor-contributions-report-${new Date().toISOString().split('T')[0]}.pdf"`
          }
        });
      } else {
        // Default payments PDF
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(20);
        doc.text('Payments Export', 148, 15, { align: 'center' });
        
        autoTable(doc, {
          startY: 25,
          head: [['Payment ID', 'Date', 'Contact Name', 'Amount', 'Currency', 'Method', 'Status', 'Third Party', 'Pledge Amount', 'Balance']],
          body: paymentsData.map(p => [
            p.paymentId,
            p.paymentDate,
            p.contactName,
            formatCurrency(Number(p.amount)),
            p.currency,
            p.paymentMethod,
            p.paymentStatus,
            p.isThirdParty ? 'Yes' : 'No',
            formatCurrency(Number(p.pledgeAmount || 0)),
            formatCurrency(Number(p.pledgeBalance || 0))
          ]),
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] },
          styles: { fontSize: 8 }
        });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.pdf"`
          }
        });
      }
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