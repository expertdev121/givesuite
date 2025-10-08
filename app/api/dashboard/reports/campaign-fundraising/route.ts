import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, eq, sum, count, desc, and } from "drizzle-orm";
import { pledge, payment, paymentAllocations } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    // Campaign & Fundraising Report: Aggregate by campaign code
    const whereConditions = [
      sql`${pledge.isActive} = true`,
      sql`${pledge.campaignCode} IS NOT NULL`,
    ];

    if (contactId && contactId !== "all") {
      whereConditions.push(eq(pledge.contactId, parseInt(contactId)));
    }

    const campaignQuery = db
      .select({
        campaignCode: pledge.campaignCode,
        totalPledges: count(pledge.id),
        totalPledgedAmount: sum(sql<number>`coalesce(${pledge.originalAmountUsd}, 0)`),
        totalPaidAmount: sum(sql<number>`coalesce(${pledge.totalPaidUsd}, 0)`),
        totalBalance: sum(sql<number>`coalesce(${pledge.balanceUsd}, 0)`),
      })
      .from(pledge)
      .where(and(...whereConditions))
      .groupBy(pledge.campaignCode)
      .orderBy(desc(sum(sql<number>`coalesce(${pledge.totalPaidUsd}, 0)`)));

    const campaignData = await campaignQuery;

    // Format the data
    const formattedData = campaignData.map((item) => ({
      campaignCode: item.campaignCode || "No Campaign",
      totalPledges: item.totalPledges || 0,
      totalPledgedAmount: item.totalPledgedAmount || 0,
      totalPaidAmount: item.totalPaidAmount || 0,
      totalBalance: item.totalBalance || 0,
    }));

    return NextResponse.json({
      campaigns: formattedData,
      summary: {
        totalCampaigns: formattedData.length,
        totalPledges: formattedData.reduce((sum, item) => sum + Number(item.totalPledges), 0),
        totalPledgedAmount: formattedData.reduce((sum, item) => sum + Number(item.totalPledgedAmount), 0),
        totalPaidAmount: formattedData.reduce((sum, item) => sum + Number(item.totalPaidAmount), 0),
        totalBalance: formattedData.reduce((sum, item) => sum + Number(item.totalBalance), 0),
      },
    });
  } catch (error) {
    console.error("Error fetching campaign fundraising data:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign fundraising data" },
      { status: 500 }
    );
  }
}
