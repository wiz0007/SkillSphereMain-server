import Course from "../models/Course.js";
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/protect.js";

/* ================= NORMALIZE DATA ================= */
const normalizeCourseData = (body: any) => {
  return {
    title: body.title?.trim(),

    description: body.description?.trim(),

    category: body.category?.trim(),

    skills: Array.isArray(body.skills)
      ? body.skills.map((s: string) => s.trim())
      : [],

    price: Number(body.price) || 0,

    duration: body.duration?.trim(),

    // 🔥 Normalize level safely
    level: body.level
      ? body.level.charAt(0).toUpperCase() +
        body.level.slice(1).toLowerCase()
      : "Beginner",
  };
};

/* ================= CREATE ================= */
export const createCourse = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const data = normalizeCourseData(req.body);

    const course = await Course.create({
      ...data,
      tutor: req.userId,
    });

    res.status(201).json(course);
  } catch (err: any) {
    console.error("CREATE ERROR:", err);

    res.status(500).json({
      message: err.message || "Error creating course",
    });
  }
};

/* ================= GET MY COURSES ================= */
export const getMyCourses = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const courses = await Course.find({
      tutor: req.userId,
    }).sort({ createdAt: -1 });

    res.json(courses);
  } catch (err: any) {
    console.error("GET COURSES ERROR:", err);

    res.status(500).json({
      message: err.message || "Error fetching courses",
    });
  }
};

/* ================= GET SINGLE COURSE ================= */
export const getCourseById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    res.json(course);
  } catch (err: any) {
    console.error("GET COURSE ERROR:", err);

    res.status(500).json({
      message: err.message || "Error fetching course",
    });
  }
};

/* ================= UPDATE ================= */
export const updateCourse = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    const data = normalizeCourseData(req.body);

    const course = await Course.findOneAndUpdate(
      {
        _id: id,
        tutor: req.userId, // 🔥 security check
      },
      data,
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        message: "Course not found or unauthorized",
      });
    }

    res.json(course);
  } catch (err: any) {
    console.error("UPDATE ERROR:", err);

    res.status(500).json({
      message: err.message || "Error updating course",
    });
  }
};

/* ================= DELETE ================= */
export const deleteCourse = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    const course = await Course.findOneAndDelete({
      _id: id,
      tutor: req.userId, // 🔥 security check
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found or unauthorized",
      });
    }

    res.json({
      message: "Course deleted successfully",
    });
  } catch (err: any) {
    console.error("DELETE ERROR:", err);

    res.status(500).json({
      message: err.message || "Error deleting course",
    });
  }
};