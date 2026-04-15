import Course from "../models/Course.js";
import type { RequestHandler } from "express";
import mongoose from "mongoose";

/* ================= HELPERS ================= */

const isValidObjectId = (id: string) =>
  mongoose.Types.ObjectId.isValid(id);

const getId = (param: string | string[] | undefined): string => {
  if (!param) return "";
  return Array.isArray(param) ? param[0] ?? "" : param;
};

/* ================= NORMALIZE ================= */

const normalizeCourseData = (body: any) => ({
  title: body.title?.trim(),
  description: body.description?.trim(),
  category: body.category?.trim(),

  skills: Array.isArray(body.skills)
    ? body.skills.map((s: string) => s.trim()).filter(Boolean)
    : [],

  price: !isNaN(Number(body.price)) ? Number(body.price) : 0,

  duration: body.duration?.trim(),

  level: body.level
    ? body.level.charAt(0).toUpperCase() +
      body.level.slice(1).toLowerCase()
    : "Beginner",
});

/* ================= CREATE ================= */

export const createCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const course = await Course.create({
      ...normalizeCourseData(req.body),
      tutor: userId,
    });

    return res.status(201).json(course);
  } catch (err: any) {
    console.error("CREATE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to create course",
    });
  }
};

/* ================= GET ALL ================= */

export const getAllCourses: RequestHandler = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("tutor", "fullName profilePhoto")
      .sort({ createdAt: -1 });

    return res.json(courses);
  } catch (err: any) {
    console.error("GET ALL ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch courses",
    });
  }
};

/* ================= GET MY ================= */

export const getMyCourses: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const courses = await Course.find({
      tutor: userId,
    }).sort({ createdAt: -1 });

    return res.json(courses);
  } catch (err: any) {
    console.error("GET MY ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch courses",
    });
  }
};

/* ================= GET BY ID ================= */

export const getCourseById: RequestHandler = async (req, res) => {
  try {
    const id = getId(req.params.id);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findById(id).populate(
      "tutor",
      "fullName profilePhoto"
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.json(course);
  } catch (err: any) {
    console.error("GET ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch course",
    });
  }
};

/* ================= UPDATE ================= */

export const updateCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findOneAndUpdate(
      { _id: id, tutor: userId },
      normalizeCourseData(req.body),
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        message: "Course not found or not authorized",
      });
    }

    return res.json(course);
  } catch (err: any) {
    console.error("UPDATE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to update course",
    });
  }
};

/* ================= DELETE ================= */

export const deleteCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findOneAndDelete({
      _id: id,
      tutor: userId,
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found or not authorized",
      });
    }

    return res.json({ message: "Course deleted successfully" });
  } catch (err: any) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to delete course",
    });
  }
};

/* ================= RATE ================= */

export const rateCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const id = getId(req.params.id);
    const { value } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: "Not found" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const existing = course.ratings.find(
      (r) => r.user.toString() === userObjectId.toString()
    );

    if (existing) {
      existing.value = value;
    } else {
      course.ratings.push({
        user: userObjectId,
        value,
      });
    }

    const total = course.ratings.length;
    const sum = course.ratings.reduce((a, r) => a + r.value, 0);

    course.averageRating = Number((sum / total).toFixed(1));
    course.totalRatings = total;

    await course.save();

    return res.json({
      averageRating: course.averageRating,
      totalRatings: course.totalRatings,
    });
  } catch (err: any) {
    console.error("RATE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to rate course",
    });
  }
};

/* ================= REVIEW ================= */

export const addReview: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const id = getId(req.params.id);
    const { rating, comment } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: "Not found" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const existing = course.reviews.find(
      (r: any) => r.user.toString() === userObjectId.toString()
    );

    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
    } else {
      course.reviews.push({
        user: userObjectId,
        rating,
        comment,
      });
    }

    await course.save();

    return res.json(course.reviews);
  } catch (err: any) {
    console.error("REVIEW ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to add review",
    });
  }
};

/* ================= SAVE ================= */

export const saveCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const course = await Course.findByIdAndUpdate(
      id,
      {
        $addToSet: {
          savedBy: new mongoose.Types.ObjectId(userId),
        },
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.json({
      isSaved: course.savedBy.some(
        (u) => u.toString() === userId
      ),
    });
  } catch (err: any) {
    console.error("SAVE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to save course",
    });
  }
};

/* ================= UNSAVE ================= */

export const unsaveCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const course = await Course.findByIdAndUpdate(
      id,
      {
        $pull: {
          savedBy: new mongoose.Types.ObjectId(userId),
        },
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.json({
      isSaved: course.savedBy.some(
        (u) => u.toString() === userId
      ),
    });
  } catch (err: any) {
    console.error("UNSAVE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to unsave course",
    });
  }
};

/* ================= GET SAVED ================= */

export const getSavedCourses: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const courses = await Course.find({
      savedBy: userId,
    }).sort({ createdAt: -1 });

    return res.json(courses);
  } catch (err: any) {
    console.error("GET SAVED ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch saved courses",
    });
  }
};