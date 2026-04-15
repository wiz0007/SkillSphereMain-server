import { z } from "zod";

/* ================= TUTOR SCHEMA ================= */
export const tutorSchema = z.object({
  headline: z.string().min(3).max(100),
  bio: z.string().min(20).max(500),
  skills: z.array(z.string()).min(2),
  categories: z.array(z.string()).min(1),
  experience: z.number().optional(),
  experienceDetails: z.string().optional(),
  education: z.string().optional(),
  portfolioLinks: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  availability: z.boolean(),
  teachingMode: z.enum(["Online", "Offline", "Both"]).optional(),
});

/* ================= UPDATE PROFILE ================= */
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(50).optional(),
  bio: z.string().max(300).optional(),

  country: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  city: z.string().min(2).optional(),

  timezone: z.string().optional(),
  phone: z.string().optional(),
  preferredLanguage: z.string().optional(),
  profilePhoto: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),

  tutorProfile: tutorSchema.partial().optional(), // ✅ NOW WORKS
});