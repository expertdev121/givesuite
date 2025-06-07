import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { paymentPlan, pledge, contact } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id, 10);

  if (isNaN(planId) || planId <= 0) {
    return NextResponse.json(
      { error: "Invalid payment plan ID" },
      { status: 400 }
    );
  }

  const cacheKey = `payment_plan_${planId}`;
  const cacheTags = [`payment_plan_${planId}`, "payment_plans"];

  const getPaymentPlanData = unstable_cache(
    async (id: number) => {
      try {
        const [planData] = await db
          .select({
            paymentPlan: {
              id: paymentPlan.id,
              planName: paymentPlan.planName,
              frequency: paymentPlan.frequency,
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
            },
            pledge: {
              id: pledge.id,
              pledgeDate: pledge.pledgeDate,
              originalAmount: pledge.originalAmount,
              currency: pledge.currency,
            },
            contact: {
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
            },
          })
          .from(paymentPlan)
          .leftJoin(pledge, eq(paymentPlan.pledgeId, pledge.id))
          .leftJoin(contact, eq(pledge.contactId, contact.id))
          .where(eq(paymentPlan.id, id))
          .limit(1);

        if (!planData) {
          return { error: "Payment plan not found", status: 404 };
        }

        return {
          data: {
            paymentPlan: {
              ...planData.paymentPlan,
              pledge: planData.pledge,
              contact: planData.contact,
            },
          },
          status: 200,
        };
      } catch (error) {
        console.error("Failed to fetch payment plan", {
          planId: id,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        return { error: "Failed to fetch payment plan", status: 500 };
      }
    },
    [cacheKey],
    {
      tags: cacheTags,
      revalidate: 3600, // Cache for 1 hour
    }
  );

  const result = await getPaymentPlanData(planId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
