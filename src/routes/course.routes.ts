import express from "express";
import {
  createCourse,
  getMyCourses,
  updateCourse,
  toggleCoursePublishStatus,
  deleteCourse,
  getCourseById,
  getAllCourses,
  rateCourse,
  addReview,
  getSavedCourses,
  saveCourse,
  unsaveCourse,
} from "../controllers/course.controller.js";

import { protect } from "../middlewares/protect.js";
import { optionalAuth } from "../middlewares/optionalAuth.js";
import { validate } from "../middlewares/validate.js";
import { createCourseSchema, reviewSchema, ratingSchema } from "../validators/course.validator.js";
import { loginLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

/* ================= PUBLIC ================= */

router.get("/", getAllCourses);

/* ================= PRIVATE ================= */

router.post(
  "/",
  protect,
  validate(createCourseSchema), // ✅ validation
  createCourse
);

router.get("/my", protect, getMyCourses);

router.get("/saved", protect, getSavedCourses);

router.get("/:id", optionalAuth, getCourseById); // ✅ FIXED (public)


router.put(
  "/:id",
  protect,
  validate(createCourseSchema),
  updateCourse
);

router.patch("/:id/publish", protect, toggleCoursePublishStatus);

router.delete("/:id", protect, deleteCourse);

/* ⭐ RATE */
router.post(
  "/:id/rate",
  protect,
  loginLimiter, // ✅ prevent spam
  validate(ratingSchema),
  rateCourse
);

/* 💬 REVIEW */
router.post(
  "/:id/review",
  protect,
  loginLimiter, // ✅ prevent spam
  validate(reviewSchema),
  addReview
);

/* ❤️ SAVE */
router.post("/:id/save", protect, saveCourse);
router.delete("/:id/save", protect, unsaveCourse);

export default router;
