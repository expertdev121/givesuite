import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, gte, lte, desc } from "drizzle-orm";
import {
  payment,
  pledge,
  paymentPlan,
  installmentSchedule,
  contact,
  paymentAllocations
} from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter condition for payments
    let dateFilter = sql`1=1`;
    if (startDate && endDate) {
      dateFilter = sql`${payment.paymentDate} >= ${startDate} AND ${payment.paymentDate} <= ${endDate}`;
    } else if (startDate) {
      dateFilter = sql`${payment.paymentDate} >= ${startDate}`;
    } else if (endDate) {
      dateFilter = sql`${payment.paymentDate} <= ${endDate}`;
    }

    // Total contacts
    const totalContacts = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(contact);

    // Third-party payments count
    const thirdPartyPayments = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
      })
      .from(payment)
      .where(sql`${payment.isThirdPartyPayment} = true AND ${payment.paymentStatus} = 'completed' AND ${dateFilter}`);

    // Total payments
    const totalPayments = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
      })
      .from(payment)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${dateFilter}`);

    // Payments by method
    const paymentsByMethod = await db
      .select({
        method: payment.paymentMethod,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
      })
      .from(payment)
      .where(sql`${payment.paymentStatus} = 'completed' AND ${dateFilter}`)
      .groupBy(payment.paymentMethod)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

    // Payments by status
    const paymentsByStatus = await db
      .select({
        status: payment.paymentStatus,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
      })
      .from(payment)
      .where(dateFilter)
      .groupBy(payment.paymentStatus)
      .orderBy(desc(sql`COUNT(*)`));

    // Total pledges
    let pledgeWhere = sql`${pledge.isActive} = true`;
    if (startDate || endDate) {
      if (startDate && endDate) {
        pledgeWhere = sql`${pledgeWhere} AND ${pledge.pledgeDate} >= ${startDate} AND ${pledge.pledgeDate} <= ${endDate}`;
      } else if (startDate) {
        pledgeWhere = sql`${pledgeWhere} AND ${pledge.pledgeDate} >= ${startDate}`;
      } else if (endDate) {
        pledgeWhere = sql`${pledgeWhere} AND ${pledge.pledgeDate} <= ${endDate}`;
      }
    }
    const totalPledges = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalPledged: sql<number>`COALESCE(SUM(${pledge.originalAmountUsd}), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(${pledge.totalPaidUsd}), 0)`,
        totalBalance: sql<number>`COALESCE(SUM(${pledge.balanceUsd}), 0)`,
      })
      .from(pledge)
      .where(pledgeWhere);

    // Upcoming scheduled payments (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let upcomingWhere = sql`${installmentSchedule.status} = 'pending' AND ${installmentSchedule.installmentDate} <= ${thirtyDaysFromNow.toISOString().split('T')[0]}`;
    if (startDate || endDate) {
      if (startDate && endDate) {
        upcomingWhere = sql`${upcomingWhere} AND ${pledge.pledgeDate} >= ${startDate} AND ${pledge.pledgeDate} <= ${endDate}`;
      } else if (startDate) {
        upcomingWhere = sql`${upcomingWhere} AND ${pledge.pledgeDate} >= ${startDate}`;
      } else if (endDate) {
        upcomingWhere = sql`${upcomingWhere} AND ${pledge.pledgeDate} <= ${endDate}`;
      }
    }
    const upcomingPayments = await db
      .select({
        id: installmentSchedule.id,
        installmentDate: installmentSchedule.installmentDate,
        amount: installmentSchedule.installmentAmount,
        currency: installmentSchedule.currency,
        amountUsd: installmentSchedule.installmentAmountUsd,
        planName: paymentPlan.planName,
        contactName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
      })
      .from(installmentSchedule)
      .innerJoin(paymentPlan, sql`${installmentSchedule.paymentPlanId} = ${paymentPlan.id}`)
      .innerJoin(pledge, sql`${paymentPlan.pledgeId} = ${pledge.id}`)
      .innerJoin(contact, sql`${pledge.contactId} = ${contact.id}`)
      .where(upcomingWhere)
      .orderBy(installmentSchedule.installmentDate)
      .limit(20);

    // Top contacts by payments (total amount paid)
    let topContactsWhere = sql`(${payment.paymentStatus} = 'completed' OR ${paymentAllocations.id} IS NOT NULL) AND ${dateFilter}`;
    if (startDate || endDate) {
      if (startDate && endDate) {
        topContactsWhere = sql`${topContactsWhere} AND ${pledge.pledgeDate} >= ${startDate} AND ${pledge.pledgeDate} <= ${endDate}`;
      } else if (startDate) {
        topContactsWhere = sql`${topContactsWhere} AND ${pledge.pledgeDate} >= ${startDate}`;
      } else if (endDate) {
        topContactsWhere = sql`${topContactsWhere} AND ${pledge.pledgeDate} <= ${endDate}`;
      }
    }
    const topContacts = await db
      .select({
        contactId: contact.id,
        contactName: sql<string>`CONCAT(${contact.firstName}, ' ', ${contact.lastName})`,
        totalPaid: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
      })
      .from(contact)
      .leftJoin(pledge, sql`${contact.id} = ${pledge.contactId}`)
      .leftJoin(payment, sql`${pledge.id} = ${payment.pledgeId}`)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.pledgeId} = ${pledge.id}`)
      .where(topContactsWhere)
      .groupBy(contact.id, contact.firstName, contact.lastName)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`))
      .limit(10);

    // Payment types (same as by method, but formatted differently)
    const paymentTypes = paymentsByMethod.map(item => ({
      type: item.method,
      count: item.count,
      amount: item.totalAmount,
    }));

    return NextResponse.json({
      summary: {
        totalContacts: totalContacts[0]?.count || 0,
        totalPayments: totalPayments[0] || { count: 0, totalAmount: 0 },
        totalPledges: totalPledges[0] || { count: 0, totalPledged: 0, totalPaid: 0, totalBalance: 0 },
        thirdPartyPayments: thirdPartyPayments[0] || { count: 0, totalAmount: 0 },
      },
      paymentsByMethod,
      paymentsByStatus,
      upcomingPayments,
      topContacts,
      paymentTypes,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
