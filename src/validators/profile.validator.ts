import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().min(2).max(50),

  bio: z.string().max(300).optional(),

  country: z.string().min(2),
  state: z.string().min(2),
  city: z.string().min(2),

  timezone: z.string().optional(),

  phone: z
    .string()
    .min(8)
    .max(15)
    .regex(/^[0-9+]+$/, "Invalid phone number"),

  preferredLanguage: z.string().optional(),

  profilePhoto: z.string().url().optional(),

  dob: z.string().optional(),

  gender: z.enum(["Male", "Female", "Other"]).optional(),
});

export const tutorSchema = z.object({
  headline: z.string().min(3).max(100),

  bio: z.string().min(20).max(500),

  skills: z
    .array(z.string().min(1))
    .min(2, "At least 2 skills required"),

  categories: z
    .array(z.string().min(1))
    .min(1, "Select at least 1 category"),

  experience: z
    .number()
    .min(0)
    .max(50)
    .optional(),

  experienceDetails: z.string().max(500).optional(),

  education: z.string().max(200).optional(),

  portfolioLinks: z
    .array(z.string().url("Invalid URL"))
    .optional(),

  languages: z
    .array(z.string().min(1))
    .optional(),

  availability: z.boolean(),

  teachingMode: z
    .enum(["Online", "Offline", "Both"])
    .default("Online"),
});