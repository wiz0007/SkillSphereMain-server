import { z } from "zod";

/* ================= CREATE / UPDATE ================= */

export const createCourseSchema = z.object({
  title: z.string().min(3),

  description: z.string().min(10),

  type: z.enum(["live", "recorded", "tuition"]).default("live"),

  category: z.string().min(2),

  skills: z.array(z.string()).default([]),

  price: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Invalid price",
    }),

  duration: z.string().min(1),

  contentDriveLink: z.string().trim().optional().or(z.literal("")),

  tuitionSchedule: z
    .object({
      days: z.array(z.string()).default([]),
      weeks: z.array(z.number().int().min(1).max(5)).default([]),
      startTime: z.string().trim().default(""),
    })
    .optional(),

  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
}).superRefine((data, ctx) => {
  if (data.type === "recorded" && !data.contentDriveLink?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contentDriveLink"],
      message: "Google Drive link is required for recorded courses",
    });
  }

  if (data.type === "tuition") {
    if (!data.tuitionSchedule?.days?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tuitionSchedule", "days"],
        message: "Select at least one tuition day",
      });
    }

    if (!data.tuitionSchedule?.weeks?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tuitionSchedule", "weeks"],
        message: "Select at least one week of the month",
      });
    }

    if (!data.tuitionSchedule?.startTime?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tuitionSchedule", "startTime"],
        message: "Choose a start time for the recurring tuition",
      });
    }
  }
});

/* ================= RATING ================= */

export const ratingSchema = z.object({
  value: z.number().min(1).max(5),
});

/* ================= REVIEW ================= */

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3).max(500),
});
