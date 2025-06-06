import z from "zod";

export const contactRoleSchema = z
  .object({
    contactId: z.number().positive(),
    roleName: z.string().min(1, "Role name is required"),
    isActive: z.boolean().default(true),
    startDate: z.string().datetime().optional().or(z.date().optional()),
    endDate: z.string().datetime().optional().or(z.date().optional()),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
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
