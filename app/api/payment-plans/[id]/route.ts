/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { paymentPlan, pledge, installmentSchedule } from "@/lib/db/schema"; // Ensure installmentSchedule is imported
import { ErrorHandler } from "@/lib/error-handler";
import { eq, desc, or, ilike, and, SQL, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Import the specific types from your schema file for clarity and safety
import { PaymentPlan, NewPaymentPlan } from "@/lib/db/schema";

const PlanStatusEnum = z.enum([
  "active",
  "completed",
  "cancelled",
  "paused",
  "overdue",
]);

const QueryParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  planStatus: PlanStatusEnum.optional(),
});

type QueryParams = z.infer<typeof QueryParamsSchema>;

// Zod schema for validating individual custom installments (re-used from POST)
const installmentSchema = z.object({
  date: z.string().min(1, "Installment date is required"),
  amount: z.number().positive("Installment amount must be positive"),
  notes: z.string().optional(),
});

const updatePaymentPlanSchema = z.object({
  planName: z.string().optional(),
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
  distributionType: z.enum(["fixed", "custom"]).optional(), // Added distributionType to PATCH schema
  totalPlannedAmount: z
    .number()
    .positive("Total planned amount must be positive")
    .optional(),
  currency: z
    .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
    .optional(),
  installmentAmount: z // Still optional for custom, but might be required if switching to fixed
    .number()
    .positive("Installment amount must be positive")
    .optional(),
  numberOfInstallments: z // Still optional for custom, but might be required if switching to fixed
    .number()
    .int()
    .positive("Number of installments must be positive")
    .optional(),
  startDate: z.string().min(1, "Start date is required").optional(),
  endDate: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  autoRenew: z.boolean().optional(),
  planStatus: z
    .enum(["active", "completed", "cancelled", "paused", "overdue"])
    .optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  // Add customInstallments for when distributionType is 'custom' or being changed to 'custom'
  customInstallments: z.array(installmentSchema).optional(),
});

type UpdatePaymentPlanRequest = z.infer<typeof updatePaymentPlanSchema>;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pledgeId: string }> }
) {
  try {
    const params = await context.params;
    const pledgeId = parseInt(params.pledgeId, 10);
    if (isNaN(pledgeId) || pledgeId <= 0) {
      return NextResponse.json(
        { error: "Invalid Pledge ID provided in URL" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    const queryParams: QueryParams = QueryParamsSchema.parse({
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "10", 10),
      search: searchParams.get("search") || undefined,
      planStatus: searchParams.get("planStatus") || undefined,
    });

    const { page, limit, search, planStatus } = queryParams;

    let baseQuery = db
      .select({
        id: paymentPlan.id,
        planName: paymentPlan.planName,
        pledgeId: paymentPlan.pledgeId,
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
        remindersSent: paymentPlan.remindersSent,
        lastReminderDate: paymentPlan.lastReminderDate,
        isActive: paymentPlan.isActive,
        notes: paymentPlan.notes,
        internalNotes: paymentPlan.internalNotes,
        createdAt: paymentPlan.createdAt,
        updatedAt: paymentPlan.updatedAt,
        exchangeRate: paymentPlan.exchangeRate,
        pledgeExchangeRate: sql<string>`(SELECT ${pledge.exchangeRate} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeExchangeRate"),
        pledgeCurrency: sql<string>`(SELECT ${pledge.currency} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeCurrency"),
        originalAmountUsd: sql<string>`(SELECT ${pledge.originalAmountUsd} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("originalAmountUsd"),
        originalAmount: sql<string>`(SELECT ${pledge.originalAmount} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("originalAmount"),
        // Add pledge contact information
        pledgeContact: sql<string>`(SELECT CONCAT(c.first_name, ' ', c.last_name) FROM ${pledge} p JOIN contact c ON p.contact_id = c.id WHERE p.id = ${paymentPlan.pledgeId})`.as("pledgeContact"),
        pledgeDescription: sql<string>`(SELECT ${pledge.description} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeDescription"),
      })
      .from(paymentPlan)
      .where(eq(paymentPlan.pledgeId, pledgeId))
      .$dynamic();

    const conditions: SQL<unknown>[] = [];

    if (planStatus) {
      conditions.push(eq(paymentPlan.planStatus, planStatus));
    }

    if (search) {
      const searchConditions: SQL<unknown>[] = [];
      searchConditions.push(
        ilike(sql`COALESCE(${paymentPlan.planName}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${paymentPlan.notes}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${paymentPlan.internalNotes}, '')`, `%${search}%`)
      );
      conditions.push(or(...searchConditions)!);
    }

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    const offset = (page - 1) * limit;
    const paymentPlans = await baseQuery
      .limit(limit)
      .offset(offset)
      .orderBy(desc(paymentPlan.createdAt));

    // Fetch installment schedules for custom distribution plans
    const paymentPlansWithInstallments = await Promise.all(
      paymentPlans.map(async (plan) => {
        let installmentSchedules: any[] = [];
        let customInstallments: any[] = [];

        // Fetch installment schedules if distribution type is custom
        if (plan.distributionType === "custom") {
          installmentSchedules = await db
            .select({
              id: installmentSchedule.id,
              paymentPlanId: installmentSchedule.paymentPlanId,
              installmentDate: installmentSchedule.installmentDate,
              installmentAmount: installmentSchedule.installmentAmount,
              currency: installmentSchedule.currency,
              notes: installmentSchedule.notes,
              isPaid: installmentSchedule.isPaid,
              paidDate: installmentSchedule.paidDate,
              paidAmount: installmentSchedule.paidAmount,
              createdAt: installmentSchedule.createdAt,
              updatedAt: installmentSchedule.updatedAt,
            })
            .from(installmentSchedule)
            .where(eq(installmentSchedule.paymentPlanId, plan.id))
            .orderBy(installmentSchedule.installmentDate);

          // Transform installment schedules to the format expected by the form
          customInstallments = installmentSchedules.map(schedule => ({
            date: schedule.installmentDate,
            amount: parseFloat(schedule.installmentAmount),
            notes: schedule.notes || "",
            isPaid: schedule.isPaid,
            paidDate: schedule.paidDate,
            paidAmount: schedule.paidAmount ? parseFloat(schedule.paidAmount) : null,
          }));
        }

        return {
          ...plan,
          ...(installmentSchedules.length > 0 && {
            installmentSchedules,
            customInstallments,
          }),
        };
      })
    );

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(paymentPlan)
      .where(and(eq(paymentPlan.pledgeId, pledgeId), ...(conditions.length > 0 ? conditions : [])));

    const totalCountResult = await countQuery;
    const totalCount = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json(
      {
        paymentPlans: paymentPlansWithInstallments,
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
          search,
          planStatus,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Total-Count": totalCount.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching payment plans:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }
    return ErrorHandler.handle(error);
  }
}

/**
 * PATCH handler for updating a specific payment plan by its ID.
 * This now handles changes to `distributionType` and associated installment schedules.
 * Route: /api/payment-plans/[id] (where [id] is paymentPlan.id)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let paymentPlanIdForRollback: number | null = null; // To store ID in case of partial update failure
  try {
    const params = await context.params;
    const planId = parseInt(params.id, 10);
    if (isNaN(planId) || planId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment plan ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData: UpdatePaymentPlanRequest = updatePaymentPlanSchema.parse(body);

    // Get current payment plan details to compare distributionType
    const existingPlanArray = await db
      .select()
      .from(paymentPlan)
      .where(eq(paymentPlan.id, planId))
      .limit(1);

    if (existingPlanArray.length === 0) {
      return NextResponse.json(
        { error: "Payment plan not found" },
        { status: 404 }
      );
    }

    const existingPlan = existingPlanArray[0];
    paymentPlanIdForRollback = existingPlan.id; // Store for potential rollback

    // --- Prepare updateData for paymentPlan table ---
    const updateData: Partial<NewPaymentPlan> = {
      updatedAt: new Date(),
    };

    // Apply all validated fields
    if (validatedData.planName !== undefined) {
      updateData.planName = validatedData.planName || null;
    }
    if (validatedData.frequency !== undefined) {
      updateData.frequency = validatedData.frequency;
    }
    if (validatedData.totalPlannedAmount !== undefined) {
      updateData.totalPlannedAmount = validatedData.totalPlannedAmount.toString();
      const totalPaid = parseFloat(existingPlan.totalPaid || "0");
      updateData.remainingAmount = (
        validatedData.totalPlannedAmount - totalPaid
      ).toString();
    }
    if (validatedData.currency !== undefined) {
      updateData.currency = validatedData.currency;
    }
    if (validatedData.startDate !== undefined) {
      updateData.startDate = validatedData.startDate;
    }
    if (validatedData.endDate !== undefined) {
      updateData.endDate = validatedData.endDate || null;
    }
    if (validatedData.nextPaymentDate !== undefined) {
      updateData.nextPaymentDate = validatedData.nextPaymentDate || null;
    }
    if (validatedData.autoRenew !== undefined) {
      updateData.autoRenew = validatedData.autoRenew;
    }
    if (validatedData.planStatus !== undefined) {
      updateData.planStatus = validatedData.planStatus;
      updateData.isActive = validatedData.planStatus === "active";
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes || null;
    }
    if (validatedData.internalNotes !== undefined) {
      updateData.internalNotes = validatedData.internalNotes || null;
    }

    // --- Handle distributionType change and installment schedules ---
    const oldDistributionType = existingPlan.distributionType;
    const newDistributionType = validatedData.distributionType;

    if (newDistributionType !== undefined && newDistributionType !== oldDistributionType) {
      // Distribution type is changing or explicitly set
      updateData.distributionType = newDistributionType;

      if (newDistributionType === "custom") {
        // Transition to CUSTOM:
        // 1. Validate customInstallments
        if (!validatedData.customInstallments || validatedData.customInstallments.length === 0) {
          return NextResponse.json(
            { error: "Validation failed", details: [{ field: "customInstallments", message: "Custom installments must be provided when setting distribution type to 'custom'." }] },
            { status: 400 }
          );
        }
        const totalCustomAmount = validatedData.customInstallments.reduce((sum, installment) => sum + installment.amount, 0);
        if (validatedData.totalPlannedAmount && totalCustomAmount !== validatedData.totalPlannedAmount) {
          return NextResponse.json(
            { error: "Validation failed", details: [{ field: "totalPlannedAmount", message: "Sum of custom installments must equal the total planned amount." }] },
            { status: 400 }
          );
        }
        // 2. Delete existing installment schedules (if any, from old 'custom' or even 'fixed' if previous data was messy)
        await db.delete(installmentSchedule).where(eq(installmentSchedule.paymentPlanId, planId));

        // 3. Insert new custom installments
        const installmentsToInsert = validatedData.customInstallments.map((inst) => ({
          paymentPlanId: planId,
          installmentDate: inst.date,
          installmentAmount: inst.amount.toString(),
          currency: validatedData.currency || existingPlan.currency, // Use new currency if provided, else old
          notes: inst.notes || null,
        }));
        await db.insert(installmentSchedule).values(installmentsToInsert);

        // Set numberOfInstallments based on the count of custom installments
        updateData.numberOfInstallments = validatedData.customInstallments.length;
      } else if (newDistributionType === "fixed") {
        // Transition to FIXED:
        // 1. Delete all existing custom installment schedules for this plan
        await db.delete(installmentSchedule).where(eq(installmentSchedule.paymentPlanId, planId));

        // 2. Ensure installmentAmount and numberOfInstallments are provided for fixed
        if (validatedData.installmentAmount === undefined || validatedData.numberOfInstallments === undefined) {
          return NextResponse.json(
            { error: "Validation failed", details: [{ field: "installmentAmount/numberOfInstallments", message: "Installment amount and number of installments are required for 'fixed' distribution type." }] },
            { status: 400 }
          );
        }
        updateData.installmentAmount = validatedData.installmentAmount.toString();
        updateData.numberOfInstallments = validatedData.numberOfInstallments;
      }
    } else if (newDistributionType === "custom" && oldDistributionType === "custom" && validatedData.customInstallments) {
      // Distribution type remains CUSTOM, but customInstallments are provided for an update
      // This is a replacement of the custom schedule.
      // 1. Delete existing installment schedules
      await db.delete(installmentSchedule).where(eq(installmentSchedule.paymentPlanId, planId));

      // 2. Insert new custom installments
      const installmentsToInsert = validatedData.customInstallments.map((inst) => ({
        paymentPlanId: planId,
        installmentDate: inst.date,
        installmentAmount: inst.amount.toString(),
        currency: validatedData.currency || existingPlan.currency, // Use new currency if provided, else old
        notes: inst.notes || null,
      }));
      await db.insert(installmentSchedule).values(installmentsToInsert);

      // Set numberOfInstallments based on the count of custom installments
      updateData.numberOfInstallments = validatedData.customInstallments.length;

      // Validate custom installment total if totalPlannedAmount is provided
      const totalCustomAmount = validatedData.customInstallments.reduce((sum, installment) => sum + installment.amount, 0);
      if (validatedData.totalPlannedAmount && totalCustomAmount !== validatedData.totalPlannedAmount) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "totalPlannedAmount", message: "Sum of custom installments must equal the total planned amount." }] },
          { status: 400 }
        );
      }
    } else {
      // No change in distributionType OR distributionType is not provided OR it's fixed and no customInstallments.
      // If distributionType is not provided in PATCH, it means it doesn't change.
      // If it's fixed and installmentAmount/numberOfInstallments are provided, update them.
      if (validatedData.installmentAmount !== undefined) {
        updateData.installmentAmount = validatedData.installmentAmount.toString();
      }
      if (validatedData.numberOfInstallments !== undefined) {
        updateData.numberOfInstallments = validatedData.numberOfInstallments;
      }
      // Ensure customInstallments are not provided if type is fixed
      if (validatedData.customInstallments && existingPlan.distributionType === "fixed") {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "customInstallments", message: "Custom installments cannot be provided for 'fixed' distribution type unless the distributionType is also being changed to 'custom'." }] },
          { status: 400 }
        );
      }
    }

    // --- Perform the main paymentPlan update ---
    const updatedPlanResult = await db
      .update(paymentPlan)
      .set(updateData)
      .where(eq(paymentPlan.id, planId))
      .returning();

    if (updatedPlanResult.length === 0) {
      throw new Error("Failed to update payment plan record. No record returned.");
    }

    const updatedPaymentPlan = updatedPlanResult[0];

    return NextResponse.json({
      message: "Payment plan updated successfully",
      paymentPlan: updatedPaymentPlan,
    });

  } catch (error) {
    // --- Manual Rollback Logic for Partial Failures ---
    // If the payment plan update succeeded but installment insertion failed,
    // we might want to revert the payment plan update too (or just delete installments).
    console.error("Error updating payment plan:", error);

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
    // Handle database errors specifically if needed (e.g., foreign key, not null)
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
    return ErrorHandler.handle(error);
  }
}