import { z } from "zod";

export const contactRoleSchema = z
  .object({
    contactId: z.coerce.number().positive("Contact ID is required"),
    roleName: z.string().min(1, "Role name is required"),
    isActive: z.boolean().default(true),
    startDate: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val === "") return true;
          return !isNaN(Date.parse(val));
        },
        { message: "Invalid start date format" }
      ),
    endDate: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val === "") return true;
          return !isNaN(Date.parse(val));
        },
        { message: "Invalid end date format" }
      ),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        data.startDate &&
        data.endDate &&
        data.startDate !== "" &&
        data.endDate !== ""
      ) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end > start;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

export type ContactRoleFormValues = z.infer<typeof contactRoleSchema>;
