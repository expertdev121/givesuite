import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payment, pledge, paymentAllocations } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { z } from "zod";

const paymentMethodValues = [
  "ach", "bill_pay", "cash", "check", "credit", "credit_card", "expected",
  "goods_and_services", "matching_funds", "money_order", "p2p", "pending",
  "refund", "scholarship", "stock", "student_portion", "unknown", "wire", "xfer", "other"
] as const;

const methodDetailValues = [
  "achisomoch", "authorize", "bank_of_america_charitable", "banquest", "banquest_cm",
  "benevity", "chai_charitable", "charityvest_inc", "cjp", "donors_fund", "earthport",
  "e_transfer", "facts", "fidelity", "fjc", "foundation", "goldman_sachs", "htc",
  "jcf", "jcf_san_diego", "jgive", "keshet", "masa", "masa_old", "matach",
  "matching_funds", "mizrachi_canada", "mizrachi_olami", "montrose", "morgan_stanley_gift",
  "ms", "mt", "ojc", "paypal", "pelecard", "schwab_charitable", "stripe", "tiaa",
  "touro", "uktoremet", "vanguard_charitable", "venmo", "vmm", "wise", "worldline",
  "yaadpay", "yaadpay_cm", "yourcause", "yu", "zelle"
] as const;

// Define the Zod schema for GET request query parameters
const querySchema = z.object({
  pledgeId: z.preprocess((val) => parseInt(String(val), 10), z.number().positive()).optional(),
  contactId: z.preprocess((val) => parseInt(String(val), 10), z.number().positive()).optional(),
  solicitorId: z.preprocess((val) => parseInt(String(val), 10), z.number().positive()).optional(),
  page: z.preprocess((val) => parseInt(String(val), 10), z.number().min(1).default(1)).optional(),
  limit: z.preprocess((val) => parseInt(String(val), 10), z.number().min(1).default(10)).optional(),
  search: z.string().optional(),
  paymentMethod: z.enum(paymentMethodValues).optional(),
  paymentStatus: z.enum([
    "pending", "completed", "failed", "cancelled", "refunded", "processing"
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hasSolicitor: z.preprocess((val) => val === 'true', z.boolean()).optional(),
});

// Define missing constants for Zod enums
const supportedCurrencies = ["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"] as const;
const receiptTypeValues = ["invoice", "receipt", "confirmation", "other"] as const;
const paymentStatusValues = [
  "pending", "completed", "failed", "cancelled", "refunded", "processing"
] as const;

// Enhanced allocation schema with validation
const allocationSchema = z.object({
  pledgeId: z.preprocess((val) => parseInt(String(val), 10), z.number().positive()),
  amount: z.number().positive(),
  installmentScheduleId: z.preprocess((val) => val ? parseInt(String(val), 10) : null, z.number().positive().nullable()).optional(),
  notes: z.string().optional().nullable(),
});

// Updated payment schema with proper validation
const paymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(supportedCurrencies),
  exchangeRate: z.number().positive(),
  paymentDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: "Invalid date format",
  }),
  receivedDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: "Invalid date format",
  }).optional().nullable(),
  paymentMethod: z.enum(paymentMethodValues),
  methodDetail: z.enum(methodDetailValues).optional().nullable(),
  paymentStatus: z.enum(paymentStatusValues),
  referenceNumber: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  receiptType: z.enum(receiptTypeValues).optional().nullable(),
  receiptIssued: z.boolean(),
  notes: z.string().optional().nullable(),
  solicitorId: z.preprocess((val) => val ? parseInt(String(val), 10) : null, z.number().positive().nullable()).optional(),
  bonusPercentage: z.number().min(0).max(100).optional().nullable(),
  bonusAmount: z.number().min(0).optional().nullable(),
  bonusRuleId: z.number().optional().nullable(),
  
  // Either single payment or allocations
  pledgeId: z.preprocess((val) => val ? parseInt(String(val), 10) : null, z.number().positive().nullable()).optional(),
  allocations: z.array(allocationSchema).optional(),
}).refine((data) => {
  // Either pledgeId or allocations must be provided, but not both
  const hasPledgeId = data.pledgeId !== null && data.pledgeId !== undefined;
  const hasAllocations = data.allocations && data.allocations.length > 0;
  
  return hasPledgeId !== hasAllocations; // XOR: exactly one should be true
}, {
  message: "Either pledgeId (for single payment) or allocations (for split payment) must be provided, but not both",
}).refine((data) => {
  // If allocations are provided, validate that total allocation amount equals payment amount
  if (data.allocations && data.allocations.length > 0) {
    const totalAllocated = data.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const difference = Math.abs(totalAllocated - data.amount);
    return difference < 0.01; // Allow for small floating point differences
  }
  return true;
}, {
  message: "Total allocation amount must equal the payment amount",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received payload:', JSON.stringify(body, null, 2));
    
    const validatedData = paymentSchema.parse(body);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));

    const paymentDate = validatedData.paymentDate;
    const receivedDate = validatedData.receivedDate || paymentDate;

    // Common payment data that applies to all payments
    const commonPaymentData = {
      currency: validatedData.currency,
      exchangeRate: Number(validatedData.exchangeRate.toFixed(4)).toString(),
      paymentDate,
      receivedDate,
      methodDetail: validatedData.methodDetail || null,
      paymentMethod: validatedData.paymentMethod,
      paymentStatus: validatedData.paymentStatus,
      referenceNumber: validatedData.referenceNumber || null,
      receiptNumber: validatedData.receiptNumber || null,
      receiptType: validatedData.receiptType || null,
      receiptIssued: validatedData.receiptIssued ?? false,
      solicitorId: validatedData.solicitorId || null,
      bonusPercentage: validatedData.bonusPercentage !== null && validatedData.bonusPercentage !== undefined
        ? Number(validatedData.bonusPercentage.toFixed(2)).toString()
        : null,
      bonusAmount: validatedData.bonusAmount !== null && validatedData.bonusAmount !== undefined
        ? Number(validatedData.bonusAmount.toFixed(2)).toString()
        : null,
      bonusRuleId: validatedData.bonusRuleId || null,
      notes: validatedData.notes || null,
    };

    // Check if we have allocations (split payment)
    if (validatedData.allocations && validatedData.allocations.length > 0) {
      // Handle split payment - create one payment entry with multiple allocations
      
      // Verify all pledges exist before creating payment
      const pledgeIds = validatedData.allocations.map(alloc => alloc.pledgeId);
      const existingPledges = await db
        .select()
        .from(pledge)
        .where(sql`${pledge.id} IN (${sql.join(pledgeIds.map(id => sql`${id}`), sql`, `)})`);

      if (existingPledges.length !== pledgeIds.length) {
        const foundIds = existingPledges.map(p => p.id);
        const missingIds = pledgeIds.filter(id => !foundIds.includes(id));
        return NextResponse.json(
          { error: `Pledges not found: ${missingIds.join(', ')}` },
          { status: 404 }
        );
      }

      // Calculate USD amount: payment amount / payment exchange rate
      const amountUsd = validatedData.amount / validatedData.exchangeRate;

      // Create single payment entry (without pledgeId for split payments)
      const splitPaymentData = {
        ...commonPaymentData,
        pledgeId: null, // No single pledge for split payments
        amount: Number(validatedData.amount.toFixed(2)).toString(),
        amountUsd: Number(amountUsd.toFixed(2)).toString(),
        amountInPledgeCurrency: null, // Not applicable for split payments
      };

      console.log('Creating split payment:', splitPaymentData);

      const paymentResult = await db
        .insert(payment)
        .values(splitPaymentData)
        .returning();

      if (paymentResult.length === 0) {
        return NextResponse.json(
          { error: "Failed to create payment" },
          { status: 500 }
        );
      }

      const createdPayment = paymentResult[0];

      // Create allocations
      const allocationPromises = validatedData.allocations.map(async (allocation) => {
        const targetPledge = existingPledges.find(p => p.id === allocation.pledgeId)!;
        
        // Calculate USD amount for this allocation
        const allocationAmountUsd = allocation.amount / validatedData.exchangeRate;

        const allocationData = {
          paymentId: createdPayment.id,
          pledgeId: allocation.pledgeId,
          installmentScheduleId: allocation.installmentScheduleId || null,
          allocatedAmount: Number(allocation.amount.toFixed(2)).toString(),
          currency: validatedData.currency,
          allocatedAmountUsd: Number(allocationAmountUsd.toFixed(2)).toString(),
          notes: allocation.notes || null,
        };

        console.log(`Creating allocation for pledge ${allocation.pledgeId}:`, allocationData);

        const allocationResult = await db
          .insert(paymentAllocations)
          .values(allocationData)
          .returning();

        // Update pledge totals
        await updatePledgeTotals(allocation.pledgeId);

        return allocationResult[0];
      });

      const createdAllocations = await Promise.all(allocationPromises);

      return NextResponse.json(
        {
          message: "Split payment created successfully",
          payment: createdPayment,
          allocations: createdAllocations,
          count: createdAllocations.length
        },
        { status: 201 }
      );
    } 
    // Handle single payment
    else if (validatedData.pledgeId) {
      const currentPledge = await db
        .select()
        .from(pledge)
        .where(eq(pledge.id, validatedData.pledgeId))
        .limit(1);

      if (currentPledge.length === 0) {
        return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
      }

      const pledgeData = currentPledge[0];
      
      // Calculate USD amount: payment amount / payment exchange rate
      const amountUsd = validatedData.amount / validatedData.exchangeRate;
      
      // Calculate amount in pledge currency
      const pledgeExchangeRate = parseFloat(pledgeData.exchangeRate || "1");
      const amountInPledgeCurrency = validatedData.currency === pledgeData.currency
        ? validatedData.amount
        : amountUsd * pledgeExchangeRate;

      const newPaymentData = {
        ...commonPaymentData,
        pledgeId: validatedData.pledgeId,
        amount: Number(validatedData.amount.toFixed(2)).toString(),
        amountUsd: Number(amountUsd.toFixed(2)).toString(),
        amountInPledgeCurrency: Number(amountInPledgeCurrency.toFixed(2)).toString(),
      };

      console.log('Creating single payment:', newPaymentData);

      const paymentResult = await db
        .insert(payment)
        .values(newPaymentData)
        .returning();

      if (paymentResult.length === 0) {
        return NextResponse.json(
          { error: "Failed to create payment" },
          { status: 500 }
        );
      }

      // Update pledge totals
      await updatePledgeTotals(validatedData.pledgeId);

      return NextResponse.json(
        {
          message: "Payment created successfully",
          payment: paymentResult[0],
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Either pledgeId or allocations array is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Enhanced helper function to update pledge totals
async function updatePledgeTotals(pledgeId: number) {
  // Calculate totals from direct payments
  const directPayments = await db
    .select({
      totalInPledgeCurrency: sql<number>`COALESCE(SUM(${payment.amountInPledgeCurrency}::numeric), 0)`,
      totalUsd: sql<number>`COALESCE(SUM(${payment.amountUsd}::numeric), 0)`,
    })
    .from(payment)
    .where(eq(payment.pledgeId, pledgeId));

  // Calculate totals from allocated payments
  const allocatedPayments = await db
    .select({
      totalAllocated: sql<number>`COALESCE(SUM(${paymentAllocations.allocatedAmount}::numeric), 0)`,
      totalAllocatedUsd: sql<number>`COALESCE(SUM(${paymentAllocations.allocatedAmountUsd}::numeric), 0)`,
    })
    .from(paymentAllocations)
    .where(eq(paymentAllocations.pledgeId, pledgeId));

  const currentPledge = await db
    .select()
    .from(pledge)
    .where(eq(pledge.id, pledgeId))
    .limit(1);

  if (currentPledge.length === 0) return;

  const pledgeData = currentPledge[0];
  const originalAmount = parseFloat(pledgeData.originalAmount);
  const originalAmountUsd = parseFloat(pledgeData.originalAmountUsd || "0");

  // Combine direct payments and allocations
  const directTotal = Number(directPayments[0].totalInPledgeCurrency || 0);
  const directTotalUsd = Number(directPayments[0].totalUsd || 0);
  const allocatedTotal = Number(allocatedPayments[0].totalAllocated || 0);
  const allocatedTotalUsd = Number(allocatedPayments[0].totalAllocatedUsd || 0);

  // For pledge currency totals, we need to convert allocated amounts to pledge currency
  const pledgeExchangeRate = parseFloat(pledgeData.exchangeRate || "1");
  const allocatedTotalInPledgeCurrency = pledgeData.currency === "USD" 
    ? allocatedTotalUsd 
    : allocatedTotalUsd * pledgeExchangeRate;

  const newTotalPaid = directTotal + allocatedTotalInPledgeCurrency;
  const newTotalPaidUsd = directTotalUsd + allocatedTotalUsd;
  const newBalance = Math.max(0, originalAmount - newTotalPaid);
  const newBalanceUsd = Math.max(0, originalAmountUsd - newTotalPaidUsd);

  await db
    .update(pledge)
    .set({
      totalPaid: newTotalPaid.toString(),
      totalPaidUsd: newTotalPaidUsd.toString(),
      balance: newBalance.toString(),
      balanceUsd: newBalanceUsd.toString(),
      updatedAt: new Date(),
    })
    .where(eq(pledge.id, pledgeId));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsedParams = querySchema.safeParse(params);

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

    const {
      pledgeId,
      contactId,
      solicitorId,
      page = 1,
      limit = 10,
      search,
      paymentMethod,
      paymentStatus,
      startDate,
      endDate,
      hasSolicitor,
    } = parsedParams.data;

    const offset = (page - 1) * limit;
    const conditions = [];

    if (pledgeId) {
      // Include both direct payments and allocated payments for this pledge
      conditions.push(
        sql`(${payment.pledgeId} = ${pledgeId} OR ${payment.id} IN (
          SELECT payment_id FROM ${paymentAllocations} WHERE pledge_id = ${pledgeId}
        ))`
      );
    }

    if (contactId) {
      conditions.push(
        sql`(${payment.pledgeId} IN (SELECT id FROM ${pledge} WHERE contact_id = ${contactId}) OR 
            ${payment.id} IN (
              SELECT pa.payment_id FROM ${paymentAllocations} pa
              JOIN ${pledge} p ON pa.pledge_id = p.id
              WHERE p.contact_id = ${contactId}
            ))`
      );
    }

    if (solicitorId) {
      conditions.push(eq(payment.solicitorId, solicitorId));
    }

    if (hasSolicitor !== undefined) {
      if (hasSolicitor) {
        conditions.push(sql`${payment.solicitorId} IS NOT NULL`);
      } else {
        conditions.push(sql`${payment.solicitorId} IS NULL`);
      }
    }

    if (search) {
      conditions.push(
        sql`${payment.referenceNumber} ILIKE ${"%" + search + "%"} OR ${payment.checkNumber
          } ILIKE ${"%" + search + "%"} OR ${payment.notes} ILIKE ${"%" + search + "%"
          } OR ${payment.receiptNumber} ILIKE ${"%" + search + "%"}`
      );
    }

    if (paymentMethod) {
      conditions.push(eq(payment.paymentMethod, paymentMethod));
    }

    if (paymentStatus) {
      conditions.push(eq(payment.paymentStatus, paymentStatus));
    }

    if (startDate) {
      conditions.push(sql`${payment.paymentDate} >= ${startDate}`);
    }

    if (endDate) {
      conditions.push(sql`${payment.paymentDate} <= ${endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const paymentsQuery = db
      .select({
        id: payment.id,
        pledgeId: payment.pledgeId,
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
        paymentPlanId: payment.paymentPlanId,
        installmentScheduleId: payment.installmentScheduleId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        pledgeDescription: sql<string>`(
          SELECT description FROM ${pledge} WHERE id = ${payment.pledgeId}
        )`.as("pledgeDescription"),
        pledgeOriginalAmount: sql<string>`(
          SELECT original_amount FROM ${pledge} WHERE id = ${payment.pledgeId}
        )`.as("pledgeOriginalAmount"),
        pledgeOriginalCurrency: sql<string>`(
          SELECT currency FROM ${pledge} WHERE id = ${payment.pledgeId}
        )`.as("pledgeOriginalCurrency"),
        pledgeExchangeRate: sql<string>`(
          SELECT exchange_rate FROM ${pledge} WHERE id = ${payment.pledgeId}
        )`.as("pledgeExchangeRate"),
        contactId: sql<number>`(
          SELECT contact_id FROM ${pledge} WHERE id = ${payment.pledgeId}
        )`.as("contactId"),
        solicitorName: sql<string>`(
          SELECT CONCAT(c.first_name, ' ', c.last_name)
          FROM solicitor s
          JOIN contact c ON s.contact_id = c.id
          WHERE s.id = ${payment.solicitorId}
        )`.as("solicitorName"),
        // Check if this is a split payment (has allocations)
        isSplitPayment: sql<boolean>`(
          SELECT COUNT(*) > 0 FROM ${paymentAllocations} WHERE payment_id = ${payment.id}
        )`.as("isSplitPayment"),
        // Get allocation count
        allocationCount: sql<number>`(
          SELECT COUNT(*) FROM ${paymentAllocations} WHERE payment_id = ${payment.id}
        )`.as("allocationCount"),
      })
      .from(payment)
      .leftJoin(pledge, eq(payment.pledgeId, pledge.id))
      .where(whereClause)
      .orderBy(sql`${payment.paymentDate} DESC`)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(payment)
      .leftJoin(pledge, eq(payment.pledgeId, pledge.id))
      .where(whereClause);

    const [payments, totalCountResult] = await Promise.all([
      paymentsQuery.execute(),
      countQuery.execute(),
    ]);

    // For split payments, also fetch their allocations
    const paymentsWithAllocations = await Promise.all(
      payments.map(async (payment) => {
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

    const totalCount = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      payments: paymentsWithAllocations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: parsedParams.data,
    };

    return NextResponse.json(response, {
      headers: {
        "X-Total-Count": response.pagination.totalCount.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch payments",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}