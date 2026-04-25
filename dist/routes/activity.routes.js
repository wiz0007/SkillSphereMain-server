import express from "express";
import { getNotifications, getUnreadCount, markAsRead, } from "../controllers/activity.controller.js";
import { protect } from "../middlewares/protect.js";
const router = express.Router();
router.get("/unread-count", protect, getUnreadCount);
router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, markAsRead);
export default router;
//# sourceMappingURL=activity.routes.js.map