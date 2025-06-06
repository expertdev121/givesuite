import { db } from "@/lib/db";
import { payment } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pledgeId = parseInt(id, 10);

  if (isNaN(pledgeId) || pledgeId <= 0) {
    return NextResponse.json({ error: "Invalid pledge ID" }, { status: 400 });
  }

  try {
    const payments = await db
      .select({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        processedDate: payment.processedDate,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        referenceNumber: payment.referenceNumber,
        checkNumber: payment.checkNumber,
        receiptNumber: payment.receiptNumber,
        receiptIssued: payment.receiptIssued,
        receiptIssuedDate: payment.receiptIssuedDate,
        notes: payment.notes,
        paymentPlanId: payment.paymentPlanId,
      })
      .from(payment)
      .where(eq(payment.pledgeId, pledgeId))
      .orderBy(desc(payment.paymentDate));

    return NextResponse.json(
      { payments },
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
