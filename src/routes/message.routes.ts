import express from "express";
import {
  getChatContacts,
  getConversations,
  getMessagesWithUser,
  sendMessage,
} from "../controllers/message.controller.js";
import { protect } from "../middlewares/protect.js";

const router = express.Router();

router.get("/contacts", protect, getChatContacts);
router.get("/", protect, getConversations);
router.get("/:userId", protect, getMessagesWithUser);
router.post("/:userId", protect, sendMessage);

export default router;
