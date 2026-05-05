import express from "express";
import { confirmSessionCompletion, createSession, getMySessions, hideSession, updateSessionStatus, } from "../controllers/session.controller.js";
import { protect } from "../middlewares/protect.js";
import { validate } from "../middlewares/validate.js";
import { createSessionSchema, updateSessionSchema, } from "../validators/session.validate.js";
import { otpLimiter } from "../middlewares/rateLimiter.js";
const router = express.Router();
/* ================= CREATE ================= */
router.post("/", protect, otpLimiter, // ✅ prevent spam booking
validate(createSessionSchema), createSession);
/* ================= GET ================= */
router.get("/", protect, getMySessions);
/* ================= UPDATE ================= */
router.put("/:id", protect, validate(updateSessionSchema), updateSessionStatus);
router.post("/:id/hide", protect, hideSession);
router.post("/:id/confirm-completion", protect, confirmSessionCompletion);
export default router;
//# sourceMappingURL=session.routes.js.map