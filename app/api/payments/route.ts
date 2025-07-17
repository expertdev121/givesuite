/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import {
  paymentPlan,
  pledge,
  installmentSchedule,
  payment,
  type PaymentPlan,
  paymentMethodEnum, // Import the pgEnum for paymentMethod
  paymentStatusEnum, // Import the pgEnum for paymentStatus
  receiptTypeEnum, // Import the pgEnum for receiptType
  currencyEnum, // Import the pgEnum for currency
} from "@/lib/db/schema";
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

// Your existing Zod schemas for PATCH (not directly relevant to GET error but included for context)
const installmentSchema = z.object({
  date: z.string().min(1, "Installment date is required"),
  amount: z.string().refine((val) => { // Changed to string based on Drizzle 'numeric'
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
  }, "Installment amount must be a positive number string"),
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
  distributionType: z.enum(["fixed", "custom"]).optional(),
  totalPlannedAmount: z
    .string() // Changed to string based on Drizzle 'numeric'
    .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
    }, "Total planned amount must be a positive number string")
    .optional(),
  currency: z
    .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
    .optional(),
  installmentAmount: z
    .string() // Changed to string based on Drizzle 'numeric'
    .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
    }, "Installment amount must be a positive number string")
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

    const dataToUpdate: Partial<PaymentPlan> = {
      updatedAt: new Date(),
      ...(validatedData.planName !== undefined && { planName: validatedData.planName }),
      ...(validatedData.frequency !== undefined && { frequency: validatedData.frequency }),
      ...(validatedData.distributionType !== undefined && { distributionType: validatedData.distributionType }),
      // Ensure these are passed as strings if they come from validatedData as strings
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
        if (!validatedData.customInstallments) {
          return NextResponse.json(
            { error: "Custom installments required when changing to custom distribution" },
            { status: 400 }
          );
        }
        await db.delete(installmentSchedule).where(eq(installmentSchedule.paymentPlanId, planId));

        await db.insert(installmentSchedule).values(
          validatedData.customInstallments.map(inst => ({
            paymentPlanId: planId,
            installmentDate: inst.date,
            installmentAmount: inst.amount, // Now inst.amount is already a string from Zod
            currency: validatedData.currency || existingPlan.currency,
            notes: inst.notes || null,
          }))
        );
      } else if (validatedData.distributionType === "fixed") {
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

// ******************************************************************************
// **** IMPORTANT FIX: Define missing constants for Zod enums ****
// ******************************************************************************
// Use the enumValues from the imported pgEnums directly
const supportedCurrencies = currencyEnum.enumValues;
const paymentMethodValues = paymentMethodEnum.enumValues;
const receiptTypeValues = receiptTypeEnum.enumValues;
const paymentStatusValues = paymentStatusEnum.enumValues;
// ******************************************************************************

// Define the main payment schema for the backend POST request
const paymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(supportedCurrencies),
  exchangeRate: z.number().min(0),
  paymentDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: "Invalid date format",
  }),
  receivedDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: "Invalid date format",
  }).optional().nullable(),
  paymentMethod: z.enum(paymentMethodValues),
  methodDetail: z.enum([
    "achisomoch",
    "authorize",
    "bank_of_america_charitable",
    "banquest",
    "banquest_cm",
    "benevity",
    "chai_charitable",
    "charityvest_inc",
    "cjp",
    "donors_fund",
    "earthport",
    "e_transfer",
    "facts",
    "fidelity",
    "fjc",
    "foundation",
    "goldman_sachs",
    "htc",
    "jcf",
    "jcf_san_diego",
    "jgive",
    "keshet",
    "masa",
    "masa_old",
    "matach",
    "matching_funds",
    "mizrachi_canada",
    "mizrachi_olami",
    "montrose",
    "morgan_stanley_gift",
    "ms",
    "mt",
    "ojc",
    "paypal",
    "pelecard",
    "schwab_charitable",
    "stripe",
    "tiaa",
    "touro",
    "uktoremet",
    "vanguard_charitable",
    "venmo",
    "vmm",
    "wise",
    "worldline",
    "yaadpay",
    "yaadpay_cm",
    "yourcause",
    "yu",
    "zelle"
  ]).optional().nullable(), // This should ideally also come from a pgEnum if it exists
  paymentStatus: z.enum(paymentStatusValues),
  referenceNumber: z.string().optional().nullable(),
  checkNumber: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  receiptType: z.enum(receiptTypeValues).optional().nullable(),
  receiptIssued: z.boolean(),
  notes: z.string().optional().nullable(),
  solicitorId: z.preprocess((val) => { const num = parseInt(String(val), 10); return isNaN(num) ? null : num; }, z.number().positive().nullable()).optional(),
  bonusPercentage: z.number().min(0).max(100).optional().nullable(),
  bonusAmount: z.number().min(0).optional().nullable(),
  bonusRuleId: z.preprocess((val) => { const num = parseInt(String(val), 10); return isNaN(num) ? null : num; }, z.number().positive().nullable()).optional(),

  isSplitPayment: z.boolean(),

  pledgeId: z.preprocess((val) => { const num = parseInt(String(val), 10); return isNaN(num) ? null : num; }, z.number().positive().nullable()).optional(),
  paymentPlanId: z.preprocess((val) => { const num = parseInt(String(val), 10); return isNaN(num) ? null : num; }, z.number().positive().nullable()).optional(),
  installmentScheduleId: z.preprocess((val) => { const num = parseInt(String(val), 10); return isNaN(num) ? null : num; }, z.number().positive().nullable()).optional(),

  allocations: z.array(z.object({
    pledgeId: z.preprocess((val) => { const num = parseInt(String(val), 10); return isNaN(num) ? null : num; }, z.number().positive().nullable()),
    amount: z.number().positive(),
    installmentScheduleId: z.preprocess((val) => { const num = parseInt(String(val), 10); return isNaN(num) ? null : num; }, z.number().positive().nullable()).optional(),
    notes: z.string().optional().nullable(),
  })).optional(),
}).refine((data) => {
  if (data.isSplitPayment) {
    return data.allocations && data.allocations.length > 0;
  } else {
    return typeof data.pledgeId === 'number' && data.pledgeId !== null;
  }
}, {
  message: "Invalid payment request: missing pledgeId for single payment or allocations for split payment",
});

// Define a union type for Drizzle's returning() method results
type DrizzleReturn<T> = T[] | { rows: T[] };

// Type guard to check if the result is a query result object with a 'rows' property
function isQueryResultWithRows<T>(result: DrizzleReturn<T>): result is { rows: T[] } {
  return typeof result === 'object' && result !== null && 'rows' in result && Array.isArray(result.rows);
}

