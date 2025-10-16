import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, desc } from "drizzle-orm";
import { payment, contact, pledge, paymentAllocations } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    // Get donor segmentation data
    const donorData = await db
      .select({
        contactId: contact.id,
        contactName: contact.displayName,
        email: contact.email,
        totalAmount: sql<number>`COALESCE(SUM(${payment.amountUsd}), 0)`,
        paymentCount: sql<number>`COUNT(${payment.id})`,
        averageAmount: sql<number>`COALESCE(AVG(${payment.amountUsd}), 0)`,
        firstPaymentDate: sql<string>`MIN(${payment.paymentDate})`,
        lastPaymentDate: sql<string>`MAX(${payment.paymentDate})`,
        yearsActive: sql<number>`COUNT(DISTINCT EXTRACT(YEAR FROM ${payment.paymentDate}))`,
        frequency: sql<string>`CASE
          WHEN COUNT(${payment.id}) >= 12 THEN 'Monthly'
          WHEN COUNT(${payment.id}) >= 4 THEN 'Quarterly'
          WHEN COUNT(${payment.id}) >= 2 THEN 'Occasional'
          ELSE 'One-time'
        END`,
      })
      .from(contact)
      .innerJoin(pledge, sql`${contact.id} = ${pledge.contactId} AND ${pledge.isActive} = true`)
      .innerJoin(payment, sql`${pledge.id} = ${payment.pledgeId} AND ${payment.paymentStatus} = 'completed'`)
      .leftJoin(paymentAllocations, sql`${paymentAllocations.paymentId} = ${payment.id}`)
      .groupBy(contact.id, contact.displayName, contact.email)
      .orderBy(desc(sql`COALESCE(SUM(${payment.amountUsd}), 0)`));

    // Convert string values to numbers and segment donors
    const processedDonorData = donorData.map(d => ({
      ...d,
      totalAmount: parseFloat(String(d.totalAmount)) || 0,
      averageAmount: parseFloat(String(d.averageAmount)) || 0,
      paymentCount: parseInt(String(d.paymentCount)) || 0,
      yearsActive: parseInt(String(d.yearsActive)) || 0,
    }));

    // Segment donors
    const segments = {
      major: processedDonorData.filter(d => d.totalAmount >= 10000),
      significant: processedDonorData.filter(d => d.totalAmount >= 1000 && d.totalAmount < 10000),
      regular: processedDonorData.filter(d => d.totalAmount >= 100 && d.totalAmount < 1000),
      small: processedDonorData.filter(d => d.totalAmount > 0 && d.totalAmount < 100),
    };

    // Frequency segments
    const frequencySegments = {
      monthly: processedDonorData.filter(d => d.frequency === 'Monthly'),
      quarterly: processedDonorData.filter(d => d.frequency === 'Quarterly'),
      occasional: processedDonorData.filter(d => d.frequency === 'Occasional'),
      onetime: processedDonorData.filter(d => d.frequency === 'One-time'),
    };

    // Summary statistics for each segment
    const segmentSummaries = {
      major: {
        count: segments.major.length,
        totalAmount: segments.major.reduce((sum, d) => sum + d.totalAmount, 0),
        averageAmount: segments.major.length > 0 ? segments.major.reduce((sum, d) => sum + d.totalAmount, 0) / segments.major.length : 0,
      },
      significant: {
        count: segments.significant.length,
        totalAmount: segments.significant.reduce((sum, d) => sum + d.totalAmount, 0),
        averageAmount: segments.significant.length > 0 ? segments.significant.reduce((sum, d) => sum + d.totalAmount, 0) / segments.significant.length : 0,
      },
      regular: {
        count: segments.regular.length,
        totalAmount: segments.regular.reduce((sum, d) => sum + d.totalAmount, 0),
        averageAmount: segments.regular.length > 0 ? segments.regular.reduce((sum, d) => sum + d.totalAmount, 0) / segments.regular.length : 0,
      },
      small: {
        count: segments.small.length,
        totalAmount: segments.small.reduce((sum, d) => sum + d.totalAmount, 0),
        averageAmount: segments.small.length > 0 ? segments.small.reduce((sum, d) => sum + d.totalAmount, 0) / segments.small.length : 0,
      },
    };

    const frequencySummaries = {
      monthly: {
        count: frequencySegments.monthly.length,
        totalAmount: frequencySegments.monthly.reduce((sum, d) => sum + d.totalAmount, 0),
        averageAmount: frequencySegments.monthly.length > 0 ? frequencySegments.monthly.reduce((sum, d) => sum + d.totalAmount, 0) / frequencySegments.monthly.length : 0,
      },
      quarterly: {
        count: frequencySegments.quarterly.length,
        totalAmount: frequencySegments.quarterly.reduce((sum, d) => sum + d.totalAmount, 0),
        averageAmount: frequencySegments.quarterly.length > 0 ? frequencySegments.quarterly.reduce((sum, d) => sum + d.totalAmount, 0) / frequencySegments.quarterly.length : 0,
      },
      occasional: {
        count: frequencySegments.occasional.length,
        totalAmount: frequencySegments.occasional.reduce((sum, d) => sum + d.totalAmount, 0),
        averageAmount: frequencySegments.occasional.length > 0 ? frequencySegments.occasional.reduce((sum, d) => sum + d.totalAmount, 0) / frequencySegments.occasional.length : 0,
      },
      onetime: {
        count: frequencySegments.onetime.length,
        totalAmount: frequencySegments.onetime.reduce((sum, d) => sum + d.totalAmount, 0),
        averageAmount: frequencySegments.onetime.length > 0 ? frequencySegments.onetime.reduce((sum, d) => sum + d.totalAmount, 0) / frequencySegments.onetime.length : 0,
      },
    };

    return NextResponse.json({
      segments: {
        major: segments.major,
        significant: segments.significant,
        regular: segments.regular,
        small: segments.small,
      },
      segmentSummaries,
      frequencySegments: {
        monthly: frequencySegments.monthly,
        quarterly: frequencySegments.quarterly,
        occasional: frequencySegments.occasional,
        onetime: frequencySegments.onetime,
      },
      frequencySummaries,
    });
  } catch (error) {
    console.error("Error fetching donor segmentation data:", error);
    return NextResponse.json(
      { error: "Failed to fetch donor segmentation data" },
      { status: 500 }
    );
  }
}