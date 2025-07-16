import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payment, pledge } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler"; // Ensure this is correctly implemented

// Define the Zod schema for GET request query parameters
const querySchema = z.object({
  pledgeId: z.preprocess((val) => parseInt(String(val), 10), z.number().positive()).optional(),
  contactId: z.preprocess((val) => parseInt(String(val), 10), z.number().positive()).optional(),
  solicitorId: z.preprocess((val) => parseInt(String(val), 10), z.number().positive()).optional(),
  page: z.preprocess((val) => parseInt(String(val), 10), z.number().min(1).default(1)).optional(),
  limit: z.preprocess((val) => parseInt(String(val), 10), z.number().min(1).default(10)).optional(),
  search: z.string().optional(),
  paymentMethod: z.enum([
    "ach", "bill_pay", "cash", "check", "credit", "credit_card", "expected", "goods_and_services",
    "matching_funds", "money_order", "p2p", "paypal", "pending", "refund", "scholarship", "stock",
    "student_portion", "unknown", "wire", "xfer", "wire_transfer", "bank_transfer", "other",
  ]).optional(),
  paymentStatus: z.enum([
    "expected", "pending", "completed", "refund", "returned", "declined", "failed", "cancelled", "processing",
  ]).optional(),
  // For dates, it's safer to use string and ensure they are in a valid date format if needed later
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hasSolicitor: z.preprocess((val) => val === 'true', z.boolean()).optional(), // Correctly parse boolean from string
});

// ******************************************************************************
// **** IMPORTANT FIX: Define missing constants for Zod enums ****
// ******************************************************************************
const supportedCurrencies = ["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"] as const;
const paymentMethodValues = [
  "ach", "bill_pay", "cash", "check", "credit", "credit_card", "expected", "goods_and_services",
  "matching_funds", "money_order", "p2p", "paypal", "pending", "refund", "scholarship", "stock",
  "student_portion", "unknown", "wire", "xfer", "wire_transfer", "bank_transfer", "other",
] as const;

const methodDetailValues = [
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
] as const;
 // Add all your method detail options here

const receiptTypeValues = ["invoice", "receipt", "confirmation","other"] as const; // Add all your receipt type options here
const paymentStatusValues = [
  "expected", "pending", "completed", "refund", "returned", "declined",
] as const; // Add all your payment status options here
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
  methodDetail: z.enum(methodDetailValues).optional().nullable(),
  paymentStatus: z.enum(paymentStatusValues),
  referenceNumber: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  receiptType: z.enum(receiptTypeValues).optional().nullable(),
  receiptIssued: z.boolean(),
  notes: z.string().optional().nullable(),
  solicitorId: z.string().optional().nullable(), // Changed to string based on previous discussion
  bonusPercentage: z.number().min(0).max(100).optional().nullable(),
  bonusAmount: z.number().min(0).optional().nullable(),
  bonusRuleId: z.number().optional().nullable(), // Changed to number based on previous discussion

  // New field for discrimination:
  isSplitPayment: z.boolean(),

  // Conditionally apply pledgeId or allocations based on isSplitPayment
  pledgeId: z.string().optional(), // Make optional, expects string
  allocations: z.array(z.object({
    pledgeId: z.string(), // Expected to be string
    amount: z.number().positive(), // Corrected name from 'allocatedAmount' for backend schema
    installmentScheduleId: z.string().optional().nullable(), // Expected to be string
    notes: z.string().optional().nullable(),
  })).optional(), // Make optional
}).refine((data) => {
  if (data.isSplitPayment) {
    return data.allocations && data.allocations.length > 0;
  } else {
    // Ensure pledgeId is a non-empty string when it's not a split payment
    return typeof data.pledgeId === 'string' && data.pledgeId.length > 0;
  }
}, {
  message: "Invalid payment request: missing pledgeId for single payment or allocations for split payment",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    const isSplitPayment = validatedData.isSplitPayment;

    // --- Handle Single Payment (without allocations array, or allocations array with 1 item) ---
    // If not a split payment, we expect a pledgeId at the top level
    if (!isSplitPayment && validatedData.pledgeId) {
      const currentPledge = await db
        .select()
        .from(pledge)
        .where(eq(pledge.id, validatedData.pledgeId))
        .limit(1);

      if (currentPledge.length === 0) {
        return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
      }

      const pledgeData = currentPledge[0];
      const originalAmount = parseFloat(pledgeData.originalAmount);
      const originalAmountUsd = parseFloat(pledgeData.originalAmountUsd || "0");

      const currentPayments = await db
        .select({
          totalInPledgeCurrency: sql<number>`COALESCE(SUM(${payment.amountInPledgeCurrency}::numeric), 0)`,
          totalUsd: sql<number>`COALESCE(SUM(${payment.amountUsd}::numeric), 0)`,
        })
        .from(payment)
        .where(eq(payment.pledgeId, validatedData.pledgeId));

      const currentTotalPaid = Number(currentPayments[0].totalInPledgeCurrency);
      const currentTotalPaidUsd = Number(currentPayments[0].totalUsd);

      // For single payment, amountInPledgeCurrency might come from frontend directly or derived from 'amount'
      // This part of your logic expects amountInPledgeCurrency and amountUsd at the top level for single payment
      // which are not defined in the schema for the main payment object.
      // You need to decide if these fields are part of the main 'paymentSchema' or derived.
      // For now, I'm assuming they will be derived or added to commonPaymentFields.
      // Assuming validatedData.amountUsd and validatedData.amountInPledgeCurrency will be present or calculated.
      // IF THEY ARE NOT COMING FROM THE FRONTEND, THEY NEED TO BE CALCULATED HERE.
      // For this example, I'll default them if missing from validatedData, but you should adjust based on your logic.

      const amountUsdForSinglePayment = validatedData.amount * validatedData.exchangeRate; // Example derivation
      const amountInPledgeCurrencyForSinglePayment = validatedData.amount; // Example derivation, assuming 'amount' is in pledge currency

      const newTotalPaid = Number(
        (currentTotalPaid + amountInPledgeCurrencyForSinglePayment).toFixed(2)
      );
      const newTotalPaidUsd = Number(
        (currentTotalPaidUsd + amountUsdForSinglePayment).toFixed(2)
      );
      const newBalance = Number(
        Math.max(0, originalAmount - newTotalPaid).toFixed(2)
      );
      const newBalanceUsd = Number(
        Math.max(0, originalAmountUsd - newTotalPaidUsd).toFixed(2)
      );

      const newPaymentData = {
        pledgeId: validatedData.pledgeId,
        amount: Number(validatedData.amount.toFixed(2)).toString(),
        currency: validatedData.currency,
        amountUsd: Number(amountUsdForSinglePayment.toFixed(2)).toString(), // Derived
        amountInPledgeCurrency: Number(amountInPledgeCurrencyForSinglePayment.toFixed(2)).toString(), // Derived
        exchangeRate: Number(validatedData.exchangeRate.toFixed(4)).toString(),
        paymentDate: validatedData.paymentDate,
        receivedDate: validatedData.receivedDate || validatedData.paymentDate,
        methodDetail: validatedData.methodDetail || null,
        paymentMethod: validatedData.paymentMethod,
        paymentStatus: validatedData.paymentStatus,
        referenceNumber: validatedData.referenceNumber || null,
        // checkNumber: validatedData.checkNumber || null, // Not in schema, remove if not added
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
        // paymentPlanId: validatedData.paymentPlanId || null, // Not in schema, remove if not added
        // installmentScheduleId: validatedData.installmentScheduleId || null, // Not in schema for single, remove if not added
      };

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

      const updateResult = await db
        .update(pledge)
        .set({
          totalPaid: newTotalPaid.toString(),
          totalPaidUsd: newTotalPaidUsd.toString(),
          balance: newBalance.toString(),
          balanceUsd: newBalanceUsd.toString(),
          updatedAt: new Date(),
        })
        .where(eq(pledge.id, validatedData.pledgeId))
        .returning();

      if (updateResult.length === 0) {
        console.error("Payment created but pledge update failed", {
          paymentId: paymentResult[0].id,
          pledgeId: validatedData.pledgeId,
        });
        return NextResponse.json(
          {
            error: "Payment created but pledge update failed",
            paymentId: paymentResult[0].id,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message: "Payment created successfully",
          payment: paymentResult[0],
        },
        { status: 201 }
      );
    }
    // --- Handle Split Payment (with allocations array) ---
    else if (isSplitPayment && validatedData.allocations && validatedData.allocations.length > 0) {
      const createdPayments = [];

      for (const allocation of validatedData.allocations) {
        // Fetch current pledge data for each allocation
        const currentPledge = await db
          .select()
          .from(pledge)
          .where(eq(pledge.id, allocation.pledgeId))
          .limit(1);

        if (currentPledge.length === 0) {
          console.warn(`Pledge with ID ${allocation.pledgeId} not found for allocation. Skipping.`);
          continue;
        }

        const pledgeData = currentPledge[0];
        const originalAmount = parseFloat(pledgeData.originalAmount);
        const originalAmountUsd = parseFloat(pledgeData.originalAmountUsd || "0");

        // Calculate current total paid from existing payments for THIS pledge
        const currentPaymentsForPledge = await db
          .select({
            totalInPledgeCurrency: sql<number>`COALESCE(SUM(${payment.amountInPledgeCurrency}::numeric), 0)`,
            totalUsd: sql<number>`COALESCE(SUM(${payment.amountUsd}::numeric), 0)`,
          })
          .from(payment)
          .where(eq(payment.pledgeId, allocation.pledgeId));

        const currentTotalPaid = Number(currentPaymentsForPledge[0].totalInPledgeCurrency);
        const currentTotalPaidUsd = Number(currentPaymentsForPledge[0].totalUsd);

        // Calculate new totals for THIS pledge
        // Assuming allocation.amount is the amount in the allocation's currency (which is not in the schema yet)
        // And validatedData.currency is the overall payment currency.
        // You need to determine how amountUsd and amountInPledgeCurrency are calculated for split payments.
        // For now, I'll use allocation.amount and validatedData.exchangeRate
        // You might need allocation.currency and an allocation-specific exchange rate if it differs from main.
        const allocationAmountUsd = allocation.amount * validatedData.exchangeRate; // Example derivation
        const allocationAmountInPledgeCurrency = allocation.amount; // Assuming amount is in pledge currency for simplicity

        const newTotalPaid = Number(
          (currentTotalPaid + allocationAmountInPledgeCurrency).toFixed(2)
        );
        const newTotalPaidUsd = Number(
          (currentTotalPaidUsd + allocationAmountUsd).toFixed(2)
        );
        const newBalance = Number(
          Math.max(0, originalAmount - newTotalPaid).toFixed(2)
        );
        const newBalanceUsd = Number(
          Math.max(0, originalAmountUsd - newTotalPaidUsd).toFixed(2)
        );

        const newPaymentData = {
          pledgeId: allocation.pledgeId,
          amount: Number(allocation.amount.toFixed(2)).toString(), // Use allocation.amount as the 'amount' for this payment record
          currency: validatedData.currency, // Use the main payment currency
          amountUsd: Number(allocationAmountUsd.toFixed(2)).toString(), // Derived
          amountInPledgeCurrency: Number(allocationAmountInPledgeCurrency.toFixed(2)).toString(), // Derived
          exchangeRate: Number(validatedData.exchangeRate.toFixed(4)).toString(), // Use main payment exchange rate
          paymentDate: validatedData.paymentDate,
          receivedDate: validatedData.receivedDate || validatedData.paymentDate,
          methodDetail: validatedData.methodDetail || null,
          paymentMethod: validatedData.paymentMethod,
          paymentStatus: validatedData.paymentStatus,
          referenceNumber: validatedData.referenceNumber || null,
          // checkNumber: validatedData.checkNumber || null, // Not in schema, remove if not added
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
          notes: allocation.notes || null, // Use allocation specific notes if available
          // paymentPlanId: validatedData.paymentPlanId || null, // Not in schema, remove if not added
          installmentScheduleId: allocation.installmentScheduleId || null, // Allocation-specific installment ID
        };

        const paymentResult = await db
          .insert(payment)
          .values(newPaymentData)
          .returning();

        if (paymentResult.length === 0) {
          console.error(`Failed to create payment for pledge ID ${allocation.pledgeId}. Skipping.`);
          continue; // Skip this allocation and try next
        }
        createdPayments.push(paymentResult[0]);

        // Update the pledge after each payment creation for split payments
        const updateResult = await db
          .update(pledge)
          .set({
            totalPaid: newTotalPaid.toString(),
            totalPaidUsd: newTotalPaidUsd.toString(),
            balance: newBalance.toString(),
            balanceUsd: newBalanceUsd.toString(),
            updatedAt: new Date(),
          })
          .where(eq(pledge.id, allocation.pledgeId))
          .returning();

        if (updateResult.length === 0) {
          console.error("Payment created but pledge update failed for split payment", {
            paymentId: paymentResult[0].id,
            pledgeId: allocation.pledgeId,
          });
        }
      }

      if (createdPayments.length === 0) {
        return NextResponse.json(
          { error: "No payments were successfully created for split allocation." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message: "Split payments and allocations created successfully",
          payments: createdPayments, // Return all created payments
        },
        { status: 201 }
      );

    } else {
      // This is the error message from your refine method.
      return NextResponse.json(
        { error: "Invalid payment request: missing pledgeId for single payment or allocations for split payment" },
        { status: 400 }
      );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error on backend:", error.issues);
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

    console.error("Error creating payment (backend):", error);
    // TEMPORARILY NOT USING ErrorHandler.handle(error) to see raw errors more clearly
    return NextResponse.json(
      { error: "Internal Server Error", message: (error as Error).message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries()); // Convert to plain object for safeParse

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
      page = 1, // Apply default directly from parsed data
      limit = 10, // Apply default directly from parsed data
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
      conditions.push(eq(payment.pledgeId, String(pledgeId))); // Ensure pledgeId is string for eq
    }

    if (contactId) {
      conditions.push(
        sql`${payment.pledgeId} IN (SELECT id FROM ${pledge} WHERE contact_id = ${contactId})`
      );
    }

    if (solicitorId) {
      conditions.push(eq(payment.solicitorId, String(solicitorId))); // Ensure solicitorId is string for eq
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
        sql`${payment.referenceNumber} ILIKE ${"%" + search + "%"} OR ${
          payment.checkNumber
        } ILIKE ${"%" + search + "%"} OR ${payment.notes} ILIKE ${
          "%" + search + "%"
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
        amountInPledgeCurrency: payment.amountInPledgeCurrency, // Added for consistency
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
      .leftJoin(pledge, eq(payment.pledgeId, pledge.id)) // Ensure join for correct contactId filtering in count
      .where(whereClause);

    const [payments, totalCountResult] = await Promise.all([
      paymentsQuery.execute(),
      countQuery.execute(),
    ]);

    const totalCount = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      payments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: parsedParams.data, // Return parsed and validated filters
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