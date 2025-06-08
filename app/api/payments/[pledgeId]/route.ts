import { db } from "@/lib/db";
import { payment } from "@/lib/db/schema";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pledgeId: string }> }
) {
  const { pledgeId } = await params;
  const pledgeIdNum = parseInt(pledgeId, 10);

  if (isNaN(pledgeIdNum)) {
    return NextResponse.json({ error: "Invalid pledge ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const queryParams: QueryParams = QueryParamsSchema.parse({
      pledgeId: pledgeIdNum,
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "10", 10),
      search: searchParams.get("search") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
    });

    const {
      pledgeId: validatedPledgeId,
      page,
      limit,
      search,
      paymentStatus,
    } = queryParams;

    let query = db
      .select({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        amountUsd: payment.amountUsd,
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        referenceNumber: payment.referenceNumber,
        checkNumber: payment.checkNumber,
        receiptNumber: payment.receiptNumber,
        receiptIssued: payment.receiptIssued,
        notes: payment.notes,
        paymentPlanId: payment.paymentPlanId,
        pledgeId: payment.pledgeId,
      })
      .from(payment)
      .where(eq(payment.pledgeId, validatedPledgeId))
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
    query = query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(payment.paymentDate));

    const payments = await query;

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
