import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";
import { paymentPlan, NewPaymentPlan } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const paymentPlanSchema = z
  .object({
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
    totalPlannedAmount: z
      .number()
      .positive("Total planned amount must be positive"),
    currency: z
      .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
      .default("USD"),
    installmentAmount: z
      .number()
      .positive("Installment amount must be positive"),
    numberOfInstallments: z
      .number()
      .int()
      .positive("Number of installments must be positive"),
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()).optional(),
    nextPaymentDate: z.string().datetime().or(z.date()).optional(),
    installmentsPaid: z
      .number()
      .int()
      .min(0, "Installments paid cannot be negative")
      .default(0),
    totalPaid: z.number().min(0, "Total paid cannot be negative").default(0),
    totalPaidUsd: z
      .number()
      .min(0, "Total paid in USD cannot be negative")
      .optional(),
    remainingAmount: z.number().min(0, "Remaining amount cannot be negative"),
    planStatus: z
      .enum(["active", "completed", "cancelled", "paused", "overdue"])
      .default("active"),
    autoRenew: z.boolean().default(false),
    remindersSent: z
      .number()
      .int()
      .min(0, "Reminders sent cannot be negative")
      .default(0),
    lastReminderDate: z.string().datetime().or(z.date()).optional(),
    isActive: z.boolean().default(true),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end > start;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) =>
      data.totalPlannedAmount ===
      data.installmentAmount * data.numberOfInstallments,
    {
      message:
        "Total planned amount must equal installment amount multiplied by number of installments",
      path: ["totalPlannedAmount"],
    }
  )
  .refine(
    (data) => data.remainingAmount === data.totalPlannedAmount - data.totalPaid,
    {
      message:
        "Remaining amount must equal total planned amount minus total paid",
      path: ["remainingAmount"],
    }
  )
  .refine(
    (data) => {
      if (data.totalPaidUsd && data.totalPaid && data.currency === "USD") {
        return Math.abs(data.totalPaidUsd - data.totalPaid) < 0.01;
      }
      return true;
    },
    {
      message: "Total paid in USD must equal total paid when currency is USD",
      path: ["totalPaidUsd"],
    }
  );

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = paymentPlanSchema.parse(body);

    const existingPlan = await db
      .select()
      .from(paymentPlan)
      .where(
        and(
          eq(paymentPlan.pledgeId, validatedData.pledgeId),
          eq(paymentPlan.planName, validatedData.planName || ""),
          eq(paymentPlan.isActive, true),
          eq(paymentPlan.planStatus, "active")
        )
      )
      .limit(1);

    if (existingPlan.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate payment plan",
          message: `Active payment plan '${
            validatedData.planName || "unnamed"
          }' for pledge ${validatedData.pledgeId} already exists`,
        },
        { status: 409 }
      );
    }

    const newPaymentPlan: NewPaymentPlan = {
      ...validatedData,
      startDate: new Date(validatedData.startDate).toISOString().split("T")[0],
      endDate: validatedData.endDate
        ? new Date(validatedData.endDate).toISOString().split("T")[0]
        : undefined,
      nextPaymentDate: validatedData.nextPaymentDate
        ? new Date(validatedData.nextPaymentDate).toISOString().split("T")[0]
        : undefined,
      lastReminderDate: validatedData.lastReminderDate
        ? new Date(validatedData.lastReminderDate).toISOString().split("T")[0]
        : undefined,
      totalPlannedAmount: validatedData.totalPlannedAmount.toFixed(2),
      installmentAmount: validatedData.installmentAmount.toFixed(2),
      totalPaid: validatedData.totalPaid.toFixed(2),
      remainingAmount: validatedData.remainingAmount.toFixed(2),
      totalPaidUsd: validatedData.totalPaidUsd
        ? validatedData.totalPaidUsd.toFixed(2)
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .insert(paymentPlan)
      .values(newPaymentPlan)
      .returning();

    return NextResponse.json(
      {
        message: "Payment plan created successfully",
        paymentPlan: result[0],
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

    return ErrorHandler.handle(error);
  }
}
