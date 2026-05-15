import express from "express";
import {
  adjustAdminUserSkillCoins,
  deleteAdminUser,
  deleteAdminCourse,
  deleteAdminReview,
  getAdminCourses,
  getAdminOverview,
  getAdminReviews,
  getAdminSessions,
  getAdminSupportConversations,
  getAdminSupportMessages,
  getAdminUsers,
  getAdminWalletTransactions,
  updateAdminCoursePublishStatus,
  updateAdminSupportStatus,
} from "../controllers/admin.controller.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import { protect } from "../middlewares/protect.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/overview", getAdminOverview);
router.get("/users", getAdminUsers);
router.patch("/users/:id/wallet", adjustAdminUserSkillCoins);
router.delete("/users/:id", deleteAdminUser);
router.get("/courses", getAdminCourses);
router.patch("/courses/:id/publish", updateAdminCoursePublishStatus);
router.delete("/courses/:id", deleteAdminCourse);
router.get("/sessions", getAdminSessions);
router.get("/support", getAdminSupportConversations);
router.get("/support/:id/messages", getAdminSupportMessages);
router.patch("/support/:id/status", updateAdminSupportStatus);
router.get("/reviews", getAdminReviews);
router.delete("/reviews/:id", deleteAdminReview);
router.get("/wallet", getAdminWalletTransactions);

export default router;
