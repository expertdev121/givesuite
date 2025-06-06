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
  phone: z
    .string()
    .min(7, { message: "Phone number must be at least 7 characters" })
    .max(15, { message: "Phone number must be at most 15 characters" })
    .optional(),
  title: z.enum(["mr", "mrs", "ms", "dr", "prof", "eng", "other"]).optional(),
  gender: z.enum(["male", "female"]).optional(),
  address: z
    .string()
    .min(5, { message: "Address must be at least 5 characters" })
    .max(255, { message: "Address must be at most 255 characters" })
    .optional(),
});
