import Course from "../models/Course.js";
import Profile from "../models/Profile.js";
import Session from "../models/Session.js";
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

  isPublished:
    typeof body.isPublished === "boolean"
      ? body.isPublished
      : true,
});

const syncCourseRatings = (
  course: InstanceType<typeof Course>,
  userId: string,
  rating: number
) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const existing = course.ratings.find(
    (entry) => entry.user.toString() === userObjectId.toString()
  );

  if (existing) {
    existing.value = rating;
  } else {
    course.ratings.push({
      user: userObjectId,
      value: rating,
    });
  }

  const total = course.ratings.length;
  const sum = course.ratings.reduce((acc, entry) => acc + entry.value, 0);

  course.averageRating = total
    ? Number((sum / total).toFixed(1))
    : 0;
  course.totalRatings = total;
};

const hasUserEnrolledInCourse = async (
  userId: string,
  course: {
    _id: mongoose.Types.ObjectId | string;
    tutor: mongoose.Types.ObjectId | string;
    title: string;
  }
) => {
  const courseObjectId = new mongoose.Types.ObjectId(course._id);
  const studentObjectId = new mongoose.Types.ObjectId(userId);
  const tutorObjectId = new mongoose.Types.ObjectId(course.tutor);

  const enrolledSession = await Session.exists({
    student: studentObjectId,
    status: { $in: ["accepted", "completed"] },
    $or: [
      { course: courseObjectId },
      {
        course: { $exists: false },
        tutor: tutorObjectId,
        title: course.title,
      },
    ],
  });

  return Boolean(enrolledSession);
};

/* ================= PROFILE MERGE ================= */

const attachProfileToCourses = async (courses: any[]) => {
  const userIds = courses
    .map((c) => c.tutor?._id)
    .filter(Boolean);

  const profiles = await Profile.find({
    user: { $in: userIds },
  })
    .select("user profilePhoto")
    .lean();

  const profileMap = new Map(
    profiles.map((p) => [p.user.toString(), p])
  );

  return courses.map((course) => {
    const profile = profileMap.get(
      course.tutor?._id?.toString()
    );

    return {
      ...course,
      tutor: {
        ...course.tutor,
        profilePhoto: profile?.profilePhoto || null,
      },
    };
  });
};

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
      .populate("tutor", "username")
      .sort({ createdAt: -1 })
      .lean();

    const finalCourses = await attachProfileToCourses(courses);

    return res.json(finalCourses);
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

    const courses = await Course.find({ tutor: userId })
      .populate("tutor", "username")
      .sort({ createdAt: -1 })
      .lean();

    const finalCourses = await attachProfileToCourses(courses);

    return res.json(finalCourses);
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
    const viewerId = req.userId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findById(id)
      .populate("tutor", "username")
      .populate("reviews.user", "username")
      .lean();

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const [finalCourse] = await attachProfileToCourses([course]);

    if (!viewerId) {
      return res.json(finalCourse);
    }

    const hasEnrolled = await hasUserEnrolledInCourse(viewerId, {
      _id: course._id,
      tutor: course.tutor._id,
      title: course.title,
    });

    const hasReviewed = course.reviews.some((review: any) => {
      const reviewUserId =
        review.user?._id?.toString?.() ||
        review.user?.toString?.() ||
        "";

      return reviewUserId === viewerId;
    });

    return res.json({
      ...finalCourse,
      reviewEligibility: {
        canReview: hasEnrolled,
        hasEnrolled,
        hasReviewed,
      },
    });
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

export const toggleCoursePublishStatus: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const id = getId(req.params.id);
    const { isPublished } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (typeof isPublished !== "boolean") {
      return res.status(400).json({
        message: "isPublished must be true or false",
      });
    }

    const course = await Course.findOneAndUpdate(
      { _id: id, tutor: userId },
      { isPublished },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        message: "Course not found or not authorized",
      });
    }

    return res.json(course);
  } catch (err: any) {
    console.error("TOGGLE PUBLISH ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to update course status",
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

    syncCourseRatings(course, userId, value);

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

    const hasEnrolled = await hasUserEnrolledInCourse(userId, {
      _id: course._id,
      tutor: course.tutor,
      title: course.title,
    });

    if (!hasEnrolled) {
      return res.status(403).json({
        message:
          "You can review this course only after you have enrolled in it",
      });
    }

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

    syncCourseRatings(course, userId, rating);

    await course.save();

    return res.json({
      reviews: course.reviews,
      ratings: course.ratings,
      averageRating: course.averageRating,
      totalRatings: course.totalRatings,
    });
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
    })
      .populate("tutor", "username")
      .sort({ createdAt: -1 })
      .lean();

    const finalCourses = await attachProfileToCourses(courses);

    return res.json(finalCourses);
  } catch (err: any) {
    console.error("GET SAVED ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch saved courses",
    });
  }
};
