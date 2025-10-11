import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contact, pledge, payment, paymentPlan, invoiceTemplate, category } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { InvoiceData } from "@/types/invoice";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface JSDocWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

function formatDateForInvoiceServer(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrencyWithCodeServer(amount: number | undefined | null, currency: string = 'USD', isBalance: boolean = false): string {
  if (amount == null || isNaN(amount)) {
    if (currency === 'USD') return '$ 0';
    return `${currency} 0`;
  }
  
  const absAmount = Math.abs(amount);
  const formattedAmount = absAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  let prefix = '';
  if (currency === 'USD') {
    prefix = '$';
  } else {
    prefix = `${currency} `;
  }

  if (amount < 0) {
    if (isBalance) {
      return `(${prefix}${formattedAmount})`;
    } else {
      return `-${prefix}${formattedAmount}`;
    }
  }

  return `${prefix}${formattedAmount}`;
}

export async function POST(request: NextRequest) {
  try {
    const { contactId } = await request.json();
    if (!contactId || typeof contactId !== "number") {
      return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
    }

    // Fetch invoice data
    const contactData = await db
      .select({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        displayName: contact.displayName,
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
      })
      .from(contact)
      .where(eq(contact.id, contactId))
      .limit(1);

    if (contactData.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const pledgesData = await db
      .select({
        id: pledge.id,
        pledgeDate: pledge.pledgeDate,
        description: pledge.description,
        originalAmount: pledge.originalAmount,
        currency: pledge.currency,
        totalPaid: pledge.totalPaid,
        balance: pledge.balance,
        categoryName: category.name,
      })
      .from(pledge)
      .leftJoin(category, eq(pledge.categoryId, category.id))
      .where(eq(pledge.contactId, contactId));

    const paymentsData = await db
      .select({
        id: payment.id,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        notes: payment.notes,
        pledgeDescription: pledge.description,
      })
      .from(payment)
      .leftJoin(pledge, eq(payment.pledgeId, pledge.id))
      .where(
        or(
          eq(payment.payerContactId, contactId),
          eq(pledge.contactId, contactId)
        )
      );

    const paymentPlansData = await db
      .select({
        id: paymentPlan.id,
        planName: paymentPlan.planName,
        frequency: paymentPlan.frequency,
        totalPlannedAmount: paymentPlan.totalPlannedAmount,
        currency: paymentPlan.currency,
        remainingAmount: paymentPlan.remainingAmount,
        nextPaymentDate: paymentPlan.nextPaymentDate,
      })
      .from(paymentPlan)
      .leftJoin(pledge, eq(paymentPlan.pledgeId, pledge.id))
      .where(eq(pledge.contactId, contactId));

    const templateData = await db
      .select()
      .from(invoiceTemplate)
      .where(eq(invoiceTemplate.isActive, true))
      .limit(1);

    const template = templateData[0] || {
      id: 0,
      orgNameEn: "YESHIVAT HESDER LEV HATORAH",
      orgNameHeb: "ישיבת הסדר לב התורה",
      logoUrl: null,
      establishedYear: "2002",
      headerNotes: null,
      footerNotes: "*All reflects both scheduled payments, calculated using today's conversion rate.",
      tableHeaders: {} as Record<string, string>,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let logoBase64: { data: string; format: string } | null = null;
    if (template.logoUrl) {
      try {
        const response = await fetch(template.logoUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.startsWith('image/')) {
            const format = contentType.split('/')[1].toUpperCase();
            if (format === 'PNG' || format === 'JPEG' || format === 'JPG') {
              logoBase64 = { data: Buffer.from(buffer).toString('base64'), format: format === 'JPG' ? 'JPEG' : format };
            }
          }
        }
      } catch (e) {
        console.warn('Logo image failed to load');
      }
    }

    const invoiceData: InvoiceData = {
      contact: {
        ...contactData[0],
        displayName: contactData[0].displayName || `${contactData[0].firstName} ${contactData[0].lastName}`,
        email: contactData[0].email || undefined,
        phone: contactData[0].phone || undefined,
        address: contactData[0].address || undefined,
      },
      pledges: pledgesData.map(p => ({
        id: p.id,
        pledgeDate: new Date(p.pledgeDate),
        description: p.description || undefined,
        originalAmount: parseFloat(p.originalAmount),
        currency: p.currency,
        totalPaid: parseFloat(p.totalPaid),
        balance: parseFloat(p.balance),
        category: p.categoryName ? { name: p.categoryName } : undefined,
      })),
      payments: paymentsData.map(p => ({
        id: p.id,
        paymentDate: new Date(p.paymentDate),
        amount: parseFloat(p.amount),
        currency: p.currency,
        amountUsd: p.amountUsd ? parseFloat(p.amountUsd) : undefined,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber || undefined,
        notes: p.notes || undefined,
        pledgeDescription: p.pledgeDescription || undefined,
      })),
      paymentPlans: paymentPlansData.map(p => ({
        id: p.id,
        planName: p.planName || undefined,
        frequency: p.frequency,
        totalPlannedAmount: parseFloat(p.totalPlannedAmount),
        currency: p.currency,
        remainingAmount: parseFloat(p.remainingAmount),
        nextPaymentDate: p.nextPaymentDate ? new Date(p.nextPaymentDate) : undefined,
      })),
      template: {
        ...template,
        tableHeaders: template.tableHeaders as Record<string, string>,
        logoUrl: template.logoUrl || undefined,
        headerNotes: template.headerNotes || undefined,
      },
    };

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;

    // Load Hebrew font
    try {
      const fontResponse = await fetch('https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansHebrew/NotoSansHebrew-Regular.ttf');
      if (fontResponse.ok) {
        const fontBuffer = await fontResponse.arrayBuffer();
        const fontBase64 = Buffer.from(fontBuffer).toString('base64');
        doc.addFileToVFS('NotoSansHebrew-Regular.ttf', fontBase64);
        doc.addFont('NotoSansHebrew-Regular.ttf', 'NotoSansHebrew', 'normal');
      }
    } catch (e) {
      console.warn('Failed to load Hebrew font');
    }

    // Function to render header
    const renderHeader = (isFirstPage: boolean = false) => {
      const yPos = 10;
      
      // Add logo on the top right if available
      if (logoBase64 && isFirstPage) {
        try {
          doc.addImage(
            `data:image/${logoBase64.format.toLowerCase()};base64,${logoBase64.data}`, 
            logoBase64.format, 
            pageWidth - 55, 
            yPos, 
            45, 
            22
          );
        } catch (e) {
          console.warn('Failed to add logo to PDF');
        }
      }

      // Organization name - English (left side, bold)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(template.orgNameEn, margin, yPos + 8);

      // Established year (left side, normal)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`ESTABLISHED IN ${template.establishedYear}`, margin, yPos + 14);

      // Hebrew text - right aligned
      doc.setFont('NotoSansHebrew', 'normal');
      doc.setFontSize(12);
      doc.text(template.orgNameHeb, pageWidth - margin, yPos + 8, { align: 'right' });

      return yPos + 25;
    };

    // Function to add footer
    const addFooter = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const footerY = pageHeight - 12;
      const footerLines = doc.splitTextToSize(template.footerNotes, pageWidth - 2 * margin);
      doc.text(footerLines, margin, footerY);
    };

    // ===== PAGE 1: ACCOUNT SUMMARY =====
    let yPosition = renderHeader(true);
    yPosition += 5;

    // Contact Information
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(formattedDate, margin, yPosition);
    yPosition += 6;
    doc.text(invoiceData.contact.displayName || '', margin, yPosition);
    yPosition += 6;
    if (invoiceData.contact.email) {
      doc.text(invoiceData.contact.email, margin, yPosition);
      yPosition += 6;
    }
    if (invoiceData.contact.phone) {
      doc.text(invoiceData.contact.phone, margin, yPosition);
      yPosition += 6;
    }
    yPosition += 8;

    // ACCOUNT SUMMARY Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("ACCOUNT SUMMARY", pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Account Summary Table
    if (invoiceData.pledges.length > 0) {
      const pledgeRows = invoiceData.pledges.map(p => {
        const chargeAmount = formatCurrencyWithCodeServer(p.originalAmount, p.currency);
        const paidToDate = formatCurrencyWithCodeServer(p.totalPaid, p.currency);
        const balance = formatCurrencyWithCodeServer(p.balance, p.currency, true);
        
        return [
          formatDateForInvoiceServer(p.pledgeDate),
          p.description || "",
          chargeAmount,
          paidToDate,
          balance
        ];
      });

      autoTable(doc, {
        head: [["Date", "Charge", "Charge Amount", "Paid to Date", "Balance"]],
        body: pledgeRows,
        startY: yPosition,
        theme: 'grid',
        styles: { 
          fontSize: 9, 
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: { 
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 60, halign: 'left' },
          2: { cellWidth: 32 },
          3: { cellWidth: 32 },
          4: { cellWidth: 34 }
        },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as JSDocWithAutoTable).lastAutoTable.finalY + 8;

      // Calculate total balance
      const totalBalance = invoiceData.pledges.reduce((sum, p) => sum + p.balance, 0);
      const mainCurrency = invoiceData.pledges[0]?.currency || 'ILS';
      
      // Balance line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(
        `Balance**: ${formatCurrencyWithCodeServer(totalBalance, mainCurrency)}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += 6;

      // Disclaimer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(
        "** Balance reflects both paid and scheduled payments, calculated using today's conversion rate",
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += 10;

      // Payment detail note
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("PAYMENT DETAIL BEGINS ON SECOND PAGE", pageWidth / 2, yPosition, { align: 'center' });
    }

    // Add footer to page 1
    addFooter();

    // ===== PAGE 2: PAYMENT DETAILS =====
    if (invoiceData.payments.length > 0) {
      doc.addPage();
      yPosition = renderHeader(false);
      yPosition += 10;

      // Section title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text("Payments/External Subsidies", margin, yPosition);
      yPosition += 10;

      // Payment table
      const paymentRows = invoiceData.payments.map(p => {
        const localAmount = formatCurrencyWithCodeServer(p.amount, p.currency);
        const usdAmount = p.amountUsd 
          ? `USD(${formatCurrencyWithCodeServer(p.amountUsd, 'USD').replace('$ ', '')})`
          : 'N/A';
        
        return [
          formatDateForInvoiceServer(p.paymentDate),
          p.pledgeDescription || "General Payment",
          p.paymentMethod || "N/A",
          usdAmount,
          localAmount
        ];
      });

      autoTable(doc, {
        head: [["Date", "Applied To", "Payment Source\n(other than billed party)", "Amount Converted", "Amount*"]],
        body: paymentRows,
        startY: yPosition,
        theme: 'grid',
        styles: { 
          fontSize: 8, 
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: { 
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          halign: 'center',
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 38, halign: 'left' },
          2: { cellWidth: 48, halign: 'left' },
          3: { cellWidth: 35 },
          4: { cellWidth: 39 }
        },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as JSDocWithAutoTable).lastAutoTable.finalY + 8;

      // Add footer to page 2
      addFooter();
    }

    // Get PDF as base64
    const pdfBuffer = doc.output("arraybuffer");
    const base64 = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({ pdfBase64: base64 });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}