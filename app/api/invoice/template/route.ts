import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoiceTemplate } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const templateData = await db
      .select()
      .from(invoiceTemplate)
      .where(eq(invoiceTemplate.isActive, true))
      .limit(1);

    if (templateData.length === 0) {
      // Return default
      const defaultTemplate = {
        id: 0,
        orgNameEn: "YESHIVAT HESDER LEV HATORAH",
        orgNameHeb: "ישיבת הסדר לב התורה",
        logoUrl: null,
        establishedYear: "2002",
        headerNotes: null,
        footerNotes: "*All scheduled payments calculated using today's conversion rate. These payments will be calculated at the actual conversion rate when received. Note: All payments are subject to third-party payment processing fees.",
        tableHeaders: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return NextResponse.json(defaultTemplate);
    }

    return NextResponse.json(templateData[0]);
  } catch (error) {
    console.error("Error fetching invoice template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgNameEn, orgNameHeb, logoUrl, establishedYear, headerNotes, footerNotes, tableHeaders } = body;

    // Deactivate all existing
    await db
      .update(invoiceTemplate)
      .set({ isActive: false })
      .where(eq(invoiceTemplate.isActive, true));

    // Insert new active template
    const newTemplate = {
      orgNameEn: orgNameEn || "YESHIVAT HESDER LEV HATORAH",
      orgNameHeb: orgNameHeb || "ישיבת הסדר לב התורה",
      logoUrl: logoUrl || null,
      establishedYear: establishedYear || "2002",
      headerNotes: headerNotes || null,
      footerNotes: footerNotes || "*All scheduled payments calculated using today's conversion rate. These payments will be calculated at the actual conversion rate when received. Note: All payments are subject to third-party payment processing fees.",
      tableHeaders: tableHeaders || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(invoiceTemplate).values(newTemplate).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating invoice template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
