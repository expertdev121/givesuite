import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contact, pledge, payment, paymentPlan, invoiceTemplate, category } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { InvoiceData } from "@/types/invoice";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactId = parseInt(id);
    if (isNaN(contactId)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    // Fetch contact
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

    // Fetch pledges with category
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

    // Fetch payments
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
      })
      .from(payment)
      .leftJoin(pledge, eq(payment.pledgeId, pledge.id))
      .where(
        or(
          eq(payment.payerContactId, contactId),
          eq(pledge.contactId, contactId)
        )
      );

    // Fetch payment plans
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

    // Fetch default template
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
      footerNotes: "*All scheduled payments calculated using today's conversion rate. These payments will be calculated at the actual conversion rate when received. Note: All payments are subject to third-party payment processing fees.",
      tableHeaders: {} as Record<string, string>,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const invoiceData: InvoiceData = {
      contact: {
        ...contactData[0],
        displayName: contactData[0].displayName || undefined,
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

    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
