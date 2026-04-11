// validators/session.validator.ts
import { z } from "zod";

export const createSessionSchema = z.object({
  courseId: z.string(),
  date: z.string(),
  duration: z.number().min(15),
  message: z.string().optional(),
});

export const updateSessionSchema = z.object({
  status: z.enum(["accepted", "completed", "cancelled"]),
});