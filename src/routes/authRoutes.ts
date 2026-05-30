import express from "express";
import {
  register,
  login,
  logout,
  startSocialLogin,
  handleSocialCallback,
  verifyOTP,
  checkUsername,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  getCurrentUser,
  getMyWithdrawalRequests,
  getPendingAdminGift,
  getWalletTransactions,
  getWalletProof,
  requestWithdrawal,
  createWalletRechargeOrder,
  verifyWalletRecharge,
  claimAdminGift,
} from "../controllers/auth.controller.js";
import { loginLimiter, otpLimiter, registerLimiter } from "../middlewares/rateLimiter.js";
import { protect } from "../middlewares/protect.js";
import { issueCsrfToken } from "../middlewares/csrfProtection.js";
import { validate } from "../middlewares/validate.js";
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  requestWithdrawalSchema,
  rechargeSkillCoinSchema,
  resetPasswordSchema,
  verifyWalletRechargeSchema,
} from "../validators/auth.validator.js";

const router = express.Router();

router.get("/csrf", issueCsrfToken);
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/google/start", startSocialLogin("google"));
router.get("/google/callback", handleSocialCallback("google"));
router.get("/linkedin/start", startSocialLogin("linkedin"));
router.get("/linkedin/callback", handleSocialCallback("linkedin"));
router.get("/github/start", startSocialLogin("github"));
router.get("/github/callback", handleSocialCallback("github"));
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/resend-otp", otpLimiter, resendOTP);
router.post("/forgot-password", loginLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", loginLimiter, validate(resetPasswordSchema), resetPassword);
router.get("/check-username/:username", checkUsername);
router.get("/me", protect, getCurrentUser);
router.get("/admin-gifts/pending", protect, getPendingAdminGift);
router.post("/admin-gifts/:giftId/claim", protect, claimAdminGift);
router.get("/wallet/history", protect, getWalletTransactions);
router.get("/wallet/withdrawals", protect, getMyWithdrawalRequests);
router.get("/wallet/proof/:transactionId", protect, getWalletProof);
router.post(
  "/wallet/withdrawals",
  protect,
  loginLimiter,
  validate(requestWithdrawalSchema),
  requestWithdrawal
);
router.post(
  "/wallet/recharge-order",
  protect,
  loginLimiter,
  validate(rechargeSkillCoinSchema),
  createWalletRechargeOrder
);
router.post(
  "/wallet/verify-recharge",
  protect,
  loginLimiter,
  validate(verifyWalletRechargeSchema),
  verifyWalletRecharge
);
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
