import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { relationships } from "@/lib/db/schema";
import { ErrorHandler } from "@/lib/error-handler";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const relationshipId = parseInt(id, 10);

  try {
    if (isNaN(relationshipId)) {
      return NextResponse.json(
        { error: "Invalid relationship ID" },
        { status: 400 }
      );
    }

    // Check if the relationship exists
    const existingRelationship = await db
      .select({
        id: relationships.id,
        contactId: relationships.contactId,
        relatedContactId: relationships.relatedContactId,
        relationshipType: relationships.relationshipType,
        isActive: relationships.isActive,
        notes: relationships.notes,
        createdAt: relationships.createdAt,
        updatedAt: relationships.updatedAt,
      })
      .from(relationships)
      .where(eq(relationships.id, relationshipId))
      .limit(1);

    if (existingRelationship.length === 0) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    // Delete the relationship
    await db.delete(relationships).where(eq(relationships.id, relationshipId));

    return NextResponse.json({
      success: true,
      message: "Relationship permanently deleted",
      relationship: existingRelationship[0], // Return the full relationship object
    });
  } catch (error) {
    console.error("Error deleting relationship:", error);
    return ErrorHandler.handle(error);
  }
}
