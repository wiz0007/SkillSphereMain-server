import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().min(2).max(50),
  bio: z.string().max(300).optional(),
  country: z.string().min(2),
  state: z.string().min(2),
  city: z.string().min(2),
  timezone: z.string().optional(),
  phone: z.string().min(8).max(15),
  preferredLanguage: z.string().optional(),
  profilePhoto: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
});

export const tutorSchema = z.object({
  category: z.string().min(2),
  experience: z.number().min(0).max(50),
  hourlyRate: z.number().min(0),
});