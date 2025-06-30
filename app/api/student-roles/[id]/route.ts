import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ErrorHandler } from "@/lib/error-handler";
import { studentRoles } from "@/lib/db/schema";

const deactivateStudentRoleSchema = z.object({
  isActive: z.literal(false).optional().default(false), // Ensure isActive is false
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentRoleId = parseInt(id, 10);

    if (isNaN(studentRoleId) || studentRoleId <= 0) {
      return NextResponse.json(
        { error: "Invalid student role ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = deactivateStudentRoleSchema.parse(body);
    const existingRole = await db
      .select()
      .from(studentRoles)
      .where(eq(studentRoles.id, studentRoleId))
      .limit(1);

    if (existingRole.length === 0) {
      return NextResponse.json(
        { error: "Student role not found" },
        { status: 404 }
      );
    }

    const updateData = {
      isActive: validatedData.isActive,
      updatedAt: new Date(), // Use Date object instead of string
    };

    const updatedRole = await db
      .update(studentRoles)
      .set(updateData)
      .where(eq(studentRoles.id, studentRoleId))
      .returning();

    if (updatedRole.length === 0) {
      return NextResponse.json(
        { error: "Failed to deactivate student role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Student role deactivated successfully",
      studentRole: updatedRole[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("Error deactivating student role:", error);
    return ErrorHandler.handle(error);
  }
}
