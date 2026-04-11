import rateLimit from "express-rate-limit";

/* 🔐 LOGIN */
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again later.",
  keyGenerator: (req) => req.ip + (req.body.email || ""),
});

/* 📧 OTP */
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: "Too many OTP requests. Wait 1 minute.",
  keyGenerator: (req: any) => req.ip + (req.body.userId || ""),
});

/* 🧾 REGISTER */
export const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many registrations. Try later.",
});