import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { emitNotification, emitWalletUpdate } from "../config/socket.js";
import Course from "../models/Course.js";
import CourseReview from "../models/CourseReview.js";
import Profile from "../models/Profile.js";
import RecordedCourseAccess from "../models/RecordedCourseAccess.js";
import Session from "../models/Session.js";
import TuitionEnrollment from "../models/TuitionEnrollment.js";
import User from "../models/User.js";
import { logActivity } from "../utils/activityLogger.js";
import {
  cancelFutureTuitionSessions,
  ensureTuitionSessionsGenerated,
  parseDurationToMinutes,
} from "../utils/tuition.js";
import {
  buildWalletSummary,
  lockSkillCoins,
  settleLockedSkillCoins,
  unlockSkillCoins,
} from "../utils/wallet.js";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const getId = (param: string | string[] | undefined): string => {
  if (!param) return "";
  return Array.isArray(param) ? param[0] ?? "" : param;
};

const getRecordedSkillCoinAmount = (price: number) =>
  Math.max(0, Math.round(price || 0));

const validTuitionDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const normalizeTuitionSchedule = (value: any) => {
  const rawDays = Array.isArray(value?.days) ? value.days : [];
  const rawWeeks = Array.isArray(value?.weeks) ? value.weeks : [];

  return {
    days: rawDays
      .map((day: string) =>
        typeof day === "string" && day.trim()
          ? day.trim().charAt(0).toUpperCase() + day.trim().slice(1).toLowerCase()
          : ""
      )
      .filter((day: string) => validTuitionDays.includes(day)),
    weeks: rawWeeks
      .map((week: number | string) => Number(week))
      .filter((week: number) => Number.isInteger(week) && week >= 1 && week <= 5),
    startTime:
      typeof value?.startTime === "string" ? value.startTime.trim() : "",
  };
};

const normalizeCourseType = (value: any): "live" | "recorded" | "tuition" => {
  if (value === "recorded") {
    return "recorded";
  }

  if (value === "tuition") {
    return "tuition";
  }

  return "live";
};

const normalizeCourseData = (body: any) => {
  const type = normalizeCourseType(body.type);

  return {
    title: body.title?.trim(),
    description: body.description?.trim(),
    type,
    category: body.category?.trim(),
    skills: Array.isArray(body.skills)
      ? body.skills.map((s: string) => s.trim()).filter(Boolean)
      : [],
    price: !isNaN(Number(body.price)) ? Number(body.price) : 0,
    duration: body.duration?.trim(),
    contentDriveLink:
      type === "recorded" ? body.contentDriveLink?.trim() || "" : "",
    tuitionSchedule:
      type === "tuition"
        ? normalizeTuitionSchedule(body.tuitionSchedule)
        : {
            days: [],
            weeks: [],
            startTime: "",
          },
    level: body.level
      ? body.level.charAt(0).toUpperCase() +
        body.level.slice(1).toLowerCase()
      : "Beginner",
    isPublished:
      typeof body.isPublished === "boolean" ? body.isPublished : true,
  };
};

const buildProfileMap = async (userIds: string[]) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  if (!uniqueIds.length) {
    return new Map<string, any>();
  }

  const profiles = await Profile.find({
    user: {
      $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
  })
    .select("user fullName profilePhoto isTutor")
    .lean();

  return new Map(
    profiles.map((profile) => [
      profile.user.toString(),
      {
        fullName: profile.fullName || "",
        profilePhoto: profile.profilePhoto || "",
        isTutor: !!profile.isTutor,
      },
    ])
  );
};

const serializeUser = (value: any, profileMap: Map<string, any>) => {
  const id = value?._id?.toString?.() || value?.toString?.() || "";
  const profile = profileMap.get(id);

  return {
    _id: id,
    username: value?.username || "",
    fullName: profile?.fullName || "",
    profilePhoto: profile?.profilePhoto || "",
    isTutor: profile?.isTutor || false,
  };
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

  if (enrolledSession) {
    return true;
  }

  const recordedAccess = await RecordedCourseAccess.exists({
    course: courseObjectId,
    student: studentObjectId,
    status: "approved",
  });

  return Boolean(recordedAccess);
};

const attachProfileToCourses = async (courses: any[]) => {
  const userIds = courses.map((c) => c.tutor?._id).filter(Boolean);
  const profileMap = await buildProfileMap(
    userIds.map((value: any) => value.toString())
  );

  return courses.map((course) => {
    const tutor = course.tutor;
    const tutorId = tutor?._id?.toString?.();
    const profile = tutorId ? profileMap.get(tutorId) : null;

    return {
      ...course,
      tutor: {
        ...course.tutor,
        fullName: profile?.fullName || "",
        profilePhoto: profile?.profilePhoto || null,
        isTutor: profile?.isTutor || false,
      },
    };
  });
};

const sanitizeCourseDocument = <T extends Record<string, any>>(
  course: T,
  options?: { includeDriveLink?: boolean }
) => {
  const { ratings, reviews, contentDriveLink, ...rest } = course;

  if (options?.includeDriveLink) {
    return {
      ...rest,
      contentDriveLink: contentDriveLink || "",
    };
  }

  return rest;
};

const normalizeObjectIdArray = (value: unknown) =>
  Array.isArray(value) ? value : [];

const extractTutorId = (tutor: unknown) => {
  if (
    tutor &&
    typeof tutor === "object" &&
    "_id" in tutor &&
    (tutor as { _id?: mongoose.Types.ObjectId | string })._id
  ) {
    return (tutor as { _id: mongoose.Types.ObjectId | string })._id;
  }

  return tutor as mongoose.Types.ObjectId | string | undefined;
};

const syncCourseRatings = async (courseId: mongoose.Types.ObjectId | string) => {
  const summary = await CourseReview.aggregate<{
    _id: mongoose.Types.ObjectId;
    totalRatings: number;
    averageRating: number;
  }>([
    {
      $match: {
        course: new mongoose.Types.ObjectId(courseId),
      },
    },
    {
      $group: {
        _id: "$course",
        totalRatings: { $sum: 1 },
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  const aggregates = summary[0] || {
    totalRatings: 0,
    averageRating: 0,
  };

  await Course.findByIdAndUpdate(courseId, {
    totalRatings: aggregates.totalRatings,
    averageRating: aggregates.totalRatings
      ? Number(aggregates.averageRating.toFixed(1))
      : 0,
  });
};

const syncCourseReviewRefs = async (
  courseId: mongoose.Types.ObjectId | string
) => {
  const reviewRefs = await CourseReview.find({
    course: new mongoose.Types.ObjectId(courseId),
  })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id")
    .lean();

  await Course.findByIdAndUpdate(courseId, {
    reviewRefs: reviewRefs.map((entry) => entry._id),
  });
};

const buildCourseReviews = async (
  reviewRefs: Array<mongoose.Types.ObjectId | string>
) => {
  if (!reviewRefs.length) {
    return [];
  }

  const reviews = await CourseReview.find({
    _id: {
      $in: reviewRefs.map((reviewId) => new mongoose.Types.ObjectId(reviewId)),
    },
    comment: { $ne: "" },
  })
    .populate("user", "username")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  return reviews.map((review) => ({
    _id: review._id.toString(),
    user: review.user,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  }));
};

const buildEmptyRecordedAccessSummary = () => ({
  hasAccess: false,
  hasPendingRequest: false,
  status: "none" as const,
  requestId: null,
  canPurchase: true,
  contentDriveLink: "",
});

const buildRecordedAccessSummary = async (
  viewerId: string,
  course: {
    _id: mongoose.Types.ObjectId | string;
    type?: string;
    contentDriveLink?: string;
  }
) => {
  if (course.type !== "recorded") {
    return null;
  }

  const access = await RecordedCourseAccess.findOne({
    course: new mongoose.Types.ObjectId(course._id),
    student: new mongoose.Types.ObjectId(viewerId),
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!access) {
    return buildEmptyRecordedAccessSummary();
  }

  return {
    hasAccess: access.status === "approved",
    hasPendingRequest: access.status === "pending",
    status: access.status,
    requestId: access._id.toString(),
    canPurchase: access.status === "rejected",
    contentDriveLink:
      access.status === "approved" ? course.contentDriveLink || "" : "",
  };
};

const buildTutorRecordedRequests = async (
  courseId: mongoose.Types.ObjectId | string
) => {
  const requests = await RecordedCourseAccess.find({
    course: new mongoose.Types.ObjectId(courseId),
  })
    .populate("student", "username")
    .sort({ createdAt: -1 })
    .lean();

  const profileMap = await buildProfileMap(
    requests.map((request) => request.student?._id?.toString?.() || "")
  );

  return requests.map((request) => ({
    _id: request._id.toString(),
    student: serializeUser(request.student, profileMap),
    status: request.status,
    coinStatus: request.coinStatus,
    skillCoinAmount: request.skillCoinAmount,
    price: request.price,
    createdAt: request.createdAt,
    approvedAt: request.approvedAt || null,
    rejectedAt: request.rejectedAt || null,
  }));
};

const buildEmptyTuitionEnrollmentSummary = () => ({
  hasEnrollment: false,
  hasPendingRequest: false,
  status: "none" as const,
  requestId: null,
  canRequest: true,
  nextSessionDate: null as Date | null,
  canPause: false,
  canResume: false,
  canCancel: false,
});

const buildTuitionEnrollmentSummary = async (
  viewerId: string,
  course: {
    _id: mongoose.Types.ObjectId | string;
    type?: string;
  }
) => {
  if (course.type !== "tuition") {
    return null;
  }

  const enrollment = await TuitionEnrollment.findOne({
    course: new mongoose.Types.ObjectId(course._id),
    student: new mongoose.Types.ObjectId(viewerId),
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!enrollment) {
    return buildEmptyTuitionEnrollmentSummary();
  }

  const nextSession = await Session.findOne({
    tuitionEnrollment: enrollment._id,
    status: { $in: ["accepted", "completed"] },
    date: { $gte: new Date() },
  })
    .sort({ date: 1 })
    .select("date")
    .lean();

  return {
    hasEnrollment:
      enrollment.status === "approved" || enrollment.status === "paused",
    hasPendingRequest: enrollment.status === "pending",
    status: enrollment.status,
    requestId: enrollment._id.toString(),
    canRequest:
      enrollment.status === "rejected" || enrollment.status === "cancelled",
    nextSessionDate: nextSession?.date || null,
    canPause: enrollment.status === "approved",
    canResume: enrollment.status === "paused",
    canCancel: ["pending", "approved", "paused"].includes(enrollment.status),
  };
};

const buildTutorTuitionRequests = async (
  courseId: mongoose.Types.ObjectId | string
) => {
  const requests = await TuitionEnrollment.find({
    course: new mongoose.Types.ObjectId(courseId),
  })
    .populate("student", "username")
    .sort({ createdAt: -1 })
    .lean();

  const profileMap = await buildProfileMap(
    requests.map((request) => request.student?._id?.toString?.() || "")
  );

  return requests.map((request) => ({
    _id: request._id.toString(),
    student: serializeUser(request.student, profileMap),
    status: request.status,
    coinStatus: request.coinStatus,
    skillCoinAmount: request.skillCoinAmount,
    price: request.price,
    generatedUntil: request.generatedUntil || null,
    scheduleSnapshot: request.scheduleSnapshot,
    createdAt: "createdAt" in request ? (request as { createdAt?: Date }).createdAt || null : null,
    approvedAt: request.approvedAt || null,
    pausedAt: request.pausedAt || null,
    rejectedAt: request.rejectedAt || null,
    cancelledAt: request.cancelledAt || null,
  }));
};

export const createCourse: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

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

export const getAllCourses: RequestHandler = async (_req, res) => {
  try {
    const courses = await Course.find()
      .populate("tutor", "username")
      .sort({ createdAt: -1 })
      .lean();

    const finalCourses = await attachProfileToCourses(
      courses.map((course) => sanitizeCourseDocument(course))
    );

    return res.json(finalCourses);
  } catch (err: any) {
    console.error("GET ALL ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch courses",
    });
  }
};

export const getMyCourses: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const courses = await Course.find({ tutor: userId })
      .populate("tutor", "username")
      .sort({ createdAt: -1 })
      .lean();

    const finalCourses = await attachProfileToCourses(
      courses.map((course) =>
        sanitizeCourseDocument(course, { includeDriveLink: true })
      )
    );

    return res.json(finalCourses);
  } catch (err: any) {
    console.error("GET MY ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch courses",
    });
  }
};

export const getMyTuitionEnrollments: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const enrollments = await TuitionEnrollment.find({
      $or: [{ student: userObjectId }, { tutor: userObjectId }],
    })
      .populate("student", "username")
      .populate("tutor", "username")
      .populate("course", "title category type duration price")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const profileMap = await buildProfileMap(
      enrollments.flatMap((entry) => [
        entry.student?._id?.toString?.() || "",
        entry.tutor?._id?.toString?.() || "",
      ])
    );

    const nextSessions = await Session.find({
      tuitionEnrollment: { $in: enrollments.map((entry) => entry._id) },
      status: "accepted",
      date: { $gte: new Date() },
    })
      .sort({ date: 1 })
      .select("tuitionEnrollment date")
      .lean();

    const nextSessionMap = new Map<string, Date>();
    nextSessions.forEach((session) => {
      const key = session.tuitionEnrollment?.toString?.();
      if (key && !nextSessionMap.has(key)) {
        nextSessionMap.set(key, session.date);
      }
    });

    return res.json(
      enrollments.map((entry) => {
        const courseDoc = entry.course as unknown as {
          _id?: mongoose.Types.ObjectId | string;
          title?: string;
          category?: string;
          duration?: string;
          price?: number;
        };

        return ({
        _id: entry._id.toString(),
        role:
          entry.student?._id?.toString?.() === userId.toString()
            ? "student"
            : "tutor",
        status: entry.status,
        coinStatus: entry.coinStatus,
        skillCoinAmount: entry.skillCoinAmount,
        price: entry.price,
        generatedUntil: entry.generatedUntil || null,
        createdAt:
          "createdAt" in entry ? (entry as { createdAt?: Date }).createdAt || null : null,
        approvedAt: entry.approvedAt || null,
        pausedAt: entry.pausedAt || null,
        rejectedAt: entry.rejectedAt || null,
        cancelledAt: entry.cancelledAt || null,
        nextSessionDate: nextSessionMap.get(entry._id.toString()) || null,
        student: serializeUser(entry.student, profileMap),
        tutor: serializeUser(entry.tutor, profileMap),
        course: {
          _id: courseDoc?._id?.toString?.() || "",
          title: courseDoc?.title || "Tuition plan",
          category: courseDoc?.category || "",
          duration: courseDoc?.duration || "",
          price: courseDoc?.price || 0,
        },
        scheduleSnapshot: entry.scheduleSnapshot,
      });
    })
    );
  } catch (err: any) {
    console.error("GET MY TUITION ENROLLMENTS ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch tuition enrollments",
    });
  }
};

export const getCourseById: RequestHandler = async (req, res) => {
  try {
    const id = getId(req.params.id);
    const viewerId = req.userId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findById(id).populate("tutor", "username").lean();

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const savedBy = normalizeObjectIdArray(course.savedBy);
    const tutorId = extractTutorId(course.tutor);

    if (!tutorId) {
      return res.status(500).json({
        message: "Course tutor information is incomplete",
      });
    }

    const isOwner = Boolean(
      viewerId && tutorId.toString() === viewerId.toString()
    );

    const [finalCourse] = await attachProfileToCourses([
      sanitizeCourseDocument(course, {
        includeDriveLink: isOwner,
      }),
    ]);
    const reviews = await buildCourseReviews(course.reviewRefs || []);

    if (!viewerId) {
      return res.json({
        ...finalCourse,
        reviews,
        isSaved: false,
        recordedAccess:
          course.type === "recorded" ? buildEmptyRecordedAccessSummary() : null,
        recordedRequests: [],
        tuitionEnrollment:
          course.type === "tuition" ? buildEmptyTuitionEnrollmentSummary() : null,
        tuitionRequests: [],
      });
    }

    const hasEnrolled = await hasUserEnrolledInCourse(viewerId, {
      _id: course._id,
      tutor: tutorId,
      title: course.title,
    });

    const existingReview = await CourseReview.findOne({
      course: course._id,
      user: new mongoose.Types.ObjectId(viewerId),
      comment: { $ne: "" },
    })
      .select("_id")
      .lean();

    return res.json({
      ...finalCourse,
      reviews,
      isSaved: savedBy.some((savedUserId) => savedUserId.toString() === viewerId),
      reviewEligibility: {
        canReview: hasEnrolled,
        hasEnrolled,
        hasReviewed: Boolean(existingReview),
      },
      recordedAccess:
        !isOwner && course.type === "recorded"
          ? await buildRecordedAccessSummary(viewerId, course)
          : null,
      recordedRequests:
        isOwner && course.type === "recorded"
          ? await buildTutorRecordedRequests(course._id)
          : [],
      tuitionEnrollment:
        !isOwner && course.type === "tuition"
          ? await buildTuitionEnrollmentSummary(viewerId, course)
          : null,
      tuitionRequests:
        isOwner && course.type === "tuition"
          ? await buildTutorTuitionRequests(course._id)
          : [],
    });
  } catch (err: any) {
    console.error("GET ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch course",
    });
  }
};

export const updateCourse: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
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
    const userId = req.userId;
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

export const deleteCourse: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
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

    await Promise.all([
      CourseReview.deleteMany({ course: course._id }),
      RecordedCourseAccess.deleteMany({ course: course._id }),
      TuitionEnrollment.deleteMany({ course: course._id }),
      Session.deleteMany({ course: course._id, sessionKind: "tuition" }),
    ]);

    return res.json({ message: "Course deleted successfully" });
  } catch (err: any) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to delete course",
    });
  }
};

export const requestRecordedCourseAccess: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    dbSession = await mongoose.startSession();

    const course = await Course.findById(id).session(dbSession);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.type !== "recorded") {
      return res.status(400).json({
        message: "This course is booked as a live session, not unlocked content.",
      });
    }

    if (course.tutor.toString() === userId.toString()) {
      return res.status(400).json({
        message: "You already own this course as the tutor.",
      });
    }

    const student = await User.findById(userId).session(dbSession);

    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }

    const skillCoinAmount = getRecordedSkillCoinAmount(course.price || 0);
    let accessRecord: any = null;

    await dbSession.withTransaction(async () => {
      const existingAccess = await RecordedCourseAccess.findOne({
        course: course._id,
        student: new mongoose.Types.ObjectId(userId),
      }).session(dbSession!);

      if (existingAccess?.status === "approved") {
        throw new Error("This recorded course is already unlocked for you");
      }

      if (existingAccess?.status === "pending") {
        throw new Error("Your unlock request is already waiting for tutor approval");
      }

      await lockSkillCoins(
        student,
        skillCoinAmount,
        `SkillCoin locked for recorded course unlock: ${course.title}`,
        {
          courseId: course._id,
          extra: {
            accessType: "recorded_course",
            tutorId: course.tutor.toString(),
          },
        },
        dbSession!,
        "recorded_course_lock"
      );

      if (existingAccess) {
        existingAccess.price = course.price || 0;
        existingAccess.skillCoinAmount = skillCoinAmount;
        existingAccess.status = "pending";
        existingAccess.coinStatus = "locked";
        existingAccess.approvedAt = null;
        existingAccess.rejectedAt = null;
        existingAccess.unlockedAt = null;
        await existingAccess.save({ session: dbSession! });
        accessRecord = existingAccess;
        return;
      }

      const [createdAccess] = await RecordedCourseAccess.create(
        [
          {
            course: course._id,
            student: new mongoose.Types.ObjectId(userId),
            tutor: course.tutor,
            price: course.price || 0,
            skillCoinAmount,
            status: "pending",
            coinStatus: "locked",
          },
        ],
        { session: dbSession! }
      );

      accessRecord = createdAccess;
    });

    emitWalletUpdate(userId.toString(), buildWalletSummary(student));

    const notification = await logActivity({
      user: course.tutor.toString(),
      type: "COURSE",
      action: "UNLOCK_REQUESTED",
      entityId: course._id.toString(),
      message: `A learner requested access to "${course.title}"`,
      metadata: {
        courseId: course._id.toString(),
        requestId: accessRecord?._id?.toString?.() || "",
      },
    });

    emitNotification(course.tutor.toString(), notification);

    return res.status(201).json({
      access: {
        _id: accessRecord._id.toString(),
        status: accessRecord.status,
        coinStatus: accessRecord.coinStatus,
        skillCoinAmount: accessRecord.skillCoinAmount,
      },
      wallet: buildWalletSummary(student),
    });
  } catch (err: any) {
    console.error("REQUEST RECORDED ACCESS ERROR:", err);

    const message =
      err?.message ||
      "We could not start the unlock request for this recorded course";

    return res.status(
      [
        "Insufficient SkillCoin balance",
        "This recorded course is already unlocked for you",
        "Your unlock request is already waiting for tutor approval",
      ].includes(message)
        ? 400
        : 500
    ).json({ message });
  } finally {
    await dbSession?.endSession();
  }
};

export const approveRecordedCourseAccess: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const accessId = getId(req.params.accessId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(accessId)) {
      return res.status(400).json({ message: "Invalid access request ID" });
    }

    dbSession = await mongoose.startSession();

    const access = await RecordedCourseAccess.findById(accessId).session(
      dbSession
    );

    if (!access) {
      return res.status(404).json({ message: "Access request not found" });
    }

    if (access.tutor.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (access.status !== "pending" || access.coinStatus !== "locked") {
      return res.status(400).json({
        message: "This access request can no longer be approved",
      });
    }

    const [course, student, tutor] = await Promise.all([
      Course.findById(access.course).session(dbSession),
      User.findById(access.student).session(dbSession),
      User.findById(access.tutor).session(dbSession),
    ]);

    if (!course || !student || !tutor) {
      return res.status(404).json({
        message: "Recorded course approval data is incomplete",
      });
    }

    await dbSession.withTransaction(async () => {
      await settleLockedSkillCoins({
        student,
        tutor,
        amount: access.skillCoinAmount,
        courseId: access.course,
        description: `SkillCoin settled for recorded course unlock: ${course.title}`,
        dbSession: dbSession!,
        studentTransactionType: "recorded_course_spend",
        tutorTransactionType: "recorded_course_earn",
      });

      access.status = "approved";
      access.coinStatus = "settled";
      access.approvedAt = new Date();
      access.unlockedAt = new Date();
      await access.save({ session: dbSession! });
    });

    emitWalletUpdate(student._id.toString(), buildWalletSummary(student));
    emitWalletUpdate(tutor._id.toString(), buildWalletSummary(tutor));

    const notification = await logActivity({
      user: student._id.toString(),
      type: "COURSE",
      action: "UNLOCK_APPROVED",
      entityId: course._id.toString(),
      message: `Your access to "${course.title}" is now unlocked`,
      metadata: {
        courseId: course._id.toString(),
        requestId: access._id.toString(),
      },
    });

    emitNotification(student._id.toString(), notification);

    return res.json({
      success: true,
      accessId: access._id.toString(),
      status: access.status,
    });
  } catch (err: any) {
    console.error("APPROVE RECORDED ACCESS ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to approve recorded course access",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const rejectRecordedCourseAccess: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const accessId = getId(req.params.accessId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(accessId)) {
      return res.status(400).json({ message: "Invalid access request ID" });
    }

    dbSession = await mongoose.startSession();

    const access = await RecordedCourseAccess.findById(accessId).session(
      dbSession
    );

    if (!access) {
      return res.status(404).json({ message: "Access request not found" });
    }

    if (access.tutor.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (access.status !== "pending" || access.coinStatus !== "locked") {
      return res.status(400).json({
        message: "This access request can no longer be rejected",
      });
    }

    const [course, student] = await Promise.all([
      Course.findById(access.course).session(dbSession),
      User.findById(access.student).session(dbSession),
    ]);

    if (!course || !student) {
      return res.status(404).json({
        message: "Recorded course rejection data is incomplete",
      });
    }

    await dbSession.withTransaction(async () => {
      await unlockSkillCoins(
        student,
        access.skillCoinAmount,
        `SkillCoin unlocked after recorded course rejection: ${course.title}`,
        {
          courseId: access.course,
          extra: {
            accessType: "recorded_course",
          },
        },
        dbSession!,
        "recorded_course_unlock"
      );

      access.status = "rejected";
      access.coinStatus = "released";
      access.rejectedAt = new Date();
      access.approvedAt = null;
      access.unlockedAt = null;
      await access.save({ session: dbSession! });
    });

    emitWalletUpdate(student._id.toString(), buildWalletSummary(student));

    const notification = await logActivity({
      user: student._id.toString(),
      type: "COURSE",
      action: "UNLOCK_REJECTED",
      entityId: course._id.toString(),
      message: `Your unlock request for "${course.title}" was declined and SkillCoin was released`,
      metadata: {
        courseId: course._id.toString(),
        requestId: access._id.toString(),
      },
    });

    emitNotification(student._id.toString(), notification);

    return res.json({
      success: true,
      accessId: access._id.toString(),
      status: access.status,
    });
  } catch (err: any) {
    console.error("REJECT RECORDED ACCESS ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to reject recorded course access",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const requestTuitionEnrollment: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    dbSession = await mongoose.startSession();

    const course = await Course.findById(id).session(dbSession);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.type !== "tuition") {
      return res.status(400).json({
        message: "This course is not configured as a recurring tuition plan.",
      });
    }

    if (
      !course.tuitionSchedule?.days?.length ||
      !course.tuitionSchedule?.weeks?.length ||
      !course.tuitionSchedule?.startTime
    ) {
      return res.status(400).json({
        message: "This tuition course does not have a complete recurring schedule yet.",
      });
    }

    if (course.tutor.toString() === userId.toString()) {
      return res.status(400).json({
        message: "You already own this tuition plan as the tutor.",
      });
    }

    const student = await User.findById(userId).session(dbSession);

    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }

    const skillCoinAmount = Math.max(0, Math.round(course.price || 0));
    const durationMinutes = Math.max(15, parseDurationToMinutes(course.duration || "") || 60);
    let enrollmentRecord: any = null;

    await dbSession.withTransaction(async () => {
      const existingEnrollment = await TuitionEnrollment.findOne({
        course: course._id,
        student: new mongoose.Types.ObjectId(userId),
      }).session(dbSession!);

      if (existingEnrollment?.status === "approved") {
        throw new Error("You are already enrolled in this tuition plan");
      }

      if (existingEnrollment?.status === "pending") {
        throw new Error("Your tuition request is already waiting for tutor approval");
      }

      await lockSkillCoins(
        student,
        skillCoinAmount,
        `SkillCoin locked for tuition enrollment: ${course.title}`,
        {
          courseId: course._id,
          extra: {
            enrollmentType: "tuition",
            tutorId: course.tutor.toString(),
          },
        },
        dbSession!,
        "tuition_lock"
      );

      const scheduleSnapshot = {
        days: course.tuitionSchedule?.days || [],
        weeks: course.tuitionSchedule?.weeks || [],
        startTime: course.tuitionSchedule?.startTime || "",
        duration: course.duration || "",
        durationMinutes,
      };

      if (existingEnrollment) {
        existingEnrollment.price = course.price || 0;
        existingEnrollment.skillCoinAmount = skillCoinAmount;
        existingEnrollment.status = "pending";
        existingEnrollment.coinStatus = "locked";
        existingEnrollment.scheduleSnapshot = scheduleSnapshot;
        existingEnrollment.approvedAt = null;
        existingEnrollment.rejectedAt = null;
        existingEnrollment.generatedUntil = null;
        await existingEnrollment.save({ session: dbSession! });
        enrollmentRecord = existingEnrollment;
        return;
      }

      const [createdEnrollment] = await TuitionEnrollment.create(
        [
          {
            course: course._id,
            student: new mongoose.Types.ObjectId(userId),
            tutor: course.tutor,
            price: course.price || 0,
            skillCoinAmount,
            status: "pending",
            coinStatus: "locked",
            scheduleSnapshot,
          },
        ],
        { session: dbSession! }
      );

      enrollmentRecord = createdEnrollment;
    });

    emitWalletUpdate(userId.toString(), buildWalletSummary(student));

    const notification = await logActivity({
      user: course.tutor.toString(),
      type: "COURSE",
      action: "TUITION_REQUESTED",
      entityId: course._id.toString(),
      message: `A learner requested tuition enrollment for "${course.title}"`,
      metadata: {
        courseId: course._id.toString(),
        requestId: enrollmentRecord?._id?.toString?.() || "",
      },
    });

    emitNotification(course.tutor.toString(), notification);

    return res.status(201).json({
      enrollment: {
        _id: enrollmentRecord._id.toString(),
        status: enrollmentRecord.status,
        coinStatus: enrollmentRecord.coinStatus,
        skillCoinAmount: enrollmentRecord.skillCoinAmount,
      },
      wallet: buildWalletSummary(student),
    });
  } catch (err: any) {
    console.error("REQUEST TUITION ENROLLMENT ERROR:", err);

    const message =
      err?.message || "We could not start the tuition enrollment request";

    return res.status(
      [
        "Insufficient SkillCoin balance",
        "You are already enrolled in this tuition plan",
        "Your tuition request is already waiting for tutor approval",
      ].includes(message)
        ? 400
        : 500
    ).json({ message });
  } finally {
    await dbSession?.endSession();
  }
};

export const approveTuitionEnrollment: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const enrollmentId = getId(req.params.enrollmentId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(enrollmentId)) {
      return res.status(400).json({ message: "Invalid enrollment request ID" });
    }

    dbSession = await mongoose.startSession();

    const enrollment = await TuitionEnrollment.findById(enrollmentId).session(
      dbSession
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Tuition request not found" });
    }

    if (enrollment.tutor.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (enrollment.status !== "pending" || enrollment.coinStatus !== "locked") {
      return res.status(400).json({
        message: "This tuition request can no longer be approved",
      });
    }

    const [course, student, tutor] = await Promise.all([
      Course.findById(enrollment.course).session(dbSession),
      User.findById(enrollment.student).session(dbSession),
      User.findById(enrollment.tutor).session(dbSession),
    ]);

    if (!course || !student || !tutor) {
      return res.status(404).json({
        message: "Tuition approval data is incomplete",
      });
    }

    await dbSession.withTransaction(async () => {
      await settleLockedSkillCoins({
        student,
        tutor,
        amount: enrollment.skillCoinAmount,
        courseId: enrollment.course,
        description: `SkillCoin settled for tuition enrollment: ${course.title}`,
        dbSession: dbSession!,
        studentTransactionType: "tuition_spend",
        tutorTransactionType: "tuition_earn",
      });

      enrollment.status = "approved";
      enrollment.coinStatus = "settled";
      enrollment.approvedAt = new Date();
      enrollment.rejectedAt = null;
      await enrollment.save({ session: dbSession! });

      await ensureTuitionSessionsGenerated({
        enrollment,
        course,
        dbSession: dbSession!,
      });
    });

    emitWalletUpdate(student._id.toString(), buildWalletSummary(student));
    emitWalletUpdate(tutor._id.toString(), buildWalletSummary(tutor));

    const notification = await logActivity({
      user: student._id.toString(),
      type: "COURSE",
      action: "TUITION_APPROVED",
      entityId: course._id.toString(),
      message: `Your tuition enrollment for "${course.title}" is now active`,
      metadata: {
        courseId: course._id.toString(),
        requestId: enrollment._id.toString(),
      },
    });

    emitNotification(student._id.toString(), notification);

    return res.json({
      success: true,
      enrollmentId: enrollment._id.toString(),
      status: enrollment.status,
    });
  } catch (err: any) {
    console.error("APPROVE TUITION ENROLLMENT ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to approve tuition enrollment",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const rejectTuitionEnrollment: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const enrollmentId = getId(req.params.enrollmentId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(enrollmentId)) {
      return res.status(400).json({ message: "Invalid enrollment request ID" });
    }

    dbSession = await mongoose.startSession();

    const enrollment = await TuitionEnrollment.findById(enrollmentId).session(
      dbSession
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Tuition request not found" });
    }

    if (enrollment.tutor.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (enrollment.status !== "pending" || enrollment.coinStatus !== "locked") {
      return res.status(400).json({
        message: "This tuition request can no longer be rejected",
      });
    }

    const [course, student] = await Promise.all([
      Course.findById(enrollment.course).session(dbSession),
      User.findById(enrollment.student).session(dbSession),
    ]);

    if (!course || !student) {
      return res.status(404).json({
        message: "Tuition rejection data is incomplete",
      });
    }

    await dbSession.withTransaction(async () => {
      await unlockSkillCoins(
        student,
        enrollment.skillCoinAmount,
        `SkillCoin unlocked after tuition request was declined: ${course.title}`,
        {
          courseId: enrollment.course,
          extra: {
            enrollmentType: "tuition",
          },
        },
        dbSession!,
        "tuition_unlock"
      );

      enrollment.status = "rejected";
      enrollment.coinStatus = "released";
      enrollment.rejectedAt = new Date();
      enrollment.approvedAt = null;
      enrollment.generatedUntil = null;
      await enrollment.save({ session: dbSession! });
    });

    emitWalletUpdate(student._id.toString(), buildWalletSummary(student));

    const notification = await logActivity({
      user: student._id.toString(),
      type: "COURSE",
      action: "TUITION_REJECTED",
      entityId: course._id.toString(),
      message: `Your tuition request for "${course.title}" was declined and SkillCoin was released`,
      metadata: {
        courseId: course._id.toString(),
        requestId: enrollment._id.toString(),
      },
    });

    emitNotification(student._id.toString(), notification);

    return res.json({
      success: true,
      enrollmentId: enrollment._id.toString(),
      status: enrollment.status,
    });
  } catch (err: any) {
    console.error("REJECT TUITION ENROLLMENT ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to reject tuition enrollment",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const pauseTuitionEnrollment: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const enrollmentId = getId(req.params.enrollmentId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(enrollmentId)) {
      return res.status(400).json({ message: "Invalid enrollment request ID" });
    }

    dbSession = await mongoose.startSession();

    const enrollment = await TuitionEnrollment.findById(enrollmentId).session(
      dbSession
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Tuition enrollment not found" });
    }

    if (enrollment.tutor.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (enrollment.status !== "approved") {
      return res.status(400).json({
        message: "Only active tuition enrollments can be paused",
      });
    }

    await dbSession.withTransaction(async () => {
      enrollment.status = "paused";
      enrollment.pausedAt = new Date();
      await enrollment.save({ session: dbSession! });

      await cancelFutureTuitionSessions({
        enrollmentId: enrollment._id,
        fromDate: new Date(),
        dbSession: dbSession!,
      });
    });

    return res.json({
      success: true,
      enrollmentId: enrollment._id.toString(),
      status: enrollment.status,
    });
  } catch (err: any) {
    console.error("PAUSE TUITION ENROLLMENT ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to pause tuition enrollment",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const resumeTuitionEnrollment: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const enrollmentId = getId(req.params.enrollmentId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(enrollmentId)) {
      return res.status(400).json({ message: "Invalid enrollment request ID" });
    }

    dbSession = await mongoose.startSession();

    const enrollment = await TuitionEnrollment.findById(enrollmentId).session(
      dbSession
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Tuition enrollment not found" });
    }

    if (enrollment.tutor.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (enrollment.status !== "paused") {
      return res.status(400).json({
        message: "Only paused tuition enrollments can be resumed",
      });
    }

    const course = await Course.findById(enrollment.course).session(dbSession);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await dbSession.withTransaction(async () => {
      enrollment.status = "approved";
      enrollment.pausedAt = null;
      enrollment.generatedUntil = new Date(Date.now() - 60 * 1000);
      await enrollment.save({ session: dbSession! });

      await ensureTuitionSessionsGenerated({
        enrollment,
        course,
        dbSession: dbSession!,
      });
    });

    return res.json({
      success: true,
      enrollmentId: enrollment._id.toString(),
      status: enrollment.status,
    });
  } catch (err: any) {
    console.error("RESUME TUITION ENROLLMENT ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to resume tuition enrollment",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const cancelTuitionEnrollment: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const enrollmentId = getId(req.params.enrollmentId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(enrollmentId)) {
      return res.status(400).json({ message: "Invalid enrollment request ID" });
    }

    dbSession = await mongoose.startSession();

    const enrollment = await TuitionEnrollment.findById(enrollmentId).session(
      dbSession
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Tuition enrollment not found" });
    }

    const isTutor = enrollment.tutor.toString() === userId.toString();
    const isStudent = enrollment.student.toString() === userId.toString();

    if (!isTutor && !isStudent) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!["pending", "approved", "paused"].includes(enrollment.status)) {
      return res.status(400).json({
        message: "This tuition enrollment can no longer be cancelled",
      });
    }

    const [course, student] = await Promise.all([
      Course.findById(enrollment.course).session(dbSession),
      User.findById(enrollment.student).session(dbSession),
    ]);

    if (!course || !student) {
      return res.status(404).json({
        message: "Tuition cancellation data is incomplete",
      });
    }

    await dbSession.withTransaction(async () => {
      if (enrollment.status === "pending" && enrollment.coinStatus === "locked") {
        await unlockSkillCoins(
          student,
          enrollment.skillCoinAmount,
          `SkillCoin unlocked after tuition request was cancelled: ${course.title}`,
          {
            courseId: enrollment.course,
            extra: {
              enrollmentType: "tuition",
            },
          },
          dbSession!,
          "tuition_unlock"
        );
        enrollment.coinStatus = "released";
      }

      enrollment.status = "cancelled";
      enrollment.cancelledAt = new Date();
      enrollment.pausedAt = null;
      enrollment.generatedUntil = null;
      await enrollment.save({ session: dbSession! });

      await cancelFutureTuitionSessions({
        enrollmentId: enrollment._id,
        fromDate: new Date(),
        dbSession: dbSession!,
      });
    });

    emitWalletUpdate(student._id.toString(), buildWalletSummary(student));

    return res.json({
      success: true,
      enrollmentId: enrollment._id.toString(),
      status: enrollment.status,
      coinStatus: enrollment.coinStatus,
    });
  } catch (err: any) {
    console.error("CANCEL TUITION ENROLLMENT ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to cancel tuition enrollment",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const rateCourse: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const id = getId(req.params.id);
    const { value } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Not found" });
    }

    await CourseReview.findOneAndUpdate(
      {
        course: course._id,
        user: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: {
          rating: value,
        },
        $setOnInsert: {
          course: course._id,
          user: new mongoose.Types.ObjectId(userId),
          comment: "",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    await syncCourseRatings(course._id);
    await syncCourseReviewRefs(course._id);

    const refreshedCourse = await Course.findById(course._id)
      .select("averageRating totalRatings")
      .lean();

    return res.json({
      averageRating: refreshedCourse?.averageRating || 0,
      totalRatings: refreshedCourse?.totalRatings || 0,
    });
  } catch (err: any) {
    console.error("RATE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to rate course",
    });
  }
};

export const addReview: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const id = getId(req.params.id);
    const { rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Not found" });
    }

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

    await CourseReview.findOneAndUpdate(
      {
        course: course._id,
        user: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: {
          rating,
          comment: comment.trim(),
        },
        $setOnInsert: {
          course: course._id,
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    await syncCourseRatings(course._id);
    await syncCourseReviewRefs(course._id);

    const refreshedCourse = await Course.findById(course._id)
      .select("reviewRefs averageRating totalRatings")
      .lean();

    const finalReviews = await buildCourseReviews(
      refreshedCourse?.reviewRefs || []
    );

    return res.json({
      reviews: finalReviews,
      averageRating: refreshedCourse?.averageRating || 0,
      totalRatings: refreshedCourse?.totalRatings || 0,
    });
  } catch (err: any) {
    console.error("REVIEW ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to add review",
    });
  }
};

export const saveCourse: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
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
      isSaved: normalizeObjectIdArray(course.savedBy).some(
        (savedUserId) => savedUserId.toString() === userId
      ),
    });
  } catch (err: any) {
    console.error("SAVE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to save course",
    });
  }
};

export const unsaveCourse: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
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
      isSaved: normalizeObjectIdArray(course.savedBy).some(
        (savedUserId) => savedUserId.toString() === userId
      ),
    });
  } catch (err: any) {
    console.error("UNSAVE ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to unsave course",
    });
  }
};

export const getSavedCourses: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const courses = await Course.find({
      savedBy: userId,
    })
      .populate("tutor", "username")
      .sort({ createdAt: -1 })
      .lean();

    const finalCourses = await attachProfileToCourses(
      courses.map((course) => sanitizeCourseDocument(course))
    );

    return res.json(finalCourses);
  } catch (err: any) {
    console.error("GET SAVED ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to fetch saved courses",
    });
  }
};
