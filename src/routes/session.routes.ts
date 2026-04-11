import express from "express";
import {
  createSession,
  getMySessions,
  updateSessionStatus,
} from "../controllers/session.controller.js";

import { protect } from "../middlewares/protect.js";
import { validate } from "../middlewares/validate.js";

import {
  createSessionSchema,
  updateSessionSchema,
} from "../validators/session.validate.js";

import { otpLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

/* ================= CREATE ================= */
router.post(
  "/",
  protect,
  otpLimiter, // ✅ prevent spam booking
  validate(createSessionSchema),
  createSession
);

/* ================= GET ================= */
router.get("/", protect, getMySessions);

/* ================= UPDATE ================= */
router.put(
  "/:id",
  protect,
  validate(updateSessionSchema),
  updateSessionStatus
);

export default router;