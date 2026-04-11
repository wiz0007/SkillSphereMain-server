import type { ZodSchema } from "zod";
import type { RequestHandler } from "express";

export const validate = (schema: ZodSchema): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: result.error.issues,
      });
    }

    req.body = result.data;
    next();
  };
};