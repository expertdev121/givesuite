import z from "zod";

export const relationshipSchema = z
  .object({
    contactId: z.number().positive(),
    relatedContactId: z.number().positive(),
    relationshipType: z.enum([
      "mother",
      "father",
      "grandmother",
      "grandfather",
      "sister",
      "spouse",
      "brother",
      "partner",
      "step-brother",
      "step-sister",
      "stepmother",
      "stepfather",
      "divorced co-parent",
      "separated co-parent",
      "legal guardian",
      "step-parent",
      "legal guardian partner",
      "grandparent",
      "aunt",
      "uncle",
      "aunt/uncle",
    ]),
    isActive: z.boolean().default(true),
    notes: z.string().optional(),
  })
  .refine((data) => data.contactId !== data.relatedContactId, {
    message: "Contact ID and Related Contact ID cannot be the same",
    path: ["relatedContactId"],
  });
