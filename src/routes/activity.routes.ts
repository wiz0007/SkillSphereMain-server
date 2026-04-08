import express from "express";
import { getNotifications, getUnreadCount, markAsRead } from "../controllers/activity.controller.js";
import { protect } from "../middlewares/protect.js";

const router = express.Router();

router.get("/notifications/unread-count", protect, getUnreadCount);
router.get("/notifications", protect, getNotifications);
router.patch("/notifications/:id/read", protect, markAsRead);

export default router;