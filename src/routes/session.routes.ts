import express from "express";
import {
  createSession,
  getMySessions,
  updateSessionStatus,
} from "../controllers/session.controller.js";
import { protect } from "../middlewares/protect.js";

const router = express.Router();

router.post("/", protect, createSession);
router.get("/", protect, getMySessions);
router.put("/:id", protect, updateSessionStatus);

export default router;