import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlan, pledge, installmentSchedule } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";

const installmentSchema = z.object({
  date: z.string().min(1, "Installment date is required"),
  amount: z.number().positive("Installment amount must be positive"),
  notes: z.string().optional(),
});

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
  totalPlannedAmount: z.number().positive("Total planned amount must be positive"),
  currency: z.enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"]),
  installmentAmount: z.number().positive("Installment amount must be positive"),
  numberOfInstallments: z.number().int().positive("Number of installments must be positive"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  autoRenew: z.boolean().default(false),
  planStatus: z.enum(["active", "completed", "cancelled", "paused", "overdue"]).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  customInstallments: z.array(installmentSchema).optional(),
});

export async function POST(request: NextRequest) {
  const transaction = await db.transaction(async (tx) => {
    try {
      const body = await request.json();
      const validatedData = paymentPlanSchema.parse(body);

      // Validate custom installment data if distribution type is custom
      if (validatedData.distributionType === "custom") {
        if (!validatedData.customInstallments || validatedData.customInstallments.length === 0) {
          return NextResponse.json(
            { error: "Validation failed", details: [{ field: "customInstallments", message: "Custom installments must be provided for 'custom' distribution type." }] },
            { status: 400 }
          );
        }

        const totalCustomAmount = validatedData.customInstallments.reduce((sum, installment) => sum + installment.amount, 0);
        if (totalCustomAmount !== validatedData.totalPlannedAmount) {
          return NextResponse.json(
            { error: "Validation failed", details: [{ field: "totalPlannedAmount", message: "Sum of custom installments must equal the total planned amount." }] },
            { status: 400 }
          );
        }
      }

      const currentPledge = await tx
        .select()
        .from(pledge)
        .where(eq(pledge.id, validatedData.pledgeId))
        .limit(1);

      if (currentPledge.length === 0) {
        return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
      }

      const newPaymentPlan = {
        pledgeId: validatedData.pledgeId,
        planName: validatedData.planName || null,
        frequency: validatedData.frequency,
        distributionType: validatedData.distributionType,
        totalPlannedAmount: validatedData.totalPlannedAmount.toString(),
        currency: validatedData.currency,
        installmentAmount: validatedData.installmentAmount.toString(),
        numberOfInstallments: validatedData.numberOfInstallments,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate || null,
        nextPaymentDate: validatedData.nextPaymentDate || validatedData.startDate,
        remainingAmount: validatedData.totalPlannedAmount.toString(),
        planStatus: "active" as const,
        autoRenew: validatedData.autoRenew,
        remindersSent: 0,
        lastReminderDate: null,
        isActive: true,
        notes: validatedData.notes || null,
        internalNotes: validatedData.internalNotes || null,
      };

      // Create the payment plan
      const paymentPlanResult = await tx
        .insert(paymentPlan)
        .values(newPaymentPlan)
        .returning();

      if (paymentPlanResult.length === 0) {
        return NextResponse.json(
          { error: "Failed to create payment plan" },
          { status: 500 }
        );
      }
      
      const createdPaymentPlan = paymentPlanResult[0];

      // If distribution is custom, create installment schedule entries
      if (validatedData.distributionType === "custom" && validatedData.customInstallments) {
        const installmentsToInsert = validatedData.customInstallments.map((inst) => ({
          paymentPlanId: createdPaymentPlan.id,
          installmentDate: inst.date,
          installmentAmount: inst.amount.toString(),
          currency: createdPaymentPlan.currency,
          notes: inst.notes || null,
        }));

        await tx.insert(installmentSchedule).values(installmentsToInsert);
      }

      return NextResponse.json(
        {
          message: "Payment plan created successfully",
          paymentPlan: createdPaymentPlan,
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

      console.error("Error creating payment plan:", error);
      return ErrorHandler.handle(error);
    }
  });

  return transaction;
}

const querySchema = z.object({
  pledgeId: z.number().positive().optional(),
  contactId: z.number().positive().optional(),
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
        // Add exchange rate from pledge table
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