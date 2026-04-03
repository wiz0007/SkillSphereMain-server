import Course from "../models/Course.js";
import mongoose from "mongoose";
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/protect.js";

/* ================= CREATE ================= */
export const createCourse = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER ID:", req.userId);

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const course = await Course.create({
      ...req.body,
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
    console.log("USER ID:", req.userId);

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

    const course = await Course.findOneAndUpdate(
      {
        _id: id, // ✅ mongoose auto-casts
        tutor: req.userId, // 🔥 secure update
      },
      req.body,
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
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
      _id: id, // ✅ mongoose auto-casts
      tutor: req.userId, // 🔥 secure delete
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
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