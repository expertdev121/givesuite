/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { paymentPlan, pledge, installmentSchedule, type PaymentPlan } from "@/lib/db/schema";
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

// Updated schema for PATCH with better validation
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
  customInstallments: z.array(z.object({
    date: z.string().min(1, "Installment date is required"),
    amount: z.number().positive("Installment amount must be positive"),
    notes: z.string().optional(),
  })).optional(),
  paymentMethod: z.string().optional(),
  methodDetail: z.string().optional(),
}).refine((data) => {
  if (data.distributionType === "fixed") {
    return data.installmentAmount !== undefined && data.numberOfInstallments !== undefined;
  }
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
    const { id: paymentPlanIdString } = await params;
    const paymentPlanId = parseInt(paymentPlanIdString, 10);
    
    if (isNaN(paymentPlanId) || paymentPlanId <= 0) {
      return NextResponse.json(
        { error: "Invalid Payment Plan ID provided in URL" },
        { status: 400 }
      );
    }

    const paymentPlanResult = await db
      .select({
        // Payment Plan fields
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
        
        // Pledge related fields
        pledgeOriginalAmount: sql<string>`(SELECT ${pledge.originalAmount} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeOriginalAmount"),
        pledgeOriginalAmountUsd: sql<string>`(SELECT ${pledge.originalAmountUsd} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeOriginalAmountUsd"),
        pledgeCurrency: sql<string>`(SELECT ${pledge.currency} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeCurrency"),
        pledgeDescription: sql<string>`(SELECT ${pledge.description} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeDescription"),
        pledgeExchangeRate: sql<string>`(SELECT ${pledge.exchangeRate} FROM ${pledge} WHERE ${pledge.id} = ${paymentPlan.pledgeId})`.as("pledgeExchangeRate"),
        pledgeContact: sql<string>`(SELECT CONCAT(c.first_name, ' ', c.last_name) FROM ${pledge} p JOIN contact c ON p.contact_id = c.id WHERE p.id = ${paymentPlan.pledgeId})`.as("pledgeContact"),
      })
      .from(paymentPlan)
      .where(eq(paymentPlan.id, paymentPlanId))
      .limit(1);

    if (!paymentPlanResult.length) {
      return NextResponse.json(
        { error: "Payment plan not found" },
        { status: 404 }
      );
    }

    const plan = paymentPlanResult[0];

    let customInstallments = undefined;
    if (plan.distributionType === "custom") {
      const installmentSchedules = await db
        .select({
          id: installmentSchedule.id,
          installmentDate: installmentSchedule.installmentDate,
          installmentAmount: installmentSchedule.installmentAmount,
          notes: installmentSchedule.notes,
          status: installmentSchedule.status,
          paidDate: installmentSchedule.paidDate,
        })
        .from(installmentSchedule)
        .where(eq(installmentSchedule.paymentPlanId, plan.id))
        .orderBy(installmentSchedule.installmentDate);

      customInstallments = installmentSchedules.map(schedule => ({
        date: schedule.installmentDate,
        amount: Number.parseFloat(schedule.installmentAmount.toString()),
        notes: schedule.notes || "",
        isPaid: schedule.status === 'paid',
        paidDate: schedule.paidDate,
      }));
    }

    const responsePaymentPlan = {
      ...plan,
      customInstallments,
    };

    return NextResponse.json(
      { 
        paymentPlan: responsePaymentPlan 
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching payment plan:", error);
    return ErrorHandler.handle(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planIdString } = await params;
    const planId = parseInt(planIdString, 10);
    if (isNaN(planId) || planId <= 0) {
      return NextResponse.json({ error: "Invalid payment plan ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData: UpdatePaymentPlanRequest = updatePaymentPlanSchema.parse(body);

    const [existingPlan] = await db
      .select()
      .from(paymentPlan)
      .where(eq(paymentPlan.id, planId))
      .limit(1);

    if (!existingPlan) {
      return NextResponse.json({ error: "Payment plan not found" }, { status: 404 });
    }

    // Precision helper functions
    const toCents = (amount: number): number => Math.round(amount * 100);
    const fromCents = (cents: number): number => Math.round(cents) / 100;

    // Custom Distribution Validation
    if (validatedData.distributionType === "custom" && validatedData.customInstallments) {
      if (validatedData.customInstallments.length === 0) {
        return NextResponse.json({
          error: "Validation failed",
          details: [{
            field: "customInstallments",
            message: "Custom installments must be provided for 'custom' distribution type."
          }]
        }, { status: 400 });
      }

      const totalCustomCents = validatedData.customInstallments.reduce((sum, inst) => 
        sum + toCents(inst.amount), 0
      );
      const expectedCents = toCents(validatedData.totalPlannedAmount || Number.parseFloat(existingPlan.totalPlannedAmount.toString()));

      // Allow up to 2 cents difference and auto-adjust
      const difference = expectedCents - totalCustomCents;
      if (Math.abs(difference) > 2) {
        return NextResponse.json({
          error: "Validation failed",
          details: [{
            field: "totalPlannedAmount",
            message: `Sum of custom installments (${fromCents(totalCustomCents)}) must equal the total planned amount (${fromCents(expectedCents)}).`
          }]
        }, { status: 400 });
      } else if (difference !== 0) {
        // Auto-adjust the last installment
        const lastIndex = validatedData.customInstallments.length - 1;
        const lastCents = toCents(validatedData.customInstallments[lastIndex].amount);
        validatedData.customInstallments[lastIndex].amount = fromCents(lastCents + difference);
      }

      // Validate unique dates
      const dates = validatedData.customInstallments.map(inst => inst.date);
      if (new Set(dates).size !== dates.length) {
        return NextResponse.json({
          error: "Validation failed",
          details: [{
            field: "customInstallments",
            message: "Installment dates must be unique."
          }]
        }, { status: 400 });
      }
    }

    // Fixed Distribution Validation with Auto-Correction
    if (validatedData.distributionType === "fixed") {
      if (!validatedData.installmentAmount || !validatedData.numberOfInstallments) {
        return NextResponse.json({
          error: "Validation failed",
          details: [{
            field: "installmentAmount/numberOfInstallments",
            message: "Installment amount and number of installments are required for 'fixed' distribution type."
          }]
        }, { status: 400 });
      }

      const totalPlannedAmount = validatedData.totalPlannedAmount || Number.parseFloat(existingPlan.totalPlannedAmount.toString());
      const numberOfInstallments = validatedData.numberOfInstallments;
      
      // Calculate correct installment amount using cent-based math
      const totalCents = toCents(totalPlannedAmount);
      const baseCentsPerInstallment = Math.floor(totalCents / numberOfInstallments);
      const remainderCents = totalCents % numberOfInstallments;
      
      // The actual installment amount most installments will have
      const baseInstallmentAmount = fromCents(baseCentsPerInstallment);
      
      // Check if the provided installment amount would create precision issues
      const providedInstallmentCents = toCents(validatedData.installmentAmount);
      const calculatedTotalCents = providedInstallmentCents * numberOfInstallments;
      const expectedTotalCents = toCents(totalPlannedAmount);
      
      // If there's a mismatch, auto-correct or convert to custom
      if (Math.abs(calculatedTotalCents - expectedTotalCents) > 1) {
        if (remainderCents === 0) {
          // Perfect division - just update the installment amount
          validatedData.installmentAmount = baseInstallmentAmount;
        } else {
          // Convert to custom distribution to handle remainder properly
          const customInstallments = [];
          const startDate = new Date(validatedData.startDate || existingPlan.startDate);
          const frequency = validatedData.frequency || existingPlan.frequency;
          
          for (let i = 0; i < numberOfInstallments; i++) {
            const installmentDate = new Date(startDate);
            
            switch (frequency) {
              case "weekly":
                installmentDate.setDate(startDate.getDate() + i * 7);
                break;
              case "monthly":
                installmentDate.setMonth(startDate.getMonth() + i);
                break;
              case "quarterly":
                installmentDate.setMonth(startDate.getMonth() + i * 3);
                break;
              case "biannual":
                installmentDate.setMonth(startDate.getMonth() + i * 6);
                break;
              case "annual":
                installmentDate.setFullYear(startDate.getFullYear() + i);
                break;
              default:
                installmentDate.setMonth(startDate.getMonth() + i);
            }
            
            // Distribute remainder cents among first installments
            let installmentCents = baseCentsPerInstallment;
            if (i < remainderCents) {
              installmentCents += 1;
            }
            
            customInstallments.push({
              date: installmentDate.toISOString().split('T')[0],
              amount: fromCents(installmentCents),
              notes: `Installment ${i + 1}`,
            });
          }
          
          validatedData.distributionType = "custom";
          validatedData.customInstallments = customInstallments;
          validatedData.installmentAmount = baseInstallmentAmount;
        }
      }
    }

    // Transform data for database storage
    const dataToUpdate: Partial<PaymentPlan> = {
      updatedAt: new Date(),
      ...(validatedData.planName !== undefined && { planName: validatedData.planName }),
      ...(validatedData.frequency !== undefined && { frequency: validatedData.frequency }),
      ...(validatedData.distributionType !== undefined && { distributionType: validatedData.distributionType }),
      ...(validatedData.totalPlannedAmount !== undefined && { totalPlannedAmount: validatedData.totalPlannedAmount.toString() }),
      ...(validatedData.currency !== undefined && { currency: validatedData.currency }),
      ...(validatedData.installmentAmount !== undefined && { installmentAmount: validatedData.installmentAmount.toString() }),
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
        if (validatedData.customInstallments) {
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

          dataToUpdate.numberOfInstallments = validatedData.customInstallments.length;
          
          // Ensure total matches sum of custom installments exactly
          const exactTotal = fromCents(
            validatedData.customInstallments.reduce((sum, inst) => 
              sum + toCents(inst.amount), 0
            )
          );
          dataToUpdate.totalPlannedAmount = exactTotal.toString();
        }
      } else if (validatedData.distributionType === "fixed") {
        await db.delete(installmentSchedule).where(eq(installmentSchedule.paymentPlanId, planId));
        
        // For fixed plans, ensure total is exactly installment × count
        if (validatedData.installmentAmount && validatedData.numberOfInstallments) {
          const exactTotal = fromCents(
            toCents(validatedData.installmentAmount) * validatedData.numberOfInstallments
          );
          dataToUpdate.totalPlannedAmount = exactTotal.toString();
        }
      }
    }

    const [updatedPlan] = await db
      .update(paymentPlan)
      .set(dataToUpdate)
      .where(eq(paymentPlan.id, planId))
      .returning();

    return NextResponse.json({
      message: "Payment plan updated successfully",
      paymentPlan: updatedPlan,
    });

  } catch (error) {
    console.error("Error updating payment plan:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Validation failed",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      }, { status: 400 });
    }
    return ErrorHandler.handle(error);
  }
}

// GET Endpoint for listing payment plans
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
