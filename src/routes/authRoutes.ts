import express from "express";
import {
  register,
  login,
  verifyOTP,
  checkUsername,
  resendOTP,
  changePassword,
  deleteAccount,
} from "../controllers/auth.controller.js";
import { loginLimiter, otpLimiter, registerLimiter } from "../middlewares/rateLimiter.js";
import { protect } from "../middlewares/protect.js";
import { validate } from "../middlewares/validate.js";
import {
  changePasswordSchema,
  deleteAccountSchema,
} from "../validators/auth.validator.js";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/resend-otp", otpLimiter, resendOTP);
router.get("/check-username/:username", checkUsername);
router.post(
  "/change-password",
  protect,
  loginLimiter,
  validate(changePasswordSchema),
  changePassword
);
router.post(
  "/delete-account",
  protect,
  loginLimiter,
  validate(deleteAccountSchema),
  deleteAccount
);

export default router;
