import { db } from "@/lib/db";
import { paymentPlan } from "@/lib/db/schema";
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
