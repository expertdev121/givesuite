import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contact, NewContact } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

// Schema for GHL contact webhook payload
const ghlContactSchema = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateAdded: z.string().optional(),
  locationId: z.string(),
  customFields: z.array(z.object({
    id: z.string(),
    value: z.string().optional()
  })).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  address1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

// Webhook verification function
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-gohighlevel-signature');
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;

    // Verify webhook signature (recommended for security)
    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    const body = JSON.parse(rawBody);
    console.log("GHL Webhook received:", body);

    // Validate the payload
    const validatedData = ghlContactSchema.parse(body);

    // Check if contact already exists (prevent duplicates)
    const existingContact = await db
      .select()
      .from(contact)
      .where(eq(contact.ghlContactId, validatedData.id))
      .limit(1);

    if (existingContact.length > 0) {
      console.log(`Contact with GHL ID ${validatedData.id} already exists`);
      return NextResponse.json(
        { message: "Contact already exists", contactId: existingContact[0].id },
        { status: 200 }
      );
    }

    // Parse name if firstName/lastName not provided
    let firstName = validatedData.firstName;
    let lastName = validatedData.lastName;

    if (!firstName && !lastName && validatedData.name) {
      const nameParts = validatedData.name.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Create new contact
    const newContact: NewContact = {
      ghlContactId: validatedData.id,
      firstName: firstName || '',
      lastName: lastName || '',
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      address: validatedData.address1 || null,
    };

    const result = await db.insert(contact).values(newContact).returning();

    console.log("Contact created successfully:", result[0]);

    return NextResponse.json(
      {
        message: "Contact created successfully",
        contact: result[0],
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error processing GHL webhook:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
