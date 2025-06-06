import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";
import { payment, NewPayment } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const paymentSchema = z
  .object({
    pledgeId: z.number().positive(),
    paymentPlanId: z.number().positive().optional(),
    amount: z.number().positive("Amount must be positive"),
    currency: z
      .enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"])
      .default("USD"),
    amountUsd: z.number().positive("Amount in USD must be positive").optional(),
    exchangeRate: z
      .number()
      .positive("Exchange rate must be positive")
      .optional(),
    paymentDate: z.string().datetime().or(z.date()),
    receivedDate: z.string().datetime().or(z.date()).optional(),
    processedDate: z.string().datetime().or(z.date()).optional(),
    paymentMethod: z.enum([
      "credit_card",
      "cash",
      "check",
      "bank_transfer",
      "paypal",
      "wire_transfer",
      "other",
    ]),
    paymentStatus: z
      .enum([
        "pending",
        "completed",
        "failed",
        "cancelled",
        "refunded",
        "processing",
      ])
      .default("completed"),
    referenceNumber: z.string().optional(),
    checkNumber: z.string().optional(),
    receiptNumber: z.string().optional(),
    receiptType: z
      .enum(["invoice", "confirmation", "receipt", "other"])
      .optional(),
    receiptIssued: z.boolean().default(false),
    receiptIssuedDate: z.string().datetime().or(z.date()).optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
    createdBy: z.number().positive().optional(),
    lastModifiedBy: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      if (data.receiptIssued && !data.receiptIssuedDate) {
        return false;
      }
      return true;
    },
    {
      message: "Receipt issued date is required when receipt is issued",
      path: ["receiptIssuedDate"],
    }
  )
  .refine(
    (data) => {
      if (data.amountUsd && data.exchangeRate) {
        return (
          Math.abs(data.amountUsd - data.amount * data.exchangeRate) < 0.01
        );
      }
      return true;
    },
    {
      message: "Amount in USD must equal amount multiplied by exchange rate",
      path: ["amountUsd"],
    }
  );

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    const existingPayment = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.pledgeId, validatedData.pledgeId),
          eq(
            payment.paymentDate,
            new Date(validatedData.paymentDate).toISOString().split("T")[0]
          ),
          eq(payment.amount, validatedData.amount.toString()),
          eq(payment.currency, validatedData.currency),
          eq(payment.paymentMethod, validatedData.paymentMethod),
          eq(payment.paymentStatus, "completed")
        )
      )
      .limit(1);

    if (existingPayment.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate payment",
          message: `Completed payment for pledge ${validatedData.pledgeId} on ${validatedData.paymentDate} with amount ${validatedData.amount} ${validatedData.currency} via ${validatedData.paymentMethod} already exists`,
        },
        { status: 409 }
      );
    }

    const newPayment: NewPayment = {
      ...validatedData,
      paymentDate: new Date(validatedData.paymentDate)
        .toISOString()
        .split("T")[0],
      receivedDate: validatedData.receivedDate
        ? new Date(validatedData.receivedDate).toISOString().split("T")[0]
        : undefined,
      processedDate: validatedData.processedDate
        ? new Date(validatedData.processedDate).toISOString().split("T")[0]
        : undefined,
      receiptIssuedDate: validatedData.receiptIssuedDate
        ? new Date(validatedData.receiptIssuedDate).toISOString().split("T")[0]
        : undefined,
      amount: validatedData.amount.toFixed(2),
      amountUsd: validatedData.amountUsd
        ? validatedData.amountUsd.toFixed(2)
        : undefined,
      exchangeRate: validatedData.exchangeRate
        ? validatedData.exchangeRate.toFixed(4)
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(payment).values(newPayment).returning();

    return NextResponse.json(
      {
        message: "Payment created successfully",
        payment: result[0],
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
