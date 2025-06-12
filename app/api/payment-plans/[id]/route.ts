/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { paymentPlan } from "@/lib/db/schema";
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
  pledgeId: z.number().positive(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  planStatus: PlanStatusEnum.optional(),
});

type QueryParams = z.infer<typeof QueryParamsSchema>;

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
  planStatus: z
    .enum(["active", "completed", "cancelled", "paused", "overdue"])
    .optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
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
      planStatus: searchParams.get("planStatus") || undefined,
    });

    const { pledgeId, page, limit, search, planStatus } = queryParams;

    let query = db
      .select({
        id: paymentPlan.id,
        planName: paymentPlan.planName,
        frequency: paymentPlan.frequency,
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
      query = query.where(and(...conditions));
    }

    const offset = (page - 1) * limit;
    query = query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(paymentPlan.createdAt));

    const paymentPlans = await query;

    return NextResponse.json(
      { paymentPlans },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch payment plans" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId) || planId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment plan ID" },
        { status: 400 }
      );
    }

    // Check if payment plan exists
    const existingPlan = await db
      .select()
      .from(paymentPlan)
      .where(eq(paymentPlan.id, planId))
      .limit(1);

    if (existingPlan.length === 0) {
      return NextResponse.json(
        { error: "Payment plan not found" },
        { status: 404 }
      );
    }

    // Delete the payment plan
    await db.delete(paymentPlan).where(eq(paymentPlan.id, planId));

    return NextResponse.json({
      message: "Payment plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment plan:", error);
    return ErrorHandler.handle(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = parseInt(id);

    if (isNaN(planId) || planId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment plan ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePaymentPlanSchema.parse(body);

    // Check if payment plan exists
    const existingPlan = await db
      .select()
      .from(paymentPlan)
      .where(eq(paymentPlan.id, planId))
      .limit(1);

    if (existingPlan.length === 0) {
      return NextResponse.json(
        { error: "Payment plan not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    // Only include fields that were provided in the request
    if (validatedData.planName !== undefined) {
      updateData.planName = validatedData.planName || null;
    }
    if (validatedData.frequency !== undefined) {
      updateData.frequency = validatedData.frequency;
    }
    if (validatedData.totalPlannedAmount !== undefined) {
      updateData.totalPlannedAmount =
        validatedData.totalPlannedAmount.toString();
      // Recalculate remaining amount if total planned amount changes
      const currentPlan = existingPlan[0];
      const totalPaid = parseFloat(currentPlan.totalPaid || "0");
      updateData.remainingAmount = (
        validatedData.totalPlannedAmount - totalPaid
      ).toString();
    }
    if (validatedData.currency !== undefined) {
      updateData.currency = validatedData.currency;
    }
    if (validatedData.installmentAmount !== undefined) {
      updateData.installmentAmount = validatedData.installmentAmount.toString();
    }
    if (validatedData.numberOfInstallments !== undefined) {
      updateData.numberOfInstallments = validatedData.numberOfInstallments;
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
      // Update isActive based on plan status
      updateData.isActive = validatedData.planStatus === "active";
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes || null;
    }
    if (validatedData.internalNotes !== undefined) {
      updateData.internalNotes = validatedData.internalNotes || null;
    }

    // Update the payment plan
    const updatedPlan = await db
      .update(paymentPlan)
      .set(updateData)
      .where(eq(paymentPlan.id, planId))
      .returning();

    if (updatedPlan.length === 0) {
      return NextResponse.json(
        { error: "Failed to update payment plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Payment plan updated successfully",
      paymentPlan: updatedPlan[0],
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

    console.error("Error updating payment plan:", error);
    return ErrorHandler.handle(error);
  }
}
