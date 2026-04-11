import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      // add more later if needed:
      // userRole?: "student" | "tutor" | "admin";
    }
  }
}

export {};