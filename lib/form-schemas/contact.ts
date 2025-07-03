import { z } from "zod";

export const contactFormSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: "First name must be at least 2 characters" })
    .max(32, { message: "First name must be at most 32 characters" }),
  lastName: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters" })
    .max(32, { message: "Last name must be at most 32 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
  title: z.enum(["mr", "mrs", "ms", "dr", "prof", "eng", "other"]).optional(),
  gender: z.enum(["male", "female"]).optional(),
  address: z.string().optional(),
});
