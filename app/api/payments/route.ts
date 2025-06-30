import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payment, pledge } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";

const paymentSchema = z.object({
  pledgeId: z.number().positive(),
  amount: z.number().positive("Payment amount must be positive"),
  currency: z.enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"]),
  amountUsd: z.number().positive("Payment amount in USD must be positive"),
  exchangeRate: z.number().positive("Exchange rate must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  receivedDate: z.string().optional(),
  paymentMethod: z.enum([
    "credit_card",
    "cash",
    "check",
    "bank_transfer",
    "paypal",
    "wire_transfer",
    "other",
  ]),
  paymentStatus: z
    .enum([
      "pending",
      "completed",
      "failed",
      "cancelled",
      "refunded",
      "processing",
    ])
    .default("completed"),
  referenceNumber: z.string().optional(),
  checkNumber: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptType: z
    .enum(["invoice", "confirmation", "receipt", "other"])
    .optional(),
  receiptIssued: z.boolean().default(false),
  // NEW SOLICITOR FIELDS
  solicitorId: z.number().positive().optional(),
  bonusPercentage: z.number().min(0).max(100).optional(),
  bonusAmount: z.number().min(0).optional(),
  bonusRuleId: z.number().positive().optional(),
  notes: z.string().optional(),
  paymentPlanId: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    // First, get the current pledge data
    const currentPledge = await db
      .select()
      .from(pledge)
      .where(eq(pledge.id, validatedData.pledgeId))
      .limit(1);

    if (currentPledge.length === 0) {
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    }

    const pledgeData = currentPledge[0];
    const currentTotalPaid = parseFloat(pledgeData.totalPaid);
    const currentTotalPaidUsd = parseFloat(pledgeData.totalPaidUsd || "0");
    const originalAmount = parseFloat(pledgeData.originalAmount);
    const originalAmountUsd = parseFloat(pledgeData.originalAmountUsd || "0");

    // Calculate new totals
    const newTotalPaid = currentTotalPaid + validatedData.amount;
    const newTotalPaidUsd = currentTotalPaidUsd + validatedData.amountUsd;
    const newBalance = originalAmount - newTotalPaid;
    const newBalanceUsd = originalAmountUsd - newTotalPaidUsd;

    // Prepare the new payment with all schema fields
    const newPayment = {
      pledgeId: validatedData.pledgeId,
      amount: validatedData.amount.toString(),
      currency: validatedData.currency,
      amountUsd: validatedData.amountUsd.toString(),
      exchangeRate: validatedData.exchangeRate.toString(),
      paymentDate: validatedData.paymentDate,
      receivedDate: validatedData.receivedDate || validatedData.paymentDate,
      paymentMethod: validatedData.paymentMethod,
      paymentStatus: validatedData.paymentStatus,
      referenceNumber: validatedData.referenceNumber || null,
      checkNumber: validatedData.checkNumber || null,
      receiptNumber: validatedData.receiptNumber || null,
      receiptType: validatedData.receiptType || null,
      receiptIssued: validatedData.receiptIssued,
      // NEW SOLICITOR FIELDS
      solicitorId: validatedData.solicitorId || null,
      bonusPercentage: validatedData.bonusPercentage?.toString() || null,
      bonusAmount: validatedData.bonusAmount?.toString() || null,
      bonusRuleId: validatedData.bonusRuleId || null,
      notes: validatedData.notes || null,
      paymentPlanId: validatedData.paymentPlanId || null,
    };

    // Create the payment first
    const paymentResult = await db
      .insert(payment)
      .values(newPayment)
      .returning();

    if (paymentResult.length === 0) {
      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 }
      );
    }

    // Update the pledge with new totals
    const updateResult = await db
      .update(pledge)
      .set({
        totalPaid: newTotalPaid.toString(),
        totalPaidUsd: newTotalPaidUsd.toString(),
        balance: Math.max(0, newBalance).toString(),
        balanceUsd: Math.max(0, newBalanceUsd).toString(),
        updatedAt: new Date(),
      })
      .where(eq(pledge.id, validatedData.pledgeId))
      .returning();

    if (updateResult.length === 0) {
      // If pledge update fails, we should ideally delete the payment
      // But since we can't use transactions, log this as an error
      console.error("Payment created but pledge update failed", {
        paymentId: paymentResult[0].id,
        pledgeId: validatedData.pledgeId,
      });

      return NextResponse.json(
        {
          error: "Payment created but pledge update failed",
          paymentId: paymentResult[0].id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Payment created successfully",
        payment: paymentResult[0],
      },
      { status: 201 }
    );
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

    console.error("Error creating payment:", error);
    return ErrorHandler.handle(error);
  }
}

const querySchema = z.object({
  pledgeId: z.number().positive().optional(),
  contactId: z.number().positive().optional(),
  solicitorId: z.number().positive().optional(), // NEW: Filter by solicitor
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
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
  paymentStatus: z
    .enum([
      "pending",
      "completed",
      "failed",
      "cancelled",
      "refunded",
      "processing",
    ])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hasSolicitor: z.coerce.boolean().optional(), // NEW: Filter payments with/without solicitor
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = querySchema.safeParse({
      pledgeId: searchParams.get("pledgeId")
        ? parseInt(searchParams.get("pledgeId")!)
        : undefined,
      contactId: searchParams.get("contactId")
        ? parseInt(searchParams.get("contactId")!)
        : undefined,
      solicitorId: searchParams.get("solicitorId")
        ? parseInt(searchParams.get("solicitorId")!)
        : undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      paymentMethod: searchParams.get("paymentMethod") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      hasSolicitor: searchParams.get("hasSolicitor") ?? undefined,
    });

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsedParams.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      pledgeId,
      contactId,
      solicitorId,
      page,
      limit,
      search,
      paymentMethod,
      paymentStatus,
      startDate,
      endDate,
      hasSolicitor,
    } = parsedParams.data;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (pledgeId) {
      conditions.push(eq(payment.pledgeId, pledgeId));
    }

    if (contactId) {
      conditions.push(
        sql`${payment.pledgeId} IN (SELECT id FROM ${pledge} WHERE contact_id = ${contactId})`
      );
    }

    // NEW: Filter by solicitor
    if (solicitorId) {
      conditions.push(eq(payment.solicitorId, solicitorId));
    }

    // NEW: Filter by whether payment has a solicitor or not
    if (hasSolicitor !== undefined) {
      if (hasSolicitor) {
        conditions.push(sql`${payment.solicitorId} IS NOT NULL`);
      } else {
        conditions.push(sql`${payment.solicitorId} IS NULL`);
      }
    }

    if (search) {
      conditions.push(
        sql`${payment.referenceNumber} ILIKE ${"%" + search + "%"} OR ${
          payment.checkNumber
        } ILIKE ${"%" + search + "%"} OR ${payment.notes} ILIKE ${
          "%" + search + "%"
        } OR ${payment.receiptNumber} ILIKE ${"%" + search + "%"}`
      );
    }

    if (paymentMethod) {
      conditions.push(eq(payment.paymentMethod, paymentMethod));
    }

    if (paymentStatus) {
      conditions.push(eq(payment.paymentStatus, paymentStatus));
    }

    if (startDate) {
      conditions.push(sql`${payment.paymentDate} >= ${startDate}`);
    }

    if (endDate) {
      conditions.push(sql`${payment.paymentDate} <= ${endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const paymentsQuery = db
      .select({
        id: payment.id,
        pledgeId: payment.pledgeId,

        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        exchangeRate: payment.exchangeRate, // NEW
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        referenceNumber: payment.referenceNumber,
        checkNumber: payment.checkNumber,
        receiptNumber: payment.receiptNumber,
        receiptType: payment.receiptType, // NEW
        receiptIssued: payment.receiptIssued,
        // NEW SOLICITOR FIELDS
        solicitorId: payment.solicitorId,
        bonusPercentage: payment.bonusPercentage,
        bonusAmount: payment.bonusAmount,
        bonusRuleId: payment.bonusRuleId,
        notes: payment.notes,
        paymentPlanId: payment.paymentPlanId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        // Pledge information
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
        solicitorName: sql<string>`(
          SELECT CONCAT(c.first_name, ' ', c.last_name)
          FROM solicitor s
          JOIN contact c ON s.contact_id = c.id
          WHERE s.id = ${payment.solicitorId}
        )`.as("solicitorName"),
      })
      .from(payment)
      .where(whereClause)
      .orderBy(sql`${payment.paymentDate} DESC`)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(payment)
      .where(whereClause);

    const [payments, totalCountResult] = await Promise.all([
      paymentsQuery.execute(),
      countQuery.execute(),
    ]);

    const totalCount = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      payments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        pledgeId,
        contactId,
        solicitorId,
        search,
        paymentMethod,
        paymentStatus,
        startDate,
        endDate,
        hasSolicitor,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "X-Total-Count": response.pagination.totalCount.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch payments",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
