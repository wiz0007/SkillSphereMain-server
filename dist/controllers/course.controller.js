import mongoose from "mongoose";
import Course from "../models/Course.js";
import CourseReview from "../models/CourseReview.js";
import Profile from "../models/Profile.js";
import Session from "../models/Session.js";
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getId = (param) => {
    if (!param)
        return "";
    return Array.isArray(param) ? param[0] ?? "" : param;
};
const normalizeCourseData = (body) => ({
    title: body.title?.trim(),
    description: body.description?.trim(),
    category: body.category?.trim(),
    skills: Array.isArray(body.skills)
        ? body.skills.map((s) => s.trim()).filter(Boolean)
        : [],
    price: !isNaN(Number(body.price)) ? Number(body.price) : 0,
    duration: body.duration?.trim(),
    level: body.level
        ? body.level.charAt(0).toUpperCase() +
            body.level.slice(1).toLowerCase()
        : "Beginner",
    isPublished: typeof body.isPublished === "boolean" ? body.isPublished : true,
});
const hasUserEnrolledInCourse = async (userId, course) => {
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
const attachProfileToCourses = async (courses) => {
    const userIds = courses.map((c) => c.tutor?._id).filter(Boolean);
    const profiles = await Profile.find({
        user: { $in: userIds },
    })
        .select("user profilePhoto")
        .lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));
    return courses.map((course) => {
        const profile = profileMap.get(course.tutor?._id?.toString());
        return {
            ...course,
            tutor: {
                ...course.tutor,
                profilePhoto: profile?.profilePhoto || null,
            },
        };
    });
};
const sanitizeCourseDocument = (course) => {
    const { ratings, reviews, ...rest } = course;
    return rest;
};
const normalizeObjectIdArray = (value) => Array.isArray(value) ? value : [];
const extractTutorId = (tutor) => {
    if (tutor &&
        typeof tutor === "object" &&
        "_id" in tutor &&
        tutor._id) {
        return tutor._id;
    }
    return tutor;
};
const syncCourseRatings = async (courseId) => {
    const summary = await CourseReview.aggregate([
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
const syncCourseReviewRefs = async (courseId) => {
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
const buildCourseReviews = async (reviewRefs) => {
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
export const createCourse = async (req, res) => {
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
    }
    catch (err) {
        console.error("CREATE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to create course",
        });
    }
};
export const getAllCourses = async (_req, res) => {
    try {
        const courses = await Course.find()
            .populate("tutor", "username")
            .sort({ createdAt: -1 })
            .lean();
        const finalCourses = await attachProfileToCourses(courses.map((course) => sanitizeCourseDocument(course)));
        return res.json(finalCourses);
    }
    catch (err) {
        console.error("GET ALL ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to fetch courses",
        });
    }
};
export const getMyCourses = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const courses = await Course.find({ tutor: userId })
            .populate("tutor", "username")
            .sort({ createdAt: -1 })
            .lean();
        const finalCourses = await attachProfileToCourses(courses.map((course) => sanitizeCourseDocument(course)));
        return res.json(finalCourses);
    }
    catch (err) {
        console.error("GET MY ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to fetch courses",
        });
    }
};
export const getCourseById = async (req, res) => {
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
        const [finalCourse] = await attachProfileToCourses([
            sanitizeCourseDocument(course),
        ]);
        const reviews = await buildCourseReviews(course.reviewRefs || []);
        if (!viewerId) {
            return res.json({
                ...finalCourse,
                reviews,
                isSaved: false,
            });
        }
        if (!tutorId) {
            return res.status(500).json({
                message: "Course tutor information is incomplete",
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
            isSaved: savedBy.some((userId) => userId.toString() === viewerId),
            reviewEligibility: {
                canReview: hasEnrolled,
                hasEnrolled,
                hasReviewed: Boolean(existingReview),
            },
        });
    }
    catch (err) {
        console.error("GET ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to fetch course",
        });
    }
};
export const updateCourse = async (req, res) => {
    try {
        const userId = req.userId;
        const id = getId(req.params.id);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid ID" });
        }
        const course = await Course.findOneAndUpdate({ _id: id, tutor: userId }, normalizeCourseData(req.body), { new: true, runValidators: true });
        if (!course) {
            return res.status(404).json({
                message: "Course not found or not authorized",
            });
        }
        return res.json(course);
    }
    catch (err) {
        console.error("UPDATE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to update course",
        });
    }
};
export const toggleCoursePublishStatus = async (req, res) => {
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
        const course = await Course.findOneAndUpdate({ _id: id, tutor: userId }, { isPublished }, { new: true });
        if (!course) {
            return res.status(404).json({
                message: "Course not found or not authorized",
            });
        }
        return res.json(course);
    }
    catch (err) {
        console.error("TOGGLE PUBLISH ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to update course status",
        });
    }
};
export const deleteCourse = async (req, res) => {
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
        await CourseReview.deleteMany({ course: course._id });
        return res.json({ message: "Course deleted successfully" });
    }
    catch (err) {
        console.error("DELETE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to delete course",
        });
    }
};
export const rateCourse = async (req, res) => {
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
        await CourseReview.findOneAndUpdate({
            course: course._id,
            user: new mongoose.Types.ObjectId(userId),
        }, {
            $set: {
                rating: value,
            },
            $setOnInsert: {
                course: course._id,
                user: new mongoose.Types.ObjectId(userId),
                comment: "",
            },
        }, {
            upsert: true,
            new: true,
            runValidators: true,
        });
        await syncCourseRatings(course._id);
        await syncCourseReviewRefs(course._id);
        const refreshedCourse = await Course.findById(course._id)
            .select("averageRating totalRatings")
            .lean();
        return res.json({
            averageRating: refreshedCourse?.averageRating || 0,
            totalRatings: refreshedCourse?.totalRatings || 0,
        });
    }
    catch (err) {
        console.error("RATE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to rate course",
        });
    }
};
export const addReview = async (req, res) => {
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
                message: "You can review this course only after you have enrolled in it",
            });
        }
        await CourseReview.findOneAndUpdate({
            course: course._id,
            user: new mongoose.Types.ObjectId(userId),
        }, {
            $set: {
                rating,
                comment: comment.trim(),
            },
            $setOnInsert: {
                course: course._id,
                user: new mongoose.Types.ObjectId(userId),
            },
        }, {
            upsert: true,
            new: true,
            runValidators: true,
        });
        await syncCourseRatings(course._id);
        await syncCourseReviewRefs(course._id);
        const refreshedCourse = await Course.findById(course._id)
            .select("reviewRefs averageRating totalRatings")
            .lean();
        const finalReviews = await buildCourseReviews(refreshedCourse?.reviewRefs || []);
        return res.json({
            reviews: finalReviews,
            averageRating: refreshedCourse?.averageRating || 0,
            totalRatings: refreshedCourse?.totalRatings || 0,
        });
    }
    catch (err) {
        console.error("REVIEW ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to add review",
        });
    }
};
export const saveCourse = async (req, res) => {
    try {
        const userId = req.userId;
        const id = getId(req.params.id);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const course = await Course.findByIdAndUpdate(id, {
            $addToSet: {
                savedBy: new mongoose.Types.ObjectId(userId),
            },
        }, { new: true });
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        return res.json({
            isSaved: normalizeObjectIdArray(course.savedBy).some((u) => u.toString() === userId),
        });
    }
    catch (err) {
        console.error("SAVE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to save course",
        });
    }
};
export const unsaveCourse = async (req, res) => {
    try {
        const userId = req.userId;
        const id = getId(req.params.id);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const course = await Course.findByIdAndUpdate(id, {
            $pull: {
                savedBy: new mongoose.Types.ObjectId(userId),
            },
        }, { new: true });
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        return res.json({
            isSaved: normalizeObjectIdArray(course.savedBy).some((u) => u.toString() === userId),
        });
    }
    catch (err) {
        console.error("UNSAVE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to unsave course",
        });
    }
};
export const getSavedCourses = async (req, res) => {
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
        const finalCourses = await attachProfileToCourses(courses.map((course) => sanitizeCourseDocument(course)));
        return res.json(finalCourses);
    }
    catch (err) {
        console.error("GET SAVED ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to fetch saved courses",
        });
    }
};
//# sourceMappingURL=course.controller.js.map