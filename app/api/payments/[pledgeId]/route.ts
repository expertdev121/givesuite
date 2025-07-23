/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { payment, pledge, paymentAllocations } from "@/lib/db/schema";
import { ErrorHandler } from "@/lib/error-handler";
import { eq, desc, or, ilike, and, SQL, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PaymentStatusEnum = z.enum([
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
  "processing",
]);

const QueryParamsSchema = z.object({
  pledgeId: z.number().positive(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  paymentStatus: PaymentStatusEnum.optional(),
});

type QueryParams = z.infer<typeof QueryParamsSchema>;

// Enhanced allocation schema to match your form
const allocationUpdateSchema = z.object({
  id: z.number().optional(), // For existing allocations
  pledgeId: z.number().positive("Pledge ID is required"),
  allocatedAmount: z.number().positive("Allocated amount must be positive"),
  notes: z.string().optional().nullable(),
  installmentScheduleId: z.number().optional().nullable(),
  currency: z
    .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
    .optional(),
});

// Updated schema to match your form structure
const updatePaymentSchema = z.object({
  paymentId: z.number().positive("Payment ID is required and must be positive"),
  amount: z.number().positive("Amount must be positive").optional(),
  currency: z
    .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
    .optional(),
  amountUsd: z.number().positive("Amount in USD must be positive").optional(),
  amountInPledgeCurrency: z.number().positive("Amount in pledge currency must be positive").optional(),
  exchangeRate: z
    .number()
    .positive("Exchange rate must be positive")
    .optional(),
  paymentDate: z.string().min(1, "Payment date is required").optional(),
  receivedDate: z.string().optional().nullable(),
  paymentMethod: z
    .enum([
      "ach", "bill_pay", "cash", "check", "credit", "credit_card", "expected",
      "goods_and_services", "matching_funds", "money_order", "p2p", "pending",
      "refund", "scholarship", "stock", "student_portion", "unknown", "wire", "xfer", "other"
    ])
    .optional(),
  methodDetail: z.string().optional().nullable(),
  paymentStatus: PaymentStatusEnum.optional(),
  referenceNumber: z.string().optional().nullable(),
  checkNumber: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  receiptType: z
    .enum(["invoice", "confirmation", "receipt", "other"])
    .optional().nullable(),
  receiptIssued: z.boolean().optional(),
  solicitorId: z
    .number()
    .positive("Solicitor ID must be positive")
    .optional()
    .nullable(),
  bonusPercentage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  bonusAmount: z
    .number()
    .min(0)
    .optional()
    .nullable(),
  bonusRuleId: z
    .number()
    .positive("Bonus rule ID must be positive")
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  pledgeId: z.number().positive("Pledge ID must be positive").optional().nullable(),
  paymentPlanId: z.number().positive("Payment plan ID must be positive").optional().nullable(),
  isSplitPayment: z.boolean().optional(),
  allocations: z.array(allocationUpdateSchema).optional(),
}).refine((data) => {
  // If it's a split payment, validate allocation total equals payment amount
  if (data.isSplitPayment && data.allocations && data.allocations.length > 0 && data.amount) {
    const totalAllocated = data.allocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
    const difference = Math.abs(totalAllocated - data.amount);
    return difference < 0.01; // Allow for small floating point differences
  }
  return true;
}, {
  message: "Total allocation amount must equal the payment amount for split payments",
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
      paymentStatus: searchParams.get("paymentStatus") || undefined,
    });

    const { pledgeId, page, limit, search, paymentStatus } = queryParams;

    let query = db
      .select({
        id: payment.id,
        pledgeId: payment.pledgeId,
        paymentPlanId: payment.paymentPlanId,
        installmentScheduleId: payment.installmentScheduleId,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        amountInPledgeCurrency: payment.amountInPledgeCurrency,
        exchangeRate: payment.exchangeRate,
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        paymentMethod: payment.paymentMethod,
        methodDetail: payment.methodDetail,
        paymentStatus: payment.paymentStatus,
        referenceNumber: payment.referenceNumber,
        checkNumber: payment.checkNumber,
        receiptNumber: payment.receiptNumber,
        receiptType: payment.receiptType,
        receiptIssued: payment.receiptIssued,
        solicitorId: payment.solicitorId,
        bonusPercentage: payment.bonusPercentage,
        bonusAmount: payment.bonusAmount,
        bonusRuleId: payment.bonusRuleId,
        notes: payment.notes,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        pledgeExchangeRate: pledge.exchangeRate,
        // Check if this is a split payment
        isSplitPayment: sql<boolean>`(
          SELECT COUNT(*) > 0 FROM ${paymentAllocations} WHERE payment_id = ${payment.id}
        )`.as("isSplitPayment"),
        // Get allocation count
        allocationCount: sql<number>`(
          SELECT COUNT(*) FROM ${paymentAllocations} WHERE payment_id = ${payment.id}
        )`.as("allocationCount"),
      })
      .from(payment)
      .innerJoin(pledge, eq(payment.pledgeId, pledge.id))
      .where(eq(payment.pledgeId, pledgeId))
      .$dynamic();

    const conditions: SQL<unknown>[] = [];

    if (paymentStatus) {
      conditions.push(eq(payment.paymentStatus, paymentStatus));
    }

    if (search) {
      const searchConditions: SQL<unknown>[] = [];
      searchConditions.push(
        ilike(sql`COALESCE(${payment.notes}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${payment.referenceNumber}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${payment.checkNumber}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${payment.receiptNumber}, '')`, `%${search}%`)
      );
      conditions.push(or(...searchConditions)!);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset).orderBy(desc(payment.createdAt));

    const paymentsResult = await query;

    // For split payments, also fetch their allocations
    const paymentsWithAllocations = await Promise.all(
      paymentsResult.map(async (payment) => {
        if (payment.isSplitPayment) {
          const allocations = await db
            .select({
              id: paymentAllocations.id,
              pledgeId: paymentAllocations.pledgeId,
              installmentScheduleId: paymentAllocations.installmentScheduleId,
              allocatedAmount: paymentAllocations.allocatedAmount,
              currency: paymentAllocations.currency,
              allocatedAmountUsd: paymentAllocations.allocatedAmountUsd,
              notes: paymentAllocations.notes,
              pledgeDescription: sql<string>`(
                SELECT description FROM ${pledge} WHERE id = ${paymentAllocations.pledgeId}
              )`.as("pledgeDescription"),
            })
            .from(paymentAllocations)
            .leftJoin(pledge, eq(paymentAllocations.pledgeId, pledge.id))
            .where(eq(paymentAllocations.paymentId, payment.id));

          return {
            ...payment,
            allocations,
          };
        }
        return payment;
      })
    );

    return NextResponse.json(
      { payments: paymentsWithAllocations },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pledgeId: string }> }
) {
  try {
    const { pledgeId } = await params;
    const paymentId = parseInt(pledgeId);
    if (isNaN(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    const existingPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Delete payment (this will cascade delete allocations if properly configured)
    await db.delete(payment).where(eq(payment.id, paymentId));

    return NextResponse.json({
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return ErrorHandler.handle(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pledgeId: string }> }
) {
  try {
    const { pledgeId: rawPledgeId } = await params;
    const pledgeId = parseInt(rawPledgeId);

    console.log("PATCH Request: Raw Pledge ID from params:", rawPledgeId);
    console.log("PATCH Request: Parsed Pledge ID:", pledgeId);

    if (isNaN(pledgeId) || pledgeId <= 0) {
      return NextResponse.json(
        { error: "Invalid Pledge ID. Please ensure the Pledge ID is in the URL path (e.g., /api/payments/pledge/123)." },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("PATCH Request: Received body:", JSON.stringify(body, null, 2));

    const validatedData = updatePaymentSchema.parse(body);
    const paymentId = validatedData.paymentId;

    console.log("PATCH Request: Extracted Payment ID from body:", paymentId);

    // Check if payment exists
    const existingPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json({ 
        error: "Payment not found." 
      }, { status: 404 });
    }

    const currentPayment = existingPayment[0];

    // Check if this is a split payment update
    if (validatedData.isSplitPayment) {
      console.log("Handling split payment update for payment ID:", paymentId);

      // Validate that the payment is actually a split payment
      const existingAllocations = await db
        .select()
        .from(paymentAllocations)
        .where(eq(paymentAllocations.paymentId, paymentId));

      if (existingAllocations.length === 0) {
        return NextResponse.json({
          error: "This payment is not a split payment. No allocations found.",
          details: "Cannot update as split payment when no allocations exist."
        }, { status: 400 });
      }

      // If allocations are provided in the update, validate them
      if (validatedData.allocations && Array.isArray(validatedData.allocations) && validatedData.allocations.length > 0) {
        console.log("Processing allocation updates:", validatedData.allocations);
        
        // Validate total allocated amount matches payment amount
        const totalAllocated = validatedData.allocations.reduce(
          (sum, alloc) => sum + alloc.allocatedAmount, 
          0
        );
        const paymentAmount = validatedData.amount || parseFloat(currentPayment.amount);
        
        console.log("Total allocated:", totalAllocated, "Payment amount:", paymentAmount);
        
        if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
          return NextResponse.json({
            error: "Invalid allocation amounts",
            details: `Total allocated amount (${totalAllocated.toFixed(2)}) must equal payment amount (${paymentAmount.toFixed(2)}). Difference: ${Math.abs(totalAllocated - paymentAmount).toFixed(2)}`,
            totalAllocated,
            paymentAmount,
            difference: Math.abs(totalAllocated - paymentAmount)
          }, { status: 400 });
        }

        // Validate that all allocation IDs exist and belong to this payment
        for (const allocation of validatedData.allocations) {
          if (!allocation) continue; // Skip if allocation is null/undefined

          if (allocation.id) {
            const existingAllocation = existingAllocations.find(
              existing => existing.id === allocation.id
            );
            if (!existingAllocation) {
              return NextResponse.json({
                error: "Invalid allocation ID",
                details: `Allocation with ID ${allocation.id} does not exist for this payment.`
              }, { status: 400 });
            }
          }

          // Validate allocated amount is positive
          if (!allocation.allocatedAmount || allocation.allocatedAmount <= 0) {
            return NextResponse.json({
              error: "Invalid allocation amount",
              details: `Allocated amount must be positive. Found: ${allocation.allocatedAmount || 0} for pledge ${allocation.pledgeId}`
            }, { status: 400 });
          }

          // Validate pledge exists
          const pledgeExists = await db
            .select({ id: pledge.id })
            .from(pledge)
            .where(eq(pledge.id, allocation.pledgeId))
            .limit(1);

          if (pledgeExists.length === 0) {
            return NextResponse.json({
              error: "Invalid pledge ID in allocation",
              details: `Pledge with ID ${allocation.pledgeId} does not exist.`
            }, { status: 400 });
          }
        }

        // Update payment record first (without transaction)
        const { paymentId: _, allocations: __, isSplitPayment: ___, ...dataToUpdate } = validatedData;
        
        const updateData: any = {
          ...dataToUpdate,
          pledgeId: null, // Split payments don't have a single pledge
          updatedAt: new Date(),
        };

        // Convert numeric fields to strings for database storage
        if (updateData.amount !== undefined) {
          updateData.amount = updateData.amount.toString();
        }
        if (updateData.amountUsd !== undefined) {
          updateData.amountUsd = updateData.amountUsd.toString();
        }
        if (updateData.amountInPledgeCurrency !== undefined) {
          updateData.amountInPledgeCurrency = updateData.amountInPledgeCurrency.toString();
        }
        if (updateData.exchangeRate !== undefined) {
          updateData.exchangeRate = updateData.exchangeRate.toString();
        }
        if (updateData.bonusPercentage !== undefined && updateData.bonusPercentage !== null) {
          updateData.bonusPercentage = updateData.bonusPercentage.toString();
        }
        if (updateData.bonusAmount !== undefined && updateData.bonusAmount !== null) {
          updateData.bonusAmount = updateData.bonusAmount.toString();
        }

        console.log("Updating payment with data:", updateData);

        // Update payment record
        await db
          .update(payment)
          .set(updateData)
          .where(eq(payment.id, paymentId));

        console.log("Payment updated successfully");

        // Update each allocation individually (without transaction)
        for (const allocation of validatedData.allocations) {
          if (!allocation || !allocation.id) continue; // Skip invalid allocations

          console.log(`Updating allocation ${allocation.id} with amount ${allocation.allocatedAmount}`);

          const allocationUpdateData: any = {
            allocatedAmount: allocation.allocatedAmount.toString(), // Convert number to string for database
            notes: allocation.notes || null,
            updatedAt: new Date(),
          };

          // Add currency if it's provided
          if (allocation.currency || validatedData.currency) {
            allocationUpdateData.currency = allocation.currency || validatedData.currency;
          }

          await db
            .update(paymentAllocations)
            .set(allocationUpdateData)
            .where(eq(paymentAllocations.id, allocation.id));

          console.log(`Allocation ${allocation.id} updated successfully`);
        }

        console.log("Split payment and allocations updated successfully");

      } else {
        // Only update payment record without touching allocations
        const { paymentId: _, allocations: __, isSplitPayment: ___, ...dataToUpdate } = validatedData;
        
        const updateData: any = {
          ...dataToUpdate,
          pledgeId: null,
          updatedAt: new Date(),
        };

        // Convert numeric fields to strings
        if (updateData.amount !== undefined) {
          updateData.amount = updateData.amount.toString();
        }
        if (updateData.amountUsd !== undefined) {
          updateData.amountUsd = updateData.amountUsd.toString();
        }
        if (updateData.amountInPledgeCurrency !== undefined) {
          updateData.amountInPledgeCurrency = updateData.amountInPledgeCurrency.toString();
        }
        if (updateData.exchangeRate !== undefined) {
          updateData.exchangeRate = updateData.exchangeRate.toString();
        }
        if (updateData.bonusPercentage !== undefined && updateData.bonusPercentage !== null) {
          updateData.bonusPercentage = updateData.bonusPercentage.toString();
        }
        if (updateData.bonusAmount !== undefined && updateData.bonusAmount !== null) {
          updateData.bonusAmount = updateData.bonusAmount.toString();
        }

        await db
          .update(payment)
          .set(updateData)
          .where(eq(payment.id, paymentId));

        console.log("Split payment updated successfully (allocations unchanged)");
      }

    } else {
      // Handle regular payment update
      
      // Validate this is not actually a split payment
      const existingAllocations = await db
        .select()
        .from(paymentAllocations)
        .where(eq(paymentAllocations.paymentId, paymentId));

      if (existingAllocations.length > 0) {
        return NextResponse.json({
          error: "Cannot update split payment as regular payment",
          details: `This payment has ${existingAllocations.length} allocations and must be updated as a split payment.`,
          allocationCount: existingAllocations.length
        }, { status: 400 });
      }

      // Validate pledge association
      if (validatedData.pledgeId && validatedData.pledgeId !== pledgeId) {
        return NextResponse.json({
          error: "Pledge ID mismatch",
          details: `Cannot change pledge association from ${pledgeId} to ${validatedData.pledgeId} in regular payment update.`
        }, { status: 400 });
      }

      const { paymentId: _, allocations: __, isSplitPayment: ___, ...dataToUpdate } = validatedData;
      const updateData: any = {
        ...dataToUpdate,
        pledgeId: pledgeId, // Regular payments maintain their pledge association
        updatedAt: new Date(),
      };

      // Convert numeric fields to strings
      if (updateData.amount !== undefined) {
        updateData.amount = updateData.amount.toString();
      }
      if (updateData.amountUsd !== undefined) {
        updateData.amountUsd = updateData.amountUsd.toString();
      }
      if (updateData.amountInPledgeCurrency !== undefined) {
        updateData.amountInPledgeCurrency = updateData.amountInPledgeCurrency.toString();
      }
      if (updateData.exchangeRate !== undefined) {
        updateData.exchangeRate = updateData.exchangeRate.toString();
      }
      if (updateData.bonusPercentage !== undefined && updateData.bonusPercentage !== null) {
        updateData.bonusPercentage = updateData.bonusPercentage.toString();
      }
      if (updateData.bonusAmount !== undefined && updateData.bonusAmount !== null) {
        updateData.bonusAmount = updateData.bonusAmount.toString();
      }

      await db
        .update(payment)
        .set(updateData)
        .where(and(eq(payment.id, paymentId), eq(payment.pledgeId, pledgeId)));

      console.log("Regular payment updated successfully");
    }

    // Fetch and return the updated payment
    const updatedPayment = await db
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .limit(1);

    if (updatedPayment.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch updated payment" },
        { status: 500 }
      );
    }

    // Fetch current allocations for split payments
    let allocations = null;
    if (validatedData.isSplitPayment) {
      allocations = await db
        .select({
          id: paymentAllocations.id,
          pledgeId: paymentAllocations.pledgeId,
          allocatedAmount: paymentAllocations.allocatedAmount,
          notes: paymentAllocations.notes,
          currency: paymentAllocations.currency,
          installmentScheduleId: paymentAllocations.installmentScheduleId,
          createdAt: paymentAllocations.createdAt,
          updatedAt: paymentAllocations.updatedAt,
        })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.paymentId, paymentId));
      
      console.log("Fetched allocations for split payment:", allocations);
    }

    return NextResponse.json({
      message: `${validatedData.isSplitPayment ? 'Split payment' : 'Payment'} updated successfully`,
      payment: {
        ...updatedPayment[0],
        allocations,
        isSplitPayment: validatedData.isSplitPayment,
        allocationCount: allocations?.length || 0,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.issues);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            received: issue.code === 'invalid_type' ? `${issue.received}` : undefined,
            expected: issue.code === 'invalid_type' ? `${issue.expected}` : undefined,
          })),
        },
        { status: 400 }
      );
    }

    console.error("Error updating payment:", error);
    return ErrorHandler.handle(error);
  }
}


