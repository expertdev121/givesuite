import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";
import { pledge, NewPledge } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { pledgeSchema } from "@/lib/form-schemas/pledge-schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = pledgeSchema.parse(body);

    const existingPledge = await db
      .select()
      .from(pledge)
      .where(
        and(
          eq(pledge.contactId, validatedData.contactId),
          eq(
            pledge.pledgeDate,
            new Date(validatedData.pledgeDate).toISOString().split("T")[0]
          ),
          eq(pledge.originalAmount, validatedData.originalAmount.toString()),
          eq(pledge.currency, validatedData.currency),
          eq(pledge.isActive, true)
        )
      )
      .limit(1);

    if (existingPledge.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate pledge",
          message: `Active pledge for contact ${validatedData.contactId} on ${validatedData.pledgeDate} with amount ${validatedData.originalAmount} ${validatedData.currency} already exists`,
        },
        { status: 409 }
      );
    }

    const newPledge: NewPledge = {
      ...validatedData,
      pledgeDate: new Date(validatedData.pledgeDate)
        .toISOString()
        .split("T")[0],
      originalAmount: validatedData.originalAmount.toFixed(2),
      totalPaid: validatedData.totalPaid.toFixed(2),
      balance: validatedData.balance.toFixed(2),
      originalAmountUsd: validatedData.originalAmountUsd
        ? validatedData.originalAmountUsd.toFixed(2)
        : undefined,
      totalPaidUsd: validatedData.totalPaidUsd
        ? validatedData.totalPaidUsd.toFixed(2)
        : undefined,
      balanceUsd: validatedData.balanceUsd
        ? validatedData.balanceUsd.toFixed(2)
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(pledge).values(newPledge).returning();

    return NextResponse.json(
      {
        message: "Pledge created successfully",
        pledge: result[0],
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
