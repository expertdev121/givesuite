/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { payment, pledge } from "@/lib/db/schema";
import { ErrorHandler } from "@/lib/error-handler";
import { eq, desc, or, ilike, and, SQL, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Re-defining common enums for clarity and consistency
const PaymentStatusEnum = z.enum([
  "expected", // Added from client form
  "pending",
  "completed",
  "refund", // Added from client form
  "returned", // Added from client form
  "declined", // Added from client form
  "failed",
  "cancelled",
  "processing",
]);

const PaymentMethodEnum = z.enum([
  "ach",
  "bill_pay", 
  "cash",
  "check",
  "credit",
  "credit_card",
  "expected", 
  "goods_and_services", // Added from client form
  "matching_funds", // Added from client form
  "money_order", // Added from client form
  "p2p", // Added from client form
  "paypal", // From original server enum, keep if used
  "pending", // If 'pending' is a method (was status on client) - clarify this one
  "refund", // If 'refund' is a method (was status on client) - clarify this one
  "scholarship", // Added from client form
  "stock", // Added from client form
  "student_portion", // Added from client form
  "unknown", // Added from client form
  "wire", // Added from client form
  "xfer", // Added from client form
  "wire_transfer", // From original server enum, keep if used
  "bank_transfer", // From original server enum, keep if used
  "other", // From original server enum, keep if used
]);


// --- GET METHOD ---
// This GET method will now fetch a SINGLE payment by its ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // Directly destructure params
) {
  try {
    const paymentId = parseInt(params.id, 10); // Parse id from route params

    if (isNaN(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    const paymentResult = await db
      .select({
        id: payment.id,
        pledgeId: payment.pledgeId,
        paymentPlanId: payment.paymentPlanId,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        amountInPledgeCurrency: payment.amountInPledgeCurrency, // Make sure this is selected if used
        exchangeRate: payment.exchangeRate,
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        paymentMethod: payment.paymentMethod,
        methodDetail: payment.methodDetail,
        paymentStatus: payment.paymentStatus,
        referenceNumber: payment.referenceNumber,
        checkNumber: payment.checkNumber,
        receiptNumber: payment.receiptNumber,
        receiptType: payment.receiptType,
        receiptIssued: payment.receiptIssued,
        solicitorId: payment.solicitorId,
        bonusPercentage: payment.bonusPercentage,
        bonusAmount: payment.bonusAmount,
        bonusRuleId: payment.bonusRuleId,
        notes: payment.notes,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        // Include pledge details if useful for the single payment view
        pledgeDescription: sql<string>`(
            SELECT description FROM ${pledge} WHERE id = ${payment.pledgeId}
          )`.as("pledgeDescription"),
        pledgeOriginalAmount: sql<string>`(
            SELECT original_amount FROM ${pledge} WHERE id = ${payment.pledgeId}
          )`.as("pledgeOriginalAmount"),
        pledgeOriginalCurrency: sql<string>`(
            SELECT currency FROM ${pledge} WHERE id = ${payment.pledgeId}
          )`.as("pledgeOriginalCurrency"),
        pledgeExchangeRate: sql<string>`(
            SELECT exchange_rate FROM ${pledge} WHERE id = ${payment.pledgeId}
          )`.as("pledgeExchangeRate"),
        contactId: sql<number>`(
            SELECT contact_id FROM ${pledge} WHERE id = ${payment.pledgeId}
          )`.as("contactId"),
      })
      .from(payment)
      .leftJoin(pledge, eq(payment.pledgeId, pledge.id)) // Use leftJoin as pledge might be null for some edge cases
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (paymentResult.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(
      { payment: paymentResult[0] }, // Return the single payment object
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching single payment:", error);
    return ErrorHandler.handle(error); // Use ErrorHandler for consistency
  }
}

// --- PATCH METHOD ---
const updatePaymentSchema = z.object({
  // Amount fields - should be optional as not all are updated
  amount: z.number().positive("Amount must be positive").optional(),
  currency: PaymentMethodEnum.optional(), // Use the consistent enum
  amountUsd: z.number().positive("Amount in USD must be positive").optional(),
  amountInPledgeCurrency: z.number().positive("Amount in pledge currency must be positive").optional(), // Added for consistency
  exchangeRate: z.number().positive("Exchange rate must be positive").optional(),

  paymentDate: z.string().min(1, "Payment date is required").optional(),
  receivedDate: z.string().optional().nullable(), // Allow null
  methodDetail: z.string().optional().nullable(), // Allow null
  paymentMethod: PaymentMethodEnum.optional(), // Use the consistent enum
  paymentStatus: PaymentStatusEnum.optional(), // Use the consistent enum

  referenceNumber: z.string().optional().nullable(), // Allow null
  checkNumber: z.string().optional().nullable(), // Allow null
  receiptNumber: z.string().optional().nullable(), // Allow null
  receiptType: z.enum(["invoice", "confirmation", "receipt", "other"]).optional().nullable(), // Allow null
  receiptIssued: z.boolean().optional(),

  solicitorId: z.number().positive("Solicitor ID must be positive").optional().nullable(),
  bonusPercentage: z.number().min(0).max(100).optional().nullable(), // Allow 0 and null
  bonusAmount: z.number().min(0).optional().nullable(), // Allow 0 and null
  bonusRuleId: z.number().positive("Bonus rule ID must be positive").optional().nullable(),
  notes: z.string().optional().nullable(),

  paymentPlanId: z.number().positive("Payment plan ID must be positive").optional().nullable(), // Added/Ensured
  installmentScheduleId: z.number().positive().optional().nullable(), // Added as it was in client allocation schema
});


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = parseInt(params.id, 10);

    if (isNaN(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePaymentSchema.parse(body);

    // Check if payment exists
    const existingPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Determine if pledge update is needed (if amount/currency/rates change)
    let updatePledgeTotals = false;
    const oldPaymentData = existingPayment[0]; // Get current values from DB
    const newAmount = validatedData.amount ?? parseFloat(oldPaymentData.amount || '0');
    const newAmountUsd = validatedData.amountUsd ?? parseFloat(oldPaymentData.amountUsd || '0');
    const newAmountInPledgeCurrency = validatedData.amountInPledgeCurrency ?? parseFloat(oldPaymentData.amountInPledgeCurrency || '0');

    if (
      validatedData.amount !== undefined ||
      validatedData.amountUsd !== undefined ||
      validatedData.amountInPledgeCurrency !== undefined ||
      validatedData.currency !== undefined ||
      validatedData.exchangeRate !== undefined
    ) {
      updatePledgeTotals = true;
    }

    // Prepare update data for the payment record
    const updatePaymentRecord: any = {
      updatedAt: new Date(), // Update timestamp
    };

    // Only include fields that were provided in the request
    if (validatedData.amount !== undefined) {
      updatePaymentRecord.amount = newAmount.toFixed(2).toString();
    }
    if (validatedData.currency !== undefined) {
      updatePaymentRecord.currency = validatedData.currency;
    }
    if (validatedData.amountUsd !== undefined) {
      updatePaymentRecord.amountUsd = newAmountUsd.toFixed(2).toString();
    }
    if (validatedData.amountInPledgeCurrency !== undefined) {
        updatePaymentRecord.amountInPledgeCurrency = newAmountInPledgeCurrency.toFixed(2).toString();
    }
    if (validatedData.exchangeRate !== undefined) {
      updatePaymentRecord.exchangeRate = validatedData.exchangeRate.toFixed(4).toString();
    }
    if (validatedData.paymentDate !== undefined) {
      updatePaymentRecord.paymentDate = validatedData.paymentDate;
    }
    // Handle nullable fields correctly:
    if (Object.prototype.hasOwnProperty.call(validatedData, 'receivedDate')) { // Check if property exists, even if null
        updatePaymentRecord.receivedDate = validatedData.receivedDate || null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'methodDetail')) {
        updatePaymentRecord.methodDetail = validatedData.methodDetail || null;
    }
    if (validatedData.paymentMethod !== undefined) {
      updatePaymentRecord.paymentMethod = validatedData.paymentMethod;
    }
    if (validatedData.paymentStatus !== undefined) {
      updatePaymentRecord.paymentStatus = validatedData.paymentStatus;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'referenceNumber')) {
      updatePaymentRecord.referenceNumber = validatedData.referenceNumber || null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'checkNumber')) {
      updatePaymentRecord.checkNumber = validatedData.checkNumber || null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'receiptNumber')) {
      updatePaymentRecord.receiptNumber = validatedData.receiptNumber || null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'receiptType')) {
      updatePaymentRecord.receiptType = validatedData.receiptType || null;
    }
    if (validatedData.receiptIssued !== undefined) {
      updatePaymentRecord.receiptIssued = validatedData.receiptIssued;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'solicitorId')) {
      updatePaymentRecord.solicitorId = validatedData.solicitorId || null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'bonusPercentage')) {
      updatePaymentRecord.bonusPercentage = validatedData.bonusPercentage !== null && validatedData.bonusPercentage !== undefined
        ? validatedData.bonusPercentage.toFixed(2).toString()
        : null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'bonusAmount')) {
      updatePaymentRecord.bonusAmount = validatedData.bonusAmount !== null && validatedData.bonusAmount !== undefined
        ? validatedData.bonusAmount.toFixed(2).toString()
        : null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'bonusRuleId')) {
      updatePaymentRecord.bonusRuleId = validatedData.bonusRuleId || null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'notes')) {
      updatePaymentRecord.notes = validatedData.notes || null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'paymentPlanId')) {
        updatePaymentRecord.paymentPlanId = validatedData.paymentPlanId || null;
    }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'installmentScheduleId')) {
        updatePaymentRecord.installmentScheduleId = validatedData.installmentScheduleId || null;
    }

    // Update the payment record
    const updatedPayment = await db
      .update(payment)
      .set(updatePaymentRecord)
      .where(eq(payment.id, paymentId))
      .returning();

    if (updatedPayment.length === 0) {
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    // --- Recalculate Pledge Totals if Necessary ---
    if (updatePledgeTotals) {
      const pledgeId = existingPayment[0].pledgeId; // Get the associated pledge ID

      // Fetch the pledge details
      const currentPledge = await db
        .select()
        .from(pledge)
        .where(eq(pledge.id, pledgeId))
        .limit(1);

      if (currentPledge.length === 0) {
        console.warn(`Pledge with ID ${pledgeId} not found during payment update total recalculation.`);
        // Proceed without updating pledge, but log warning
      } else {
        const pledgeData = currentPledge[0];
        const originalAmount = parseFloat(pledgeData.originalAmount || '0');
        const originalAmountUsd = parseFloat(pledgeData.originalAmountUsd || '0');

        // Get ALL payments for this pledge (including the just-updated one)
        const allPledgePayments = await db
            .select({
                amountInPledgeCurrency: sql<number>`COALESCE(${payment.amountInPledgeCurrency}::numeric, 0)`,
                amountUsd: sql<number>`COALESCE(${payment.amountUsd}::numeric, 0)`,
            })
            .from(payment)
            .where(eq(payment.pledgeId, pledgeId));

        const newTotalPaid = allPledgePayments.reduce((sum, p) => sum + p.amountInPledgeCurrency, 0);
        const newTotalPaidUsd = allPledgePayments.reduce((sum, p) => sum + p.amountUsd, 0);

        const newBalance = Math.max(0, originalAmount - newTotalPaid);
        const newBalanceUsd = Math.max(0, originalAmountUsd - newTotalPaidUsd);

        await db
          .update(pledge)
          .set({
            totalPaid: newTotalPaid.toFixed(2).toString(),
            totalPaidUsd: newTotalPaidUsd.toFixed(2).toString(),
            balance: newBalance.toFixed(2).toString(),
            balanceUsd: newBalanceUsd.toFixed(2).toString(),
            updatedAt: new Date(),
          })
          .where(eq(pledge.id, pledgeId));
      }
    }

    return NextResponse.json({
      message: "Payment updated successfully",
      payment: updatedPayment[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error during PATCH:", error.issues);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("Error updating payment:", error);
    return ErrorHandler.handle(error);
  }
}

// DELETE method remains the same and is correct for its purpose
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } } // Changed to 'id' for consistency
) {
  try {
    const paymentId = parseInt(params.id); // 'id' from route param, not 'pledgeId'
    if (isNaN(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    // Fetch the payment to get its pledgeId before deleting
    const existingPayment = await db
        .select({ id: payment.id, pledgeId: payment.pledgeId, amountInPledgeCurrency: payment.amountInPledgeCurrency, amountUsd: payment.amountUsd })
        .from(payment)
        .where(eq(payment.id, paymentId))
        .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const { pledgeId: associatedPledgeId, amountInPledgeCurrency: deletedAmountInPledgeCurrency, amountUsd: deletedAmountUsd } = existingPayment[0];

    // Delete the payment
    await db.delete(payment).where(eq(payment.id, paymentId));

    // Recalculate pledge totals after deletion
    if (associatedPledgeId) {
        const currentPledge = await db
            .select()
            .from(pledge)
            .where(eq(pledge.id, associatedPledgeId))
            .limit(1);

        if (currentPledge.length > 0) {
            const pledgeData = currentPledge[0];
            const originalAmount = parseFloat(pledgeData.originalAmount || '0');
            const originalAmountUsd = parseFloat(pledgeData.originalAmountUsd || '0');

            // Get remaining payments for this pledge
            const remainingPayments = await db
                .select({
                    amountInPledgeCurrency: sql<number>`COALESCE(${payment.amountInPledgeCurrency}::numeric, 0)`,
                    amountUsd: sql<number>`COALESCE(${payment.amountUsd}::numeric, 0)`,
                })
                .from(payment)
                .where(eq(payment.pledgeId, associatedPledgeId));

            const newTotalPaid = remainingPayments.reduce((sum, p) => sum + p.amountInPledgeCurrency, 0);
            const newTotalPaidUsd = remainingPayments.reduce((sum, p) => sum + p.amountUsd, 0);

            const newBalance = Math.max(0, originalAmount - newTotalPaid);
            const newBalanceUsd = Math.max(0, originalAmountUsd - newTotalPaidUsd);

            await db
                .update(pledge)
                .set({
                    totalPaid: newTotalPaid.toFixed(2).toString(),
                    totalPaidUsd: newTotalPaidUsd.toFixed(2).toString(),
                    balance: newBalance.toFixed(2).toString(),
                    balanceUsd: newBalanceUsd.toFixed(2).toString(),
                    updatedAt: new Date(),
                })
                .where(eq(pledge.id, associatedPledgeId));
        }
    }

    return NextResponse.json({
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return ErrorHandler.handle(error);
  }
}