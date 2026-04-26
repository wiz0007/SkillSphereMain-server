import { z } from "zod";
const phoneSchema = z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]+$/, "Invalid phone")
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .refine((value) => value.length >= 8 && value.length <= 15, "Invalid phone")
    .refine((value) => /^\+?[0-9]+$/.test(value), "Invalid phone");
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
const settingsSchema = z.object({
    theme: z.enum(["dark", "light"]).optional(),
    notifications: z
        .object({
        sessionUpdates: z.boolean().optional(),
        courseRecommendations: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
    })
        .optional(),
});
export const createProfileSchema = z.object({
    fullName: z.string().min(2).max(50),
    bio: z.string().min(2).max(300),
    country: z.string().min(2),
    state: z.string().min(2),
    city: z.string().min(2),
    timezone: z.string().optional(),
    phone: phoneSchema,
    preferredLanguage: z.string().optional(),
    profilePhoto: z.string().optional(),
    dob: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
});
export const updateProfileSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Invalid username")
        .optional(),
    fullName: z.string().min(2).max(50).optional(),
    bio: z.string().max(300).optional(),
    country: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    timezone: z.string().optional(),
    phone: phoneSchema.optional(),
    preferredLanguage: z.string().optional(),
    profilePhoto: z.string().optional(),
    dob: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    settings: settingsSchema.optional(),
    tutorProfile: tutorSchema.partial().optional(),
});
//# sourceMappingURL=profile.validator.js.map