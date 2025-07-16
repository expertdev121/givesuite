/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { paymentPlan, pledge, installmentSchedule ,type PaymentPlan } from "@/lib/db/schema";
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
  distributionType: z.enum(["fixed", "custom"]).optional(),
  totalPlannedAmount: z
    .number()
    .positive("Total planned amount must be positive")
    .optional(),
  currency: z
    .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
    .optional(),
  installmentAmount: z
    .number()
    .positive("Installment amount must be positive")
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
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const pledgeId = parseInt(params.id, 10);
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
          amount: parseFloat(schedule.installmentAmount),
          notes: schedule.notes || "",
          isPaid: schedule.isPaid,
          paidDate: schedule.paidDate,
          paidAmount: schedule.paidAmount ? parseFloat(schedule.paidAmount) : null,
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
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const planId = parseInt(params.id, 10);
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

    const updateData: Partial<PaymentPlan> = {
      updatedAt: new Date(),
    };

    // Apply validated fields
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined && key !== "customInstallments") {
        updateData[key as keyof PaymentPlan] = value;
      }
    });

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
            installmentAmount: inst.amount.toString(),
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
      .set(updateData)
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