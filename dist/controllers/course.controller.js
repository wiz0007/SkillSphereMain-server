import Course from "../models/Course.js";
import Profile from "../models/Profile.js";
import mongoose from "mongoose";
/* ================= HELPERS ================= */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getId = (param) => {
    if (!param)
        return "";
    return Array.isArray(param) ? param[0] ?? "" : param;
};
/* ================= NORMALIZE ================= */
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
});
const syncCourseRatings = (course, userId, rating) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const existing = course.ratings.find((entry) => entry.user.toString() === userObjectId.toString());
    if (existing) {
        existing.value = rating;
    }
    else {
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
/* ================= PROFILE MERGE ================= */
const attachProfileToCourses = async (courses) => {
    const userIds = courses
        .map((c) => c.tutor?._id)
        .filter(Boolean);
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
/* ================= CREATE ================= */
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
/* ================= GET ALL ================= */
export const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find()
            .populate("tutor", "username")
            .sort({ createdAt: -1 })
            .lean();
        const finalCourses = await attachProfileToCourses(courses);
        return res.json(finalCourses);
    }
    catch (err) {
        console.error("GET ALL ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to fetch courses",
        });
    }
};
/* ================= GET MY ================= */
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
        const finalCourses = await attachProfileToCourses(courses);
        return res.json(finalCourses);
    }
    catch (err) {
        console.error("GET MY ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to fetch courses",
        });
    }
};
/* ================= GET BY ID ================= */
export const getCourseById = async (req, res) => {
    try {
        const id = getId(req.params.id);
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid ID" });
        }
        const course = await Course.findById(id)
            .populate("tutor", "username")
            .lean();
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        const [finalCourse] = await attachProfileToCourses([course]);
        return res.json(finalCourse);
    }
    catch (err) {
        console.error("GET ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to fetch course",
        });
    }
};
/* ================= UPDATE ================= */
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
/* ================= DELETE ================= */
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
        return res.json({ message: "Course deleted successfully" });
    }
    catch (err) {
        console.error("DELETE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to delete course",
        });
    }
};
/* ================= RATE ================= */
export const rateCourse = async (req, res) => {
    try {
        const userId = req.userId;
        const id = getId(req.params.id);
        const { value } = req.body;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid ID" });
        }
        const course = await Course.findById(id);
        if (!course)
            return res.status(404).json({ message: "Not found" });
        syncCourseRatings(course, userId, value);
        await course.save();
        return res.json({
            averageRating: course.averageRating,
            totalRatings: course.totalRatings,
        });
    }
    catch (err) {
        console.error("RATE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to rate course",
        });
    }
};
/* ================= REVIEW ================= */
export const addReview = async (req, res) => {
    try {
        const userId = req.userId;
        const id = getId(req.params.id);
        const { rating, comment } = req.body;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid ID" });
        }
        const course = await Course.findById(id);
        if (!course)
            return res.status(404).json({ message: "Not found" });
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const existing = course.reviews.find((r) => r.user.toString() === userObjectId.toString());
        if (existing) {
            existing.rating = rating;
            existing.comment = comment;
        }
        else {
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
    }
    catch (err) {
        console.error("REVIEW ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to add review",
        });
    }
};
/* ================= SAVE ================= */
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
            isSaved: course.savedBy.some((u) => u.toString() === userId),
        });
    }
    catch (err) {
        console.error("SAVE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to save course",
        });
    }
};
/* ================= UNSAVE ================= */
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
            isSaved: course.savedBy.some((u) => u.toString() === userId),
        });
    }
    catch (err) {
        console.error("UNSAVE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to unsave course",
        });
    }
};
/* ================= GET SAVED ================= */
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
        const finalCourses = await attachProfileToCourses(courses);
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