/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { paymentPlan, pledge, installmentSchedule, type PaymentPlan } from "@/lib/db/schema"; // Added 'type PaymentPlan'
import { ErrorHandler } from "@/lib/error-handler";
import { eq, desc, or, ilike, and, SQL, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

// Zod schema for validating individual custom installments for PATCH
const installmentSchema = z.object({
  date: z.string().min(1, "Installment date is required"),
  // Expect number from incoming JSON, transform to string for DB
  amount: z.number().positive("Installment amount must be positive").transform((val) => val.toString()),
  notes: z.string().optional(),
});

// Updated schema for PATCH with conditional validation for custom installments
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
  distributionType: z.enum(["fixed", "custom"]).optional(),
  totalPlannedAmount: z
    .number() // Expect number from incoming JSON
    .positive("Total planned amount must be positive")
    .transform((val) => val.toString()) // Transform to string for DB
    .optional(),
  currency: z
    .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
    .optional(),
  installmentAmount: z
    .number() // Expect number from incoming JSON
    .positive("Installment amount must be positive")
    .transform((val) => val.toString()) // Transform to string for DB
    .optional(),
  numberOfInstallments: z
    .number()
    .int()
    .positive("Number of installments must be positive")
    .optional(),
  startDate: z.string().min(1, "Start date is required").optional(),
  endDate: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  autoRenew: z.boolean().optional(),
  planStatus: PlanStatusEnum.optional(),
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


type UpdatePaymentPlanRequest = z.infer<typeof updatePaymentPlanSchema>;


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // === AWAIT PARAMS TO GET THE ID ===
    const { id: pledgeIdString } = await params; // Destructure the id from the awaited params

    const pledgeId = parseInt(pledgeIdString, 10); // Parse the string ID to a number
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
        totalPlannedAmount: paymentPlan.totalPlannedAmount, // Will be string from DB
        currency: paymentPlan.currency,
        installmentAmount: paymentPlan.installmentAmount, // Will be string from DB
        numberOfInstallments: paymentPlan.numberOfInstallments,
        startDate: paymentPlan.startDate,
        endDate: paymentPlan.endDate,
        nextPaymentDate: paymentPlan.nextPaymentDate,
        installmentsPaid: paymentPlan.installmentsPaid,
        totalPaid: paymentPlan.totalPaid, // Will be string from DB
        totalPaidUsd: paymentPlan.totalPaidUsd, // Will be string from DB
        remainingAmount: paymentPlan.remainingAmount, // Will be string from DB
        planStatus: paymentPlan.planStatus,
        autoRenew: paymentPlan.autoRenew,
        remindersSent: paymentPlan.remindersSent,
        lastReminderDate: paymentPlan.lastReminderDate,
        isActive: paymentPlan.isActive,
        notes: paymentPlan.notes,
        internalNotes: paymentPlan.internalNotes,
        createdAt: paymentPlan.createdAt,
        updatedAt: paymentPlan.updatedAt,
        exchangeRate: paymentPlan.exchangeRate, // Will be string from DB
        pledgeExchangeRate: sql<string>`(SELECT ${pledge.exchangeRate} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeExchangeRate"),
        pledgeCurrency: sql<string>`(SELECT ${pledge.currency} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeCurrency"),
        originalAmountUsd: sql<string>`(SELECT ${pledge.originalAmountUsd} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("originalAmountUsd"),
        originalAmount: sql<string>`(SELECT ${pledge.originalAmount} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("originalAmount"),
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

    const paymentPlansWithInstallments = await Promise.all(
      paymentPlans.map(async (plan) => {
        if (plan.distributionType !== "custom") return plan;

        const installmentSchedules = await db
          .select()
          .from(installmentSchedule)
          .where(eq(installmentSchedule.paymentPlanId, plan.id))
          .orderBy(installmentSchedule.installmentDate);

        const customInstallments = installmentSchedules.map(schedule => ({
          date: schedule.installmentDate,
          amount: schedule.installmentAmount, // No parseFloat here, it's already a string from DB (numeric type)
          notes: schedule.notes || "",
          // Removed isPaid and paidAmount as they are not in the schema.
          // Use schedule.status === 'paid' if you need to check if it's paid.
          // Use schedule.paidDate if you need the date it was paid.
        }));

        return {
          ...plan,
          installmentSchedules,
          customInstallments,
        };
      })
    );

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(paymentPlan)
      .where(and(eq(paymentPlan.pledgeId, pledgeId), ...conditions));

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

export async function PATCH(
    request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planIdString } = await params; // Await params for PATCH as well
    const planId = parseInt(planIdString, 10);
    if (isNaN(planId) || planId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment plan ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    // Validate and transform incoming data using the updated schema
    const validatedData: UpdatePaymentPlanRequest = updatePaymentPlanSchema.parse(body);

    const [existingPlan] = await db
      .select()
      .from(paymentPlan)
      .where(eq(paymentPlan.id, planId))
      .limit(1);

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Payment plan not found" },
        { status: 404 }
      );
    }

    // --- Enhanced Validation for 'custom' distribution type ---
    if (validatedData.distributionType === "custom" && validatedData.customInstallments) {
      if (validatedData.customInstallments.length === 0) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "customInstallments", message: "Custom installments must be provided for 'custom' distribution type." }] },
          { status: 400 }
        );
      }

      // Validate that sum of custom installments equals total planned amount
      // Note: validatedData.totalPlannedAmount is already a string here due to transform
      const totalCustomAmount = validatedData.customInstallments.reduce((sum, installment) => sum + parseFloat(installment.amount), 0);
      const expectedTotalPlannedAmount = parseFloat(validatedData.totalPlannedAmount || existingPlan.totalPlannedAmount); // Use existing if not provided
      if (Math.abs(totalCustomAmount - expectedTotalPlannedAmount) > 0.01) { // Allow for small floating point differences
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "totalPlannedAmount", message: `Sum of custom installments (${totalCustomAmount}) must equal the total planned amount (${expectedTotalPlannedAmount}).` }] },
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
      const calculatedTotal = parseFloat(validatedData.installmentAmount) * validatedData.numberOfInstallments;
      const expectedTotalPlannedAmount = parseFloat(validatedData.totalPlannedAmount || existingPlan.totalPlannedAmount); // Use existing if not provided
      if (Math.abs(calculatedTotal - expectedTotalPlannedAmount) > 0.01) {
        return NextResponse.json(
          { error: "Validation failed", details: [{ field: "totalPlannedAmount", message: `Installment amount (${validatedData.installmentAmount}) × number of installments (${validatedData.numberOfInstallments}) = ${calculatedTotal} must equal total planned amount (${expectedTotalPlannedAmount}).` }] },
          { status: 400 }
        );
      }
    }

    const dataToUpdate: Partial<PaymentPlan> = {
      updatedAt: new Date(),
      ...(validatedData.planName !== undefined && { planName: validatedData.planName }),
      ...(validatedData.frequency !== undefined && { frequency: validatedData.frequency }),
      ...(validatedData.distributionType !== undefined && { distributionType: validatedData.distributionType }),
      // These are now correctly transformed to string by Zod's .transform()
      ...(validatedData.totalPlannedAmount !== undefined && { totalPlannedAmount: validatedData.totalPlannedAmount }),
      ...(validatedData.currency !== undefined && { currency: validatedData.currency }),
      ...(validatedData.installmentAmount !== undefined && { installmentAmount: validatedData.installmentAmount }),
      ...(validatedData.numberOfInstallments !== undefined && { numberOfInstallments: validatedData.numberOfInstallments }),
      ...(validatedData.startDate !== undefined && { startDate: validatedData.startDate }),
      ...(validatedData.endDate !== undefined && { endDate: validatedData.endDate }),
      ...(validatedData.nextPaymentDate !== undefined && { nextPaymentDate: validatedData.nextPaymentDate }),
      ...(validatedData.autoRenew !== undefined && { autoRenew: validatedData.autoRenew }),
      ...(validatedData.planStatus !== undefined && { planStatus: validatedData.planStatus }),
      ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      ...(validatedData.internalNotes !== undefined && { internalNotes: validatedData.internalNotes }),
    };

    // Handle distribution type changes
    if (validatedData.distributionType !== undefined) {
      if (validatedData.distributionType === "custom") {
        // If customInstallments are provided, delete existing and insert new ones
        if (validatedData.customInstallments) {
          await db.delete(installmentSchedule).where(eq(installmentSchedule.paymentPlanId, planId));

          await db.insert(installmentSchedule).values(
            validatedData.customInstallments.map(inst => ({
              paymentPlanId: planId,
              installmentDate: inst.date,
              installmentAmount: inst.amount, // inst.amount is already a string from Zod's transform
              currency: validatedData.currency || existingPlan.currency, // Use provided currency or existing
              notes: inst.notes || null,
            }))
          );
          // Also update numberOfInstallments for custom plans
          dataToUpdate.numberOfInstallments = validatedData.customInstallments.length;
        }
      } else if (validatedData.distributionType === "fixed") {
        // If changing to fixed, delete any existing custom installment schedules
        await db.delete(installmentSchedule).where(eq(installmentSchedule.paymentPlanId, planId));
      }
    }

    const [updatedPlan] = await db
      .update(paymentPlan)
      .set(dataToUpdate) // Use dataToUpdate here
      .where(eq(paymentPlan.id, planId))
      .returning();

    return NextResponse.json({
      message: "Payment plan updated successfully",
      paymentPlan: updatedPlan,
    });

  } catch (error) {
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
    return ErrorHandler.handle(error);
  }
}

// --- GET Endpoint (unchanged from your original, but included for completeness) ---
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
