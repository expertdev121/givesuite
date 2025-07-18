import { db } from "@/lib/db";
import { payment, solicitor, contact } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const period = searchParams.get("period") || "all"; // 'month', 'quarter', 'year', 'all'

    let dateCondition = sql`TRUE`;
    const now = new Date();

    switch (period) {
      case "month":
        const monthAgo = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        dateCondition = sql`${payment.paymentDate} >= ${
          monthAgo.toISOString().split("T")[0]
        }`;
        break;
      case "quarter":
        const quarterAgo = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        dateCondition = sql`${payment.paymentDate} >= ${
          quarterAgo.toISOString().split("T")[0]
        }`;
        break;
      case "year":
        const yearAgo = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        dateCondition = sql`${payment.paymentDate} >= ${
          yearAgo.toISOString().split("T")[0]
        }`;
        break;
    }

    const topPerformers = await db
      .select({
        solicitorId: solicitor.id,
        solicitorCode: solicitor.solicitorCode,
        firstName: contact.firstName,
        lastName: contact.lastName,
        totalRaised: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentsCount: sql<number>`COUNT(${payment.id})`,
        totalBonus: sql<number>`COALESCE(SUM(${payment.bonusAmount}), 0)`,
        avgPaymentSize: sql<number>`COALESCE(AVG(${payment.amountUsd}), 0)`,
      })
      .from(solicitor)
      .innerJoin(contact, eq(solicitor.contactId, contact.id))
      .leftJoin(payment, eq(payment.solicitorId, solicitor.id))
      .where(and(eq(solicitor.status, "active"), dateCondition))
      .groupBy(
        solicitor.id,
        solicitor.solicitorCode,
        contact.firstName,
        contact.lastName
      )
      .orderBy(sql`SUM(${payment.amountUsd}) DESC NULLS LAST`)
      .limit(limit);

    return NextResponse.json({ topPerformers });
  } catch (error) {
    console.error("Error fetching top performers:", error);
    return NextResponse.json(
      { error: "Failed to fetch top performers" },
      { status: 500 }
    );
  }
}
