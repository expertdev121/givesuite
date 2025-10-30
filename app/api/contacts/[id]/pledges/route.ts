import { db } from "@/lib/db";
import {
  pledge,
  category,
  contact,
  paymentPlan,
  installmentSchedule,
  relationships,
  payment,
  paymentAllocations,
  pledgeTags,
  tag,
} from "@/lib/db/schema";
import { sql, eq, and, or, gte, lte, ilike, SQL, not, isNull, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { alias } from "drizzle-orm/pg-core";

// Define types
interface ScheduledItem {
  pledgeId: number | null;
  totalScheduled: string;
}

interface PledgeRow {
  id: number;
  contactId: number;
  categoryId: number | null;
  pledgeDate: string;
  description: string | null;
  originalAmount: string;
  currency: string;
  originalAmountUsd: string | null;
  exchangeRate: string | null;
  campaignCode: string | null;
  totalPaid: string;
  totalPaidUsd: string | null;
  balance: string;
  balanceUsd: string | null;
  notes: string | null;
  categoryName: string | null;
  categoryDescription: string | null;
  progressPercentage: number;
  relationshipId: number | null;
  relationshipType: string | null;
  relationshipIsActive: boolean | null;
  relationshipNotes: string | null;
  relatedContactId: number | null;
  relatedContactFirstName: string | null;
  relatedContactLastName: string | null;
  relatedContactEmail: string | null;
  relatedContactPhone: string | null;
}

interface PledgeTagResult {
  pledgeId: number;
  tagId: number;
  tagName: string;
  tagDescription: string | null;
  showOnPayment: boolean;
  showOnPledge: boolean;
  isActive: boolean;
}

// Define types for payment plan data
interface PaymentPlanData {
  totalScheduledAmount: string;
  activePlanCount: number;
  hasActivePlan: boolean;
}

interface InstallmentScheduleItem {
  id: number;
  installmentDate: string | null;
  installmentAmount: string | null;
  currency: string | null;
  status: string | null;
  paidDate: string | null;
  notes: string | null;
}

interface DetailedPaymentPlan {
  planName: string | null;
  frequency: string | null;
  distributionType: string | null;
  totalPlannedAmount: string | null;
  installmentAmount: string | null;
  numberOfInstallments: number | null;
  installmentsPaid: number | null;
  nextPaymentDate: string | null;
  planStatus: string | null;
  autoRenew: boolean | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  installmentSchedule: InstallmentScheduleItem[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactId = parseInt(id, 10);

    const { searchParams } = new URL(request.url);

    if (isNaN(contactId) || contactId <= 0) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    const categoryId = searchParams.get("categoryId")
      ? parseInt(searchParams.get("categoryId")!, 10)
      : null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid limit, must be between 1 and 100" },
        { status: 400 }
      );
    }

    if (categoryId && (isNaN(categoryId) || categoryId <= 0)) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    // Get scheduled amounts - only payments without receive date and status expected/pending/processing
    const scheduledPaymentsMap: Map<number, string> = new Map();
    const scheduledAllocationsMap: Map<number, string> = new Map();

    try {
      // Get scheduled payments
      const scheduledPayments = await db
        .select({
          pledgeId: payment.pledgeId,
          totalScheduled: sql<string>`COALESCE(SUM(${payment.amountInPledgeCurrency}::numeric), 0)`.as("totalScheduled"),
        })
        .from(payment)
        .where(and(
          not(isNull(payment.pledgeId)),
          isNull(payment.receivedDate), // No receive date
          or(
            eq(payment.paymentStatus, "pending"),
            eq(payment.paymentStatus, "expected"),
            eq(payment.paymentStatus, "processing")
          )
        ))
        .groupBy(payment.pledgeId);

      scheduledPayments.forEach((item: ScheduledItem) => {
        if (item.pledgeId !== null) {
          scheduledPaymentsMap.set(item.pledgeId, item.totalScheduled);
        }
      });

      // Get scheduled payment allocations (for split payments without receive date)
      const scheduledAllocations = await db
        .select({
          pledgeId: paymentAllocations.pledgeId,
          totalScheduled: sql<string>`COALESCE(SUM(${paymentAllocations.allocatedAmountInPledgeCurrency}::numeric), 0)`.as("totalScheduled"),
        })
        .from(paymentAllocations)
        .innerJoin(payment, eq(paymentAllocations.paymentId, payment.id))
        .where(and(
          isNull(payment.receivedDate), // No receive date
          or(
            eq(payment.paymentStatus, "pending"),
            eq(payment.paymentStatus, "expected"),
            eq(payment.paymentStatus, "processing")
          )
        ))
        .groupBy(paymentAllocations.pledgeId);

      scheduledAllocations.forEach((item: ScheduledItem) => {
        if (item.pledgeId !== null) {
          scheduledAllocationsMap.set(item.pledgeId, item.totalScheduled);
        }
      });
    } catch (scheduledError) {
      console.warn('Warning: Could not fetch scheduled payments data, using default values:', scheduledError);
    }

    // Get payment plan data for backward compatibility
    let paymentPlanData: Record<number, PaymentPlanData> = {};

    try {
      const scheduledData = await db
        .select({
          pledgeId: paymentPlan.pledgeId,
          totalScheduledAmount: sql<string>`COALESCE(SUM(${paymentPlan.totalPlannedAmount}), '0')`.as('totalScheduledAmount'),
          activePlanCount: sql<number>`COUNT(*)`.as('activePlanCount'),
        })
        .from(paymentPlan)
        .where(
          and(
            eq(paymentPlan.isActive, true),
            eq(paymentPlan.planStatus, 'active')
          )
        )
        .groupBy(paymentPlan.pledgeId);

      // Convert to lookup object with additional metadata
      paymentPlanData = scheduledData.reduce((acc, item) => {
        acc[item.pledgeId] = {
          totalScheduledAmount: item.totalScheduledAmount,
          activePlanCount: item.activePlanCount,
          hasActivePlan: parseFloat(item.totalScheduledAmount) > 0
        };
        return acc;
      }, {} as Record<number, PaymentPlanData>);
    } catch (paymentPlanError) {
      console.warn('Warning: Could not fetch payment plan data, using default values:', paymentPlanError);
    }

    let detailedPaymentPlans: Record<number, DetailedPaymentPlan> = {};
    
    try {
      const paymentPlansWithSchedule = await db
        .select({
          pledgeId: paymentPlan.pledgeId,
          planId: paymentPlan.id,
          planName: paymentPlan.planName,
          frequency: paymentPlan.frequency,
          distributionType: paymentPlan.distributionType,
          totalPlannedAmount: paymentPlan.totalPlannedAmount,
          installmentAmount: paymentPlan.installmentAmount,
          numberOfInstallments: paymentPlan.numberOfInstallments,
          installmentsPaid: paymentPlan.installmentsPaid,
          nextPaymentDate: paymentPlan.nextPaymentDate,
          planStatus: paymentPlan.planStatus,
          autoRenew: paymentPlan.autoRenew,
          notes: paymentPlan.notes,
          startDate: paymentPlan.startDate,
          endDate: paymentPlan.endDate,
          // Installment schedule fields
          scheduleId: installmentSchedule.id,
          installmentDate: installmentSchedule.installmentDate,
          scheduleInstallmentAmount: installmentSchedule.installmentAmount,
          scheduleCurrency: installmentSchedule.currency,
          scheduleStatus: installmentSchedule.status,
          paidDate: installmentSchedule.paidDate,
          scheduleNotes: installmentSchedule.notes,
        })
        .from(paymentPlan)
        .leftJoin(installmentSchedule, eq(paymentPlan.id, installmentSchedule.paymentPlanId))
        .where(
          and(
            eq(paymentPlan.isActive, true),
            eq(paymentPlan.planStatus, 'active')
          )
        )
        .orderBy(installmentSchedule.installmentDate);

      // Group by pledge ID and organize the data
      detailedPaymentPlans = paymentPlansWithSchedule.reduce((acc, row) => {
        if (!acc[row.pledgeId]) {
          acc[row.pledgeId] = {
            planName: row.planName,
            frequency: row.frequency,
            distributionType: row.distributionType,
            totalPlannedAmount: row.totalPlannedAmount,
            installmentAmount: row.installmentAmount,
            numberOfInstallments: row.numberOfInstallments,
            installmentsPaid: row.installmentsPaid,
            nextPaymentDate: row.nextPaymentDate,
            planStatus: row.planStatus,
            autoRenew: row.autoRenew,
            notes: row.notes,
            startDate: row.startDate,
            endDate: row.endDate,
            installmentSchedule: []
          };
        }

        // Add installment schedule if it exists
        if (row.scheduleId) {
          acc[row.pledgeId].installmentSchedule.push({
            id: row.scheduleId,
            installmentDate: row.installmentDate,
            installmentAmount: row.scheduleInstallmentAmount,
            currency: row.scheduleCurrency,
            status: row.scheduleStatus,
            paidDate: row.paidDate,
            notes: row.scheduleNotes,
          });
        }

        return acc;
      }, {} as Record<number, DetailedPaymentPlan>);

    } catch (paymentPlanDetailError) {
      console.warn('Warning: Could not fetch detailed payment plan data:', paymentPlanDetailError);
      // Continue without detailed payment plan data
    }

    // Create alias for related contact to avoid conflicts
    const relatedContact = alias(contact, "related_contact");

    // Build main query conditions
    const conditions: SQL<unknown>[] = [];

    // Always filter by contactId
    conditions.push(eq(pledge.contactId, contactId));

    if (categoryId) {
      conditions.push(eq(pledge.categoryId, categoryId));
    }
    if (startDate) {
      conditions.push(gte(pledge.pledgeDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(pledge.pledgeDate, endDate));
    }
    if (status === "fullyPaid") {
      conditions.push(eq(pledge.balance, "0"));
    } else if (status === "partiallyPaid") {
      conditions.push(
        and(
          sql`${pledge.balance}::numeric > 0`,
          sql`${pledge.totalPaid}::numeric > 0`
        )!
      );
    } else if (status === "unpaid") {
      conditions.push(eq(pledge.totalPaid, "0"));
    }
    if (search) {
      const searchConditions: SQL<unknown>[] = [];
      searchConditions.push(
        ilike(sql`COALESCE(${pledge.description}, '')`, `%${search}%`)
      );
      searchConditions.push(
        ilike(sql`COALESCE(${pledge.notes}, '')`, `%${search}%`)
      );
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions)!);
      }
    }

    // Build main query with relationship joins
    let query = db
      .select({
        id: pledge.id,
        contactId: pledge.contactId,
        categoryId: pledge.categoryId,
        pledgeDate: pledge.pledgeDate,
        description: pledge.description,
        originalAmount: pledge.originalAmount,
        currency: pledge.currency,
        originalAmountUsd: pledge.originalAmountUsd,
        exchangeRate: pledge.exchangeRate,
        campaignCode: pledge.campaignCode,
        totalPaid: pledge.totalPaid,
        totalPaidUsd: pledge.totalPaidUsd,
        balance: pledge.balance,
        balanceUsd: pledge.balanceUsd,
        notes: pledge.notes,
        categoryName: category.name,
        categoryDescription: category.description,
        progressPercentage: sql<number>`
          CASE
            WHEN ${pledge.originalAmount}::numeric > 0
            THEN (${pledge.totalPaid}::numeric / ${pledge.originalAmount}::numeric) * 100
            ELSE 0
          END
        `,
        // Relationship fields
        relationshipId: pledge.relationshipId,
        relationshipType: relationships.relationshipType,
        relationshipIsActive: relationships.isActive,
        relationshipNotes: relationships.notes,
        // Related contact fields
        relatedContactId: relatedContact.id,
        relatedContactFirstName: relatedContact.firstName,
        relatedContactLastName: relatedContact.lastName,
        relatedContactEmail: relatedContact.email,
        relatedContactPhone: relatedContact.phone,
      })
      .from(pledge)
      .leftJoin(category, eq(pledge.categoryId, category.id))
      .leftJoin(contact, eq(pledge.contactId, contact.id))
      .leftJoin(relationships, eq(pledge.relationshipId, relationships.id))
      .leftJoin(relatedContact, eq(relationships.relatedContactId, relatedContact.id))
      .$dynamic();

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const pledgesData = await query;

    console.log(`=== PLEDGES API DEBUG: Found ${pledgesData.length} pledges for contact ${contactId} ===`);

    // Debug first pledge relationship data
    if (pledgesData.length > 0) {
      const firstPledge = pledgesData[0];
      console.log("=== PLEDGES API DEBUG: First pledge data ===", {
        pledgeId: firstPledge.id,
        contactId: firstPledge.contactId,
        categoryId: firstPledge.categoryId,
        categoryName: firstPledge.categoryName,
        relationshipId: firstPledge.relationshipId,
        relationshipType: firstPledge.relationshipType,
        relatedContactId: firstPledge.relatedContactId,
        relatedContactName: `${firstPledge.relatedContactFirstName || ''} ${firstPledge.relatedContactLastName || ''}`.trim(),
      });
    }

    // Get tags for all pledges
    const pledgeTagsMap = new Map<number, Array<{
      id: number;
      name: string;
      description: string | null;
      showOnPayment: boolean;
      showOnPledge: boolean;
      isActive: boolean;
    }>>();

    try {
      const pledgeIds = pledgesData.map(p => p.id);
      
      if (pledgeIds.length > 0) {
        const pledgeTagsQuery = await db
          .select({
            pledgeId: pledgeTags.pledgeId,
            tagId: tag.id,
            tagName: tag.name,
            tagDescription: tag.description,
            showOnPayment: tag.showOnPayment,
            showOnPledge: tag.showOnPledge,
            isActive: tag.isActive,
          })
          .from(pledgeTags)
          .innerJoin(tag, eq(pledgeTags.tagId, tag.id))
          .where(
            and(
              inArray(pledgeTags.pledgeId, pledgeIds),
              eq(tag.isActive, true)
            )
          );

        pledgeTagsQuery.forEach((tagResult: PledgeTagResult) => {
          if (!pledgeTagsMap.has(tagResult.pledgeId)) {
            pledgeTagsMap.set(tagResult.pledgeId, []);
          }
          pledgeTagsMap.get(tagResult.pledgeId)!.push({
            id: tagResult.tagId,
            name: tagResult.tagName,
            description: tagResult.tagDescription,
            showOnPayment: tagResult.showOnPayment,
            showOnPledge: tagResult.showOnPledge,
            isActive: tagResult.isActive,
          });
        });
      }
    } catch (tagError) {
      console.warn('Warning: Could not fetch pledge tags:', tagError);
    }

    // Post-process the results to add payment plan information, relationship data, and tags
    const pledges = pledgesData.map((pledge: PledgeRow) => {
      // Calculate scheduled amounts from payments (new logic)
      const scheduledPaymentAmount = parseFloat(scheduledPaymentsMap.get(pledge.id) || "0");
      const scheduledAllocationAmount = parseFloat(scheduledAllocationsMap.get(pledge.id) || "0");
      const totalScheduledAmount = scheduledPaymentAmount + scheduledAllocationAmount;
      const scheduledAmount = totalScheduledAmount.toString();

      // Keep payment plan data for backward compatibility
      const planData = paymentPlanData[pledge.id];
      const detailedPlan = detailedPaymentPlans[pledge.id];
      const activePlanCount = planData?.activePlanCount || 0;
      const hasActivePlan = planData?.hasActivePlan || false;

      const scheduledAmountNum = totalScheduledAmount;
      const balanceNum = parseFloat(pledge.balance);

      // Calculate unscheduled amount (balance minus scheduled amount, but not negative)
      const unscheduledAmount = Math.max(0, balanceNum - scheduledAmountNum).toString();

      // Structure relationship data for frontend
      const relationship = pledge.relationshipId ? {
        id: pledge.relationshipId,
        type: pledge.relationshipType,
        isActive: pledge.relationshipIsActive,
        notes: pledge.relationshipNotes,
        relatedContact: pledge.relatedContactId ? {
          id: pledge.relatedContactId,
          firstName: pledge.relatedContactFirstName,
          lastName: pledge.relatedContactLastName,
          email: pledge.relatedContactEmail,
          phone: pledge.relatedContactPhone,
          fullName: `${pledge.relatedContactFirstName || ""} ${pledge.relatedContactLastName || ""}`.trim(),
        } : null,
        label: `${pledge.relationshipType || ""} - ${pledge.relatedContactFirstName || ""} ${pledge.relatedContactLastName || ""}`.trim(),
      } : null;

      // Get tags for this pledge
      const tags = pledgeTagsMap.get(pledge.id) || [];

      // Structure category data
      const category = pledge.categoryId ? {
        id: pledge.categoryId,
        name: pledge.categoryName,
        description: pledge.categoryDescription,
      } : null;

      return {
        ...pledge,
        // Structured category
        category,
        // Tags
        tags,
        // Payment plan related fields (existing functionality)
        scheduledAmount,
        unscheduledAmount,
        activePlanCount,
        hasActivePlan,
        // Additional computed fields for UI (existing functionality)
        paymentPlanStatus: hasActivePlan ? 'active' : 'none',
        schedulePercentage: balanceNum > 0 ?
          (scheduledAmountNum / balanceNum) * 100 : 0,
        // Detailed payment plan information (existing functionality)
        paymentPlan: detailedPlan || null,
        // Relationship data for frontend
        relationship,
      };
    });

    // Count pledges with relationships and tags for debugging
    const pledgesWithRelationships = pledges.filter(p => p.relationship);
    const pledgesWithTags = pledges.filter(p => p.tags.length > 0);
    console.log(`=== PLEDGES API DEBUG: ${pledgesWithRelationships.length} out of ${pledges.length} pledges have relationships ===`);
    console.log(`=== PLEDGES API DEBUG: ${pledgesWithTags.length} out of ${pledges.length} pledges have tags ===`);

    // Get total count for pagination
    const totalCountQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(pledge)
      .leftJoin(contact, eq(pledge.contactId, contact.id));
    
    if (conditions.length > 0) {
      totalCountQuery.where(and(...conditions));
    }
    
    const [{ count: totalCount }] = await totalCountQuery;

    return NextResponse.json({ 
      pledges,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching pledges:', error);
    return NextResponse.json(
      { error: "Failed to fetch pledges", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}