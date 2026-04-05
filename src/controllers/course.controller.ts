import Course from "../models/Course.js";
import type { RequestHandler } from "express";
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

    level: body.level
      ? body.level.charAt(0).toUpperCase() +
        body.level.slice(1).toLowerCase()
      : "Beginner",
  };
};

/* ================= CREATE ================= */
export const createCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = normalizeCourseData(req.body);

    const course = await Course.create({
      ...data,
      tutor: userId,
    });

    res.status(201).json(course);
  } catch (err: any) {
    console.error("CREATE ERROR:", err);

    res.status(500).json({
      message: err.message || "Error creating course",
    });
  }
};

/* ================= GET ALL COURSES (PUBLIC) ================= */
export const getAllCourses: RequestHandler = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("tutor", "name") // optional
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (err: any) {
    console.error("GET ALL COURSES ERROR:", err);

    res.status(500).json({
      message: err.message || "Error fetching courses",
    });
  }
};

/* ================= GET MY COURSES ================= */
export const getMyCourses: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const courses = await Course.find({
      tutor: userId,
    }).sort({ createdAt: -1 });

    res.json(courses);
  } catch (err: any) {
    console.error("GET MY COURSES ERROR:", err);

    res.status(500).json({
      message: err.message || "Error fetching courses",
    });
  }
};

/* ================= GET SINGLE COURSE ================= */
export const getCourseById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await Course.findById(id).populate(
      "tutor",
      "name"
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
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
export const updateCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const data = normalizeCourseData(req.body);

    const course = await Course.findOneAndUpdate(
      { _id: id, tutor: userId }, // 🔒 ownership check
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
export const deleteCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await Course.findOneAndDelete({
      _id: id,
      tutor: userId, // 🔒 ownership check
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found or unauthorized",
      });
    }

    res.json({ message: "Course deleted successfully" });
  } catch (err: any) {
    console.error("DELETE ERROR:", err);

    res.status(500).json({
      message: err.message || "Error deleting course",
    });
  }
};


/* ⭐ RATE COURSE */
export const rateCourse: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { value } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ message: "Invalid rating value" });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    /* 🔥 CHECK EXISTING RATING */
    const existingRating = course.ratings.find(
      (r) => r.user.toString() === userId
    );

    if (existingRating) {
      existingRating.value = value;
    } else {
      course.ratings.push({
        user: userId,
        value,
      });
    }

    /* 🔥 RE-CALCULATE */
    const total = course.ratings.length;

    const sum = course.ratings.reduce((acc, r) => acc + r.value, 0);

    const avg = total === 0 ? 0 : sum / total;

    course.averageRating = Number(avg.toFixed(1));
    course.totalRatings = total;

    await course.save();

    return res.json({
      message: "Rating submitted",
      averageRating: course.averageRating,
      totalRatings: course.totalRatings,
    });
  } catch (err: any) {
    console.error("RATE ERROR:", err);

    return res.status(500).json({
      message: err.message || "Error rating course",
    });
  }
};

export const addReview: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!rating || !comment) {
      return res.status(400).json({ message: "All fields required" });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    /* 🔥 Prevent duplicate review */
    const existing = course.reviews.find(
      (r: any) => r.user.toString() === userId
    );

    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
    } else {
      course.reviews.push({
        user: userId,
        rating,
        comment,
      });
    }

    await course.save();

    return res.json(course.reviews);
  } catch (err: any) {
    console.error("REVIEW ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};