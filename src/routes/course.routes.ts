import express from "express";
import {
  createCourse,
  getMyCourses,
  updateCourse,
  deleteCourse,
  getCourseById,
} from "../controllers/course.controller.js";

import { protect } from "../middlewares/protect.js";

const router = express.Router();

router.post("/", protect, createCourse);
router.get("/my", protect, getMyCourses);
router.get("/:id", protect, getCourseById);
router.put("/:id", protect, updateCourse);
router.delete("/:id", protect, deleteCourse);

export default router;