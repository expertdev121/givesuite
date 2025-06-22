import { db } from "@/lib/db";
import { solicitor } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const solicitorId = parseInt(id, 10);
  try {
    const body = await request.json();
    const updatedSolicitor = await db
      .update(solicitor)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(solicitor.id, solicitorId))
      .returning();

    if (updatedSolicitor.length === 0) {
      return NextResponse.json(
        { error: "Solicitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ solicitor: updatedSolicitor[0] });
  } catch (error) {
    console.error("Error updating solicitor:", error);
    return NextResponse.json(
      { error: "Failed to update solicitor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const solicitorId = parseInt(id, 10);
  try {
    const deletedSolicitor = await db
      .delete(solicitor)
      .where(eq(solicitor.id, solicitorId))
      .returning();

    if (deletedSolicitor.length === 0) {
      return NextResponse.json(
        { error: "Solicitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Solicitor deleted successfully" });
  } catch (error) {
    console.error("Error deleting solicitor:", error);
    return NextResponse.json(
      { error: "Failed to delete solicitor" },
      { status: 500 }
    );
  }
}
