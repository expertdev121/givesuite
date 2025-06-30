/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { payment, pledge } from "@/lib/db/schema";
import { ErrorHandler } from "@/lib/error-handler";
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

const QueryParamsSchema = z.object({
  pledgeId: z.number().positive(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  paymentStatus: PaymentStatusEnum.optional(),
});

type QueryParams = z.infer<typeof QueryParamsSchema>;

const updatePaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive").optional(),
  currency: z
    .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
    .optional(),
  amountUsd: z.number().positive("Amount in USD must be positive").optional(),
  exchangeRate: z
    .number()
    .positive("Exchange rate must be positive")
    .optional(),
  paymentDate: z.string().min(1, "Payment date is required").optional(),
  receivedDate: z.string().optional(),
  paymentMethod: z
    .enum([
      "credit_card",
      "cash",
      "check",
      "bank_transfer",
      "paypal",
      "wire_transfer",
      "other",
    ])
    .optional(),
  paymentStatus: PaymentStatusEnum.optional(),
  referenceNumber: z.string().optional(),
  checkNumber: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptType: z
    .enum(["invoice", "confirmation", "receipt", "other"])
    .optional(),
  receiptIssued: z.boolean().optional(),
  solicitorId: z
    .number()
    .positive("Solicitor ID must be positive")
    .optional()
    .nullable(),
  bonusPercentage: z
    .number()
    .positive("Bonus percentage must be positive")
    .optional()
    .nullable(),
  bonusAmount: z
    .number()
    .positive("Bonus amount must be positive")
    .optional()
    .nullable(),
  bonusRuleId: z
    .number()
    .positive("Bonus rule ID must be positive")
    .optional()
    .nullable(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const queryParams: QueryParams = QueryParamsSchema.parse({
      pledgeId: parseInt(id, 10),
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "10", 10),
      search: searchParams.get("search") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
    });

    const { pledgeId, page, limit, search, paymentStatus } = queryParams;

    let query = db
      .select({
        id: payment.id,
        pledgeId: payment.pledgeId,
        paymentPlanId: payment.paymentPlanId,
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
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        pledgeExchangeRate: pledge.exchangeRate,
      })
      .from(payment)
      .innerJoin(pledge, eq(payment.pledgeId, pledge.id))
      .where(eq(payment.pledgeId, pledgeId))
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
    query = query.limit(limit).offset(offset).orderBy(desc(payment.createdAt));

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pledgeId: string }> }
) {
  try {
    const { pledgeId } = await params;
    const paymentId = parseInt(pledgeId);
    if (isNaN(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment ID" },
        { status: 400 }
      );
    }
    const existingPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    await db.delete(payment).where(eq(payment.id, paymentId));

    return NextResponse.json({
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return ErrorHandler.handle(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = parseInt(id);

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

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    // Only include fields that were provided in the request
    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.amount.toString();
    }
    if (validatedData.currency !== undefined) {
      updateData.currency = validatedData.currency;
    }
    if (validatedData.amountUsd !== undefined) {
      updateData.amountUsd = validatedData.amountUsd.toString();
    }
    if (validatedData.exchangeRate !== undefined) {
      updateData.exchangeRate = validatedData.exchangeRate.toString();
    }
    if (validatedData.paymentDate !== undefined) {
      updateData.paymentDate = validatedData.paymentDate;
    }
    if (validatedData.receivedDate !== undefined) {
      updateData.receivedDate = validatedData.receivedDate || null;
    }
    if (validatedData.paymentMethod !== undefined) {
      updateData.paymentMethod = validatedData.paymentMethod;
    }
    if (validatedData.paymentStatus !== undefined) {
      updateData.paymentStatus = validatedData.paymentStatus;
    }
    if (validatedData.referenceNumber !== undefined) {
      updateData.referenceNumber = validatedData.referenceNumber || null;
    }
    if (validatedData.checkNumber !== undefined) {
      updateData.checkNumber = validatedData.checkNumber || null;
    }
    if (validatedData.receiptNumber !== undefined) {
      updateData.receiptNumber = validatedData.receiptNumber || null;
    }
    if (validatedData.receiptType !== undefined) {
      updateData.receiptType = validatedData.receiptType || null;
    }
    if (validatedData.receiptIssued !== undefined) {
      updateData.receiptIssued = validatedData.receiptIssued;
    }
    if (validatedData.solicitorId !== undefined) {
      updateData.solicitorId = validatedData.solicitorId;
    }
    if (validatedData.bonusPercentage !== undefined) {
      updateData.bonusPercentage =
        validatedData.bonusPercentage?.toString() || null;
    }
    if (validatedData.bonusAmount !== undefined) {
      updateData.bonusAmount = validatedData.bonusAmount?.toString() || null;
    }
    if (validatedData.bonusRuleId !== undefined) {
      updateData.bonusRuleId = validatedData.bonusRuleId;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes || null;
    }

    // Update the payment
    const updatedPayment = await db
      .update(payment)
      .set(updateData)
      .where(eq(payment.id, paymentId))
      .returning();

    if (updatedPayment.length === 0) {
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Payment updated successfully",
      payment: updatedPayment[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
