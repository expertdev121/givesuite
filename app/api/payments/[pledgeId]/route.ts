import { db } from "@/lib/db";
import { payment, bonusCalculation } from "@/lib/db/schema";
import { eq, desc, or, ilike, and, SQL, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PaymentStatusEnum = z.enum([
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
  "processing",
]);

const PaymentMethodEnum = z.enum([
  "credit_card",
  "cash",
  "check",
  "bank_transfer",
  "paypal",
  "wire_transfer",
  "other",
]);

const CurrencyEnum = z.enum([
  "USD",
  "ILS",
  "EUR",
  "JPY",
  "GBP",
  "AUD",
  "CAD",
  "ZAR",
]);

const ReceiptTypeEnum = z.enum(["invoice", "confirmation", "receipt", "other"]);

const QueryParamsSchema = z.object({
  pledgeId: z.number().positive(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  paymentStatus: PaymentStatusEnum.optional(),
});

const UpdatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  currency: CurrencyEnum.optional(),
  amountUsd: z.number().positive().optional(),
  exchangeRate: z.number().positive().optional(),
  paymentDate: z.string().datetime().optional(),
  receivedDate: z.string().datetime().optional(),
  paymentMethod: PaymentMethodEnum.optional(),
  paymentStatus: PaymentStatusEnum.optional(),
  referenceNumber: z.string().optional(),
  checkNumber: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptType: ReceiptTypeEnum.optional(),
  receiptIssued: z.boolean().optional(),
  solicitorId: z.number().positive().optional(),
  bonusPercentage: z.number().min(0).max(100).optional(),
  bonusAmount: z.number().min(0).optional(),
  bonusRuleId: z.number().positive().optional(),
  notes: z.string().optional(),
  paymentPlanId: z.number().positive().optional(),
});

type QueryParams = z.infer<typeof QueryParamsSchema>;
type UpdatePayment = z.infer<typeof UpdatePaymentSchema>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pledgeId: string }> }
) {
  const { pledgeId } = await params;
  const pledgeIdNum = parseInt(pledgeId, 10);

  if (isNaN(pledgeIdNum)) {
    return NextResponse.json({ error: "Invalid pledge ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const queryParams: QueryParams = QueryParamsSchema.parse({
      pledgeId: pledgeIdNum,
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "10", 10),
      search: searchParams.get("search") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
    });

    const {
      pledgeId: validatedPledgeId,
      page,
      limit,
      search,
      paymentStatus,
    } = queryParams;

    let query = db
      .select({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        exchangeRate: payment.exchangeRate,
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        paymentMethod: payment.paymentMethod,
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
        paymentPlanId: payment.paymentPlanId,
        pledgeId: payment.pledgeId,
      })
      .from(payment)
      .where(eq(payment.pledgeId, validatedPledgeId))
      .$dynamic();

    const conditions: SQL<unknown>[] = [];

    if (paymentStatus) {
      conditions.push(eq(payment.paymentStatus, paymentStatus));
    }

    if (search) {
      const searchConditions: SQL<unknown>[] = [];
      searchConditions.push(
        ilike(sql`COALESCE(${payment.notes}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${payment.referenceNumber}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${payment.checkNumber}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${payment.receiptNumber}, '')`, `%${search}%`)
      );
      conditions.push(or(...searchConditions)!);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const offset = (page - 1) * limit;
    query = query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(payment.paymentDate));

    const payments = await query;

    return NextResponse.json(
      { payments },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pledgeId: string }> }
) {
  const { pledgeId } = await params;
  const pledgeIdNum = parseInt(pledgeId, 10);

  if (isNaN(pledgeIdNum)) {
    return NextResponse.json({ error: "Invalid pledge ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { paymentId, ...updateData } = body;

    if (!paymentId || typeof paymentId !== "number") {
      return NextResponse.json(
        { error: "Payment ID is required and must be a number" },
        { status: 400 }
      );
    }

    // Validate the update data
    const validatedData: UpdatePayment = UpdatePaymentSchema.parse(updateData);

    // Check if payment exists and belongs to the pledge
    const existingPayment = await db
      .select({ id: payment.id, pledgeId: payment.pledgeId })
      .from(payment)
      .where(and(eq(payment.id, paymentId), eq(payment.pledgeId, pledgeIdNum)))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json(
        { error: "Payment not found or does not belong to this pledge" },
        { status: 404 }
      );
    }

    // Convert data types for database compatibility
    const {
      amount,
      amountUsd,
      exchangeRate,
      bonusPercentage,
      bonusAmount,
      paymentDate,
      receivedDate,
      ...otherFields
    } = validatedData;

    const processedData = {
      ...otherFields,
      // Convert dates to YYYY-MM-DD format for Drizzle date columns
      ...(paymentDate && {
        paymentDate: new Date(paymentDate).toISOString().split("T")[0],
      }),
      ...(receivedDate && {
        receivedDate: new Date(receivedDate).toISOString().split("T")[0],
      }),
      // Convert numeric fields to strings for Drizzle numeric columns
      ...(amount !== undefined && {
        amount: amount.toString(),
      }),
      ...(amountUsd !== undefined && {
        amountUsd: amountUsd.toString(),
      }),
      ...(exchangeRate !== undefined && {
        exchangeRate: exchangeRate.toString(),
      }),
      ...(bonusPercentage !== undefined && {
        bonusPercentage: bonusPercentage.toString(),
      }),
      ...(bonusAmount !== undefined && {
        bonusAmount: bonusAmount.toString(),
      }),
    };

    // Update the payment
    const updatedPayment = await db
      .update(payment)
      .set(processedData)
      .where(eq(payment.id, paymentId))
      .returning({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        exchangeRate: payment.exchangeRate,
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        paymentMethod: payment.paymentMethod,
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
        paymentPlanId: payment.paymentPlanId,
        pledgeId: payment.pledgeId,
      });

    if (updatedPayment.length === 0) {
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Payment updated successfully",
        payment: updatedPayment[0],
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("PUT /payments error:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pledgeId: string }> }
) {
  const { pledgeId } = await params;
  const pledgeIdNum = parseInt(pledgeId, 10);

  if (isNaN(pledgeIdNum)) {
    return NextResponse.json({ error: "Invalid pledge ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId || typeof paymentId !== "number") {
      return NextResponse.json(
        { error: "Payment ID is required and must be a number" },
        { status: 400 }
      );
    }

    // Check if payment exists and belongs to the pledge
    const existingPayment = await db
      .select({
        id: payment.id,
        pledgeId: payment.pledgeId,
        paymentStatus: payment.paymentStatus,
        amount: payment.amount,
        solicitorId: payment.solicitorId,
        bonusAmount: payment.bonusAmount,
      })
      .from(payment)
      .where(and(eq(payment.id, paymentId), eq(payment.pledgeId, pledgeIdNum)))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json(
        { error: "Payment not found or does not belong to this pledge" },
        { status: 404 }
      );
    }

    // Optional: Add business logic checks before deletion
    const paymentToDelete = existingPayment[0];

    // Prevent deletion of completed payments
    if (paymentToDelete.paymentStatus === "completed") {
      return NextResponse.json(
        { error: "Cannot delete completed payments" },
        { status: 400 }
      );
    }

    // Check if payment has bonus calculations that need to be handled
    if (paymentToDelete.solicitorId && paymentToDelete.bonusAmount) {
      // Optional: Check if bonus has been paid out
      const bonusCalculationRecord = await db
        .select({ isPaid: bonusCalculation.isPaid })
        .from(bonusCalculation)
        .where(eq(bonusCalculation.paymentId, paymentId))
        .limit(1);

      if (
        bonusCalculationRecord.length > 0 &&
        bonusCalculationRecord[0].isPaid
      ) {
        return NextResponse.json(
          { error: "Cannot delete payment with paid bonus commission" },
          { status: 400 }
        );
      }
    }

    // Delete the payment (this will cascade delete bonus calculations due to foreign key)
    const deletedPayment = await db
      .delete(payment)
      .where(eq(payment.id, paymentId))
      .returning({
        id: payment.id,
        amount: payment.amount,
        paymentStatus: payment.paymentStatus,
        solicitorId: payment.solicitorId,
        bonusAmount: payment.bonusAmount,
      });

    if (deletedPayment.length === 0) {
      return NextResponse.json(
        { error: "Failed to delete payment" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Payment deleted successfully",
        deletedPayment: deletedPayment[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /payments error:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
