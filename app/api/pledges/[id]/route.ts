import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { pledge, contact, category } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pledgeId = parseInt(id, 10);

  if (isNaN(pledgeId) || pledgeId <= 0) {
    return NextResponse.json({ error: "Invalid pledge ID" }, { status: 400 });
  }

  const cacheKey = `pledge_${pledgeId}`;
  const cacheTags = [`pledge_${pledgeId}`, "pledges"];

  const getPledgeData = unstable_cache(
    async (id: number) => {
      try {
        const [pledgeData] = await db
          .select({
            pledge: {
              id: pledge.id,
              pledgeDate: pledge.pledgeDate,
              description: pledge.description,
              originalAmount: pledge.originalAmount,
              currency: pledge.currency,
              totalPaid: pledge.totalPaid,
              balance: pledge.balance,
              originalAmountUsd: pledge.originalAmountUsd,
              totalPaidUsd: pledge.totalPaidUsd,
              balanceUsd: pledge.balanceUsd,
              isActive: pledge.isActive,
              notes: pledge.notes,
              createdAt: pledge.createdAt,
              updatedAt: pledge.updatedAt,
            },
            contact: {
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
            },
            category: {
              id: category.id,
              name: category.name,
              description: category.description,
            },
          })
          .from(pledge)
          .leftJoin(contact, eq(pledge.contactId, contact.id))
          .leftJoin(category, eq(pledge.categoryId, category.id))
          .where(eq(pledge.id, id))
          .limit(1);

        if (!pledgeData) {
          return { error: "Pledge not found", status: 404 };
        }

        return {
          data: {
            pledge: {
              ...pledgeData.pledge,
              contact: pledgeData.contact,
              category: pledgeData.category,
            },
          },
          status: 200,
        };
      } catch (error) {
        console.error("Failed to fetch pledge", {
          pledgeId: id,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        return { error: "Failed to fetch pledge", status: 500 };
      }
    },
    [cacheKey],
    {
      tags: cacheTags,
      revalidate: 3600, // Cache for 1 hour
    }
  );

  const result = await getPledgeData(pledgeId);

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
