import express from "express";
import { protect } from "../middlewares/protect.js";
import {
  createSupportConversation,
  getSupportBootstrap,
  getSupportMessages,
  sendSupportMessage,
  updateSupportConversationStatus,
} from "../controllers/support.controller.js";

const router = express.Router();

router.get("/", protect, getSupportBootstrap);
router.post("/", protect, createSupportConversation);
router.get("/:conversationId/messages", protect, getSupportMessages);
router.post("/:conversationId/messages", protect, sendSupportMessage);
router.patch("/:conversationId/status", protect, updateSupportConversationStatus);

export default router;
