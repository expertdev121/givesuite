/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
// Import the specific types from your schema file
import { paymentPlan, pledge, installmentSchedule, PaymentPlan, NewPaymentPlan } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";

// Zod schema for validating individual custom installments
const installmentSchema = z.object({
  date: z.string().min(1, "Installment date is required"),
  amount: z.number().positive("Installment amount must be positive"),
  notes: z.string().optional(),
});

// Updated schema with conditional validation for custom installments
const paymentPlanSchema = z.object({
  pledgeId: z.number().positive(),
  planName: z.string().optional(),
  frequency: z.enum([
    "weekly",
    "monthly",
    "quarterly",
    "biannual",
    "annual",
    "one_time",
    "custom",
  ]),
  distributionType: z.enum(["fixed", "custom"]).default("fixed"),
  totalPlannedAmount: z
    .number()
    .positive("Total planned amount must be positive"),
  currency: z.enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"]),
  installmentAmount: z.number().positive("Installment amount must be positive").optional(),
  numberOfInstallments: z
    .number()
    .int()
    .positive("Number of installments must be positive")
    .optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  autoRenew: z.boolean().default(false),
  planStatus: z.enum(["active", "completed", "cancelled", "paused", "overdue"]).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  customInstallments: z.array(installmentSchema).optional(),
}).refine((data) => {
  // Validation for fixed distribution type
  if (data.distributionType === "fixed") {
    return data.installmentAmount !== undefined && data.numberOfInstallments !== undefined;
  }
  // Validation for custom distribution type
  if (data.distributionType === "custom") {
    return data.customInstallments && data.customInstallments.length > 0;
  }
  return true;
}, {
  message: "For 'fixed' distribution type, installmentAmount and numberOfInstallments are required. For 'custom' distribution type, customInstallments array is required.",
  path: ["distributionType"]
});

/**
 * Handles POST requests to create a new payment plan.
 * If distributionType is 'custom', it also creates individual installment schedule entries.
 * The numberOfInstallments will be set to the length of customInstallments for custom distribution.
 */
export async function POST(request: NextRequest) {
  let createdPaymentPlan: PaymentPlan | null = null;
  let paymentPlanIdToDelete: number | null = null;

  try {
    const body = await request.json();
    const validatedData = paymentPlanSchema.parse(body);

    // --- Enhanced Validation for 'custom' distribution type ---
    if (validatedData.distributionType === "custom") {
      if (!validatedData.customInstallments || validatedData.customInstallments.length === 0) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "customInstallments", message: "Custom installments must be provided for 'custom' distribution type." }] },
          { status: 400 }
        );
      }

      // Validate that sum of custom installments equals total planned amount
      const totalCustomAmount = validatedData.customInstallments.reduce((sum, installment) => sum + installment.amount, 0);
      if (Math.abs(totalCustomAmount - validatedData.totalPlannedAmount) > 0.01) { // Allow for small floating point differences
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "totalPlannedAmount", message: `Sum of custom installments (${totalCustomAmount}) must equal the total planned amount (${validatedData.totalPlannedAmount}).` }] },
          { status: 400 }
        );
      }

      // Validate installment dates are unique
      const installmentDates = validatedData.customInstallments.map(inst => inst.date);
      const uniqueDates = new Set(installmentDates);
      if (uniqueDates.size !== installmentDates.length) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "customInstallments", message: "Installment dates must be unique." }] },
          { status: 400 }
        );
      }

      // Validate that installment dates are in the future or today
      const today = new Date().toISOString().split('T')[0];
      const futureDates = validatedData.customInstallments.filter(inst => inst.date < today);
      if (futureDates.length > 0) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "customInstallments", message: "Installment dates cannot be in the past." }] },
          { status: 400 }
        );
      }
    }

    // --- Enhanced Validation for 'fixed' distribution type ---
    if (validatedData.distributionType === "fixed") {
      if (!validatedData.installmentAmount || !validatedData.numberOfInstallments) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "installmentAmount/numberOfInstallments", message: "Installment amount and number of installments are required for 'fixed' distribution type." }] },
          { status: 400 }
        );
      }

      // Validate that installmentAmount * numberOfInstallments equals totalPlannedAmount
      const calculatedTotal = validatedData.installmentAmount * validatedData.numberOfInstallments;
      if (Math.abs(calculatedTotal - validatedData.totalPlannedAmount) > 0.01) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "totalPlannedAmount", message: `Installment amount (${validatedData.installmentAmount}) × number of installments (${validatedData.numberOfInstallments}) = ${calculatedTotal} must equal total planned amount (${validatedData.totalPlannedAmount}).` }] },
          { status: 400 }
        );
      }
    }

    // 1. Check if the associated pledge exists AND retrieve its exchange_rate
    const currentPledge = await db
      .select({
        id: pledge.id,
        exchangeRate: pledge.exchangeRate,
      })
      .from(pledge)
      .where(eq(pledge.id, validatedData.pledgeId))
      .limit(1);

    if (currentPledge.length === 0) {
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    }

    const pledgeExchangeRate = currentPledge[0].exchangeRate;

    // Calculate values based on distribution type
    let finalInstallmentAmount: string;
    let finalNumberOfInstallments: number;

    if (validatedData.distributionType === "custom") {
      // For custom distribution, set numberOfInstallments to the length of customInstallments
      finalNumberOfInstallments = validatedData.customInstallments!.length;
      // Calculate average installment amount for reference
      finalInstallmentAmount = (validatedData.totalPlannedAmount / finalNumberOfInstallments).toString();
    } else {
      // For fixed distribution, use the provided values
      finalInstallmentAmount = validatedData.installmentAmount!.toString();
      finalNumberOfInstallments = validatedData.numberOfInstallments!;
    }

    // Prepare data for inserting into the paymentPlan table
    const newPaymentPlanData: NewPaymentPlan = {
      pledgeId: validatedData.pledgeId,
      planName: validatedData.planName || null,
      frequency: validatedData.frequency,
      distributionType: validatedData.distributionType,
      totalPlannedAmount: validatedData.totalPlannedAmount.toString(),
      currency: validatedData.currency,
      installmentAmount: finalInstallmentAmount,
      numberOfInstallments: finalNumberOfInstallments,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate || null,
      nextPaymentDate: validatedData.nextPaymentDate || validatedData.startDate,
      remainingAmount: validatedData.totalPlannedAmount.toString(),
      planStatus: "active",
      autoRenew: validatedData.autoRenew,
      remindersSent: 0,
      lastReminderDate: null,
      isActive: true,
      notes: validatedData.notes || null,
      internalNotes: validatedData.internalNotes || null,
      totalPaid: "0",
      totalPaidUsd: "0",
      exchangeRate: pledgeExchangeRate,
    };

    // 2. Insert the new payment plan
    const paymentPlanResult = await db
      .insert(paymentPlan)
      .values(newPaymentPlanData)
      .returning();

    if (paymentPlanResult.length === 0) {
      throw new Error("Failed to create payment plan record in database. No record returned.");
    }

    createdPaymentPlan = paymentPlanResult[0];
    paymentPlanIdToDelete = createdPaymentPlan.id;

    // 3. If custom distribution, insert installment schedules
    if (validatedData.distributionType === "custom" && validatedData.customInstallments) {
      const installmentsToInsert = validatedData.customInstallments.map((inst) => ({
        paymentPlanId: createdPaymentPlan!.id,
        installmentDate: inst.date,
        installmentAmount: inst.amount.toString(),
        currency: createdPaymentPlan!.currency,
        notes: inst.notes || null,
      }));

      await db.insert(installmentSchedule).values(installmentsToInsert);
    }

    // All operations successful
    return NextResponse.json(
      {
        message: "Payment plan created successfully",
        paymentPlan: createdPaymentPlan,
      },
      { status: 201 }
    );

  } catch (error) {
    // --- Manual Rollback Logic for Partial Failures ---
    if (paymentPlanIdToDelete) {
      console.warn(`Attempting to rollback payment plan (ID: ${paymentPlanIdToDelete}) due to a subsequent error during creation.`);
      try {
        await db.delete(paymentPlan).where(eq(paymentPlan.id, paymentPlanIdToDelete));
        console.warn(`Successfully rolled back payment plan (ID: ${paymentPlanIdToDelete}).`);
      } catch (rollbackError) {
        console.error(`CRITICAL: Failed to rollback payment plan (ID: ${paymentPlanIdToDelete}). Data inconsistency possible!`, rollbackError);
      }
    }

    // --- Error Response Handling ---
    if (error instanceof z.ZodError) {
      console.error("Validation error during payment plan creation:", error.issues);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === "Pledge not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("Failed to create payment plan record")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const pgError = error as any;
      if (pgError.code) {
          switch (pgError.code) {
              case '23502': // NOT NULL violation
                  console.error("PostgreSQL NOT NULL constraint violation:", pgError.detail || pgError.message);
                  return NextResponse.json(
                      { error: "Required data is missing or invalid (database constraint violation).", detail: pgError.detail || pgError.message },
                      { status: 400 }
                  );
              case '23503': // Foreign key violation
                  console.error("PostgreSQL Foreign Key constraint violation:", pgError.detail || pgError.message);
                  return NextResponse.json(
                      { error: "Associated record not found (foreign key violation).", detail: pgError.detail || pgError.message },
                      { status: 400 }
                  );
              case '23505': // Unique constraint violation
                  console.error("PostgreSQL Unique constraint violation:", pgError.detail || pgError.message);
                  return NextResponse.json(
                      { error: "Duplicate data entry (unique constraint violation).", detail: pgError.detail || pgError.message },
                      { status: 409 }
                  );
              default:
                  console.error(`Unhandled PostgreSQL error (Code: ${pgError.code}):`, pgError.message, pgError.detail);
                  return NextResponse.json(
                      { error: "A database error occurred.", message: pgError.message },
                      { status: 500 }
                  );
          }
      }
    }

    console.error("Unhandled general error creating payment plan:", error);
    return ErrorHandler.handle(error);
  }
}

// --- GET Endpoint (unchanged) ---
const querySchema = z.object({
  pledgeId: z.coerce.number().positive().optional(),
  contactId: z.coerce.number().positive().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  planStatus: z
    .enum(["active", "completed", "cancelled", "paused", "overdue"])
    .optional(),
  frequency: z
    .enum([
      "weekly",
      "monthly",
      "quarterly",
      "biannual",
      "annual",
      "one_time",
      "custom",
    ])
    .optional(),
  distributionType: z.enum(["fixed", "custom"]).optional(),
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
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      planStatus: searchParams.get("planStatus") ?? undefined,
      frequency: searchParams.get("frequency") ?? undefined,
      distributionType: searchParams.get("distributionType") ?? undefined,
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

    const { pledgeId, contactId, page, limit, planStatus, frequency, distributionType } =
      parsedParams.data;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (pledgeId) {
      conditions.push(eq(paymentPlan.pledgeId, pledgeId));
    }

    if (contactId) {
      conditions.push(
        sql`${paymentPlan.pledgeId} IN (SELECT id FROM ${pledge} WHERE contact_id = ${contactId})`
      );
    }

    if (planStatus) {
      conditions.push(eq(paymentPlan.planStatus, planStatus));
    }

    if (frequency) {
      conditions.push(eq(paymentPlan.frequency, frequency));
    }

    if (distributionType) {
      conditions.push(eq(paymentPlan.distributionType, distributionType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const paymentPlansQuery = db
      .select({
        id: paymentPlan.id,
        pledgeId: paymentPlan.pledgeId,
        planName: paymentPlan.planName,
        frequency: paymentPlan.frequency,
        distributionType: paymentPlan.distributionType,
        totalPlannedAmount: paymentPlan.totalPlannedAmount,
        currency: paymentPlan.currency,
        installmentAmount: paymentPlan.installmentAmount,
        numberOfInstallments: paymentPlan.numberOfInstallments,
        startDate: paymentPlan.startDate,
        endDate: paymentPlan.endDate,
        nextPaymentDate: paymentPlan.nextPaymentDate,
        installmentsPaid: paymentPlan.installmentsPaid,
        totalPaid: paymentPlan.totalPaid,
        totalPaidUsd: paymentPlan.totalPaidUsd,
        remainingAmount: paymentPlan.remainingAmount,
        planStatus: paymentPlan.planStatus,
        autoRenew: paymentPlan.autoRenew,
        isActive: paymentPlan.isActive,
        notes: paymentPlan.notes,
        internalNotes: paymentPlan.internalNotes,
        createdAt: paymentPlan.createdAt,
        updatedAt: paymentPlan.updatedAt,
        exchangeRate: sql<string>`(
          SELECT exchange_rate FROM ${pledge} WHERE id = ${paymentPlan.pledgeId}
        )`.as("exchangeRate"),
        pledgeDescription: sql<string>`(
          SELECT description FROM ${pledge} WHERE id = ${paymentPlan.pledgeId}
        )`.as("pledgeDescription"),
        pledgeOriginalAmount: sql<string>`(
          SELECT original_amount FROM ${pledge} WHERE id = ${paymentPlan.pledgeId}
        )`.as("pledgeOriginalAmount"),
        contactId: sql<number>`(
          SELECT contact_id FROM ${pledge} WHERE id = ${paymentPlan.pledgeId}
        )`.as("contactId"),
      })
      .from(paymentPlan)
      .where(whereClause)
      .orderBy(sql`${paymentPlan.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(paymentPlan)
      .where(whereClause);

    const [paymentPlans, totalCountResult] = await Promise.all([
      paymentPlansQuery.execute(),
      countQuery.execute(),
    ]);

    const totalCount = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      paymentPlans,
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
        planStatus,
        frequency,
        distributionType,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "X-Total-Count": response.pagination.totalCount.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching payment plans:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch payment plans",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}