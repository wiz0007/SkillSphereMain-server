import { z } from "zod";

/* CREATE / UPDATE */
export const createCourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2),
  skills: z.array(z.string()).optional(),
  price: z.number().min(0),
  duration: z.string(),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
});

/* RATING */
export const ratingSchema = z.object({
  value: z.number().min(1).max(5),
});

/* REVIEW */
export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3),
});