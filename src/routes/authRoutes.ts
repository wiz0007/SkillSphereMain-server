import express from "express";
import { register, login, verifyOTP, checkUsername } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
// routes/authRoutes.ts
router.get("/check-username/:username", checkUsername);

export default router;