import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pledge,
  contact,
  category,
  payment,
  paymentPlan,
  bonusCalculation,
} from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import { ErrorHandler } from "@/lib/error-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pledgeId = parseInt(id, 10);
  try {
    if (isNaN(pledgeId)) {
      return NextResponse.json({ error: "Invalid pledge ID" }, { status: 400 });
    }

    const pledgeDetailsQuery = db
      .select({
        id: pledge.id,
        pledgeDate: pledge.pledgeDate,
        description: pledge.description,
        originalAmount: pledge.originalAmount,
        currency: pledge.currency,
        totalPaid: pledge.totalPaid,
        balance: pledge.balance,
        originalAmountUsd: pledge.originalAmountUsd,
        totalPaidUsd: pledge.totalPaidUsd,
        balanceUsd: pledge.balanceUsd,
        isActive: pledge.isActive,
        notes: pledge.notes,
        createdAt: pledge.createdAt,
        updatedAt: pledge.updatedAt,

        contactId: contact.id,
        contactFirstName: contact.firstName,
        contactLastName: contact.lastName,
        contactEmail: contact.email,
        contactPhone: contact.phone,

        categoryId: category.id,
        categoryName: category.name,
        categoryDescription: category.description,
      })
      .from(pledge)
      .leftJoin(contact, eq(pledge.contactId, contact.id))
      .leftJoin(category, eq(pledge.categoryId, category.id))
      .where(eq(pledge.id, pledgeId))
      .limit(1);

    // Get payment summary for this pledge
    const paymentSummaryQuery = db
      .select({
        totalPayments: sql<number>`count(*)`.as("totalPayments"),
        lastPaymentDate: sql<string>`max(payment_date)`.as("lastPaymentDate"),
        lastPaymentAmount: sql<string>`(
          SELECT amount FROM ${payment} 
          WHERE pledge_id = ${pledgeId} 
          ORDER BY payment_date DESC 
          LIMIT 1
        )`.as("lastPaymentAmount"),
      })
      .from(payment)
      .where(eq(payment.pledgeId, pledgeId));

    // Get active payment plans for this pledge
    const paymentPlansQuery = db
      .select({
        id: paymentPlan.id,
        planName: paymentPlan.planName,
        frequency: paymentPlan.frequency,
        installmentAmount: paymentPlan.installmentAmount,
        numberOfInstallments: paymentPlan.numberOfInstallments,
        installmentsPaid: paymentPlan.installmentsPaid,
        nextPaymentDate: paymentPlan.nextPaymentDate,
        planStatus: paymentPlan.planStatus,
        totalPlannedAmount: paymentPlan.totalPlannedAmount,
        remainingAmount: paymentPlan.remainingAmount,
        currency: paymentPlan.currency,
        autoRenew: paymentPlan.autoRenew,
        isActive: paymentPlan.isActive,
        createdAt: paymentPlan.createdAt,
      })
      .from(paymentPlan)
      .where(eq(paymentPlan.pledgeId, pledgeId))
      .orderBy(sql`${paymentPlan.createdAt} DESC`);

    // Execute all queries
    const [pledgeDetails, paymentSummary, paymentPlans] = await Promise.all([
      pledgeDetailsQuery.execute(),
      paymentSummaryQuery.execute(),
      paymentPlansQuery.execute(),
    ]);

    if (pledgeDetails.length === 0) {
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    }

    const pledgeData = pledgeDetails[0];
    const summaryData = paymentSummary[0];

    // Calculate additional metrics
    const originalAmount = parseFloat(pledgeData.originalAmount);
    const totalPaid = parseFloat(pledgeData.totalPaid);
    const balance = parseFloat(pledgeData.balance);
    const paymentPercentage =
      originalAmount > 0 ? (totalPaid / originalAmount) * 100 : 0;

    const response = {
      pledge: {
        id: pledgeData.id,
        pledgeDate: pledgeData.pledgeDate,
        description: pledgeData.description,
        originalAmount: originalAmount,
        currency: pledgeData.currency,
        totalPaid: totalPaid,
        balance: balance,
        originalAmountUsd: pledgeData.originalAmountUsd
          ? parseFloat(pledgeData.originalAmountUsd)
          : null,
        totalPaidUsd: pledgeData.totalPaidUsd
          ? parseFloat(pledgeData.totalPaidUsd)
          : null,
        balanceUsd: pledgeData.balanceUsd
          ? parseFloat(pledgeData.balanceUsd)
          : null,
        isActive: pledgeData.isActive,
        notes: pledgeData.notes,
        createdAt: pledgeData.createdAt,
        updatedAt: pledgeData.updatedAt,

        // Calculated fields
        paymentPercentage: Math.round(paymentPercentage * 100) / 100,
        remainingBalance: balance,
        isPaidInFull: balance <= 0,
      },
      contact: {
        id: pledgeData.contactId,
        firstName: pledgeData.contactFirstName,
        lastName: pledgeData.contactLastName,
        fullName: `${pledgeData.contactFirstName} ${pledgeData.contactLastName}`,
        email: pledgeData.contactEmail,
        phone: pledgeData.contactPhone,
      },
      category: pledgeData.categoryId
        ? {
            id: pledgeData.categoryId,
            name: pledgeData.categoryName,
            description: pledgeData.categoryDescription,
          }
        : null,
      paymentSummary: {
        totalPayments: Number(summaryData.totalPayments || 0),
        lastPaymentDate: summaryData.lastPaymentDate,
        lastPaymentAmount: summaryData.lastPaymentAmount
          ? parseFloat(summaryData.lastPaymentAmount)
          : null,
      },
      paymentPlans: paymentPlans.map((plan) => ({
        ...plan,
        totalPlannedAmount: parseFloat(plan.totalPlannedAmount),
        installmentAmount: parseFloat(plan.installmentAmount),
        remainingAmount: parseFloat(plan.remainingAmount),
      })),
      activePaymentPlans: paymentPlans.filter(
        (plan) => plan.isActive && plan.planStatus === "active"
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching pledge details:", error);
    return ErrorHandler.handle(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pledgeId = parseInt(id, 10);

  try {
    if (isNaN(pledgeId)) {
      return NextResponse.json({ error: "Invalid pledge ID" }, { status: 400 });
    }
    const existingPledge = await db
      .select({ id: pledge.id })
      .from(pledge)
      .where(eq(pledge.id, pledgeId))
      .limit(1);

    if (existingPledge.length === 0) {
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    }
    const [relatedPayments, relatedPaymentPlans, bonusCalculations] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(payment)
          .where(eq(payment.pledgeId, pledgeId)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(paymentPlan)
          .where(eq(paymentPlan.pledgeId, pledgeId)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(bonusCalculation)
          .innerJoin(payment, eq(payment.id, bonusCalculation.paymentId))
          .where(eq(payment.pledgeId, pledgeId)),
      ]);

    const paymentCount = Number(relatedPayments[0]?.count || 0);
    const paymentPlanCount = Number(relatedPaymentPlans[0]?.count || 0);
    const bonusCalculationCount = Number(bonusCalculations[0]?.count || 0);
    const deletedRecords = {
      bonusCalculations: bonusCalculationCount,
      payments: paymentCount,
      paymentPlans: paymentPlanCount,
    };
    if (bonusCalculationCount > 0) {
      await db.delete(bonusCalculation).where(
        sql`${bonusCalculation.paymentId} IN (
            SELECT id FROM ${payment} WHERE pledge_id = ${pledgeId}
          )`
      );
    }

    if (paymentCount > 0) {
      await db.delete(payment).where(eq(payment.pledgeId, pledgeId));
    }

    if (paymentPlanCount > 0) {
      await db.delete(paymentPlan).where(eq(paymentPlan.pledgeId, pledgeId));
    }

    await db.delete(pledge).where(eq(pledge.id, pledgeId));

    return NextResponse.json({
      success: true,
      message: "Pledge and all related records permanently deleted",
      deletedPledgeId: pledgeId,
      deletedRecords,
    });
  } catch (error) {
    console.error("Error deleting pledge:", error);
    return ErrorHandler.handle(error);
  }
}