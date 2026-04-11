import express from "express";
import { register, login, verifyOTP, checkUsername, resendOTP } from "../controllers/auth.controller.js";
import { loginLimiter, otpLimiter, registerLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/resend-otp", otpLimiter, resendOTP);
// routes/authRoutes.ts
router.get("/check-username/:username", checkUsername);

export default router;