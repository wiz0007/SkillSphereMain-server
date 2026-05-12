import mongoose from "mongoose";
import { emitNotification, emitWalletUpdate } from "../config/socket.js";
import Course from "../models/Course.js";
import CourseReview from "../models/CourseReview.js";
import Profile from "../models/Profile.js";
import RecordedCourseAccess from "../models/RecordedCourseAccess.js";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { logActivity } from "../utils/activityLogger.js";
import { buildWalletSummary, lockSkillCoins, settleLockedSkillCoins, unlockSkillCoins, } from "../utils/wallet.js";
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getId = (param) => {
    if (!param)
        return "";
    return Array.isArray(param) ? param[0] ?? "" : param;
};
const getRecordedSkillCoinAmount = (price) => Math.max(0, Math.round(price || 0));
const normalizeCourseData = (body) => ({
    title: body.title?.trim(),
    description: body.description?.trim(),
    type: body.type === "recorded" ? "recorded" : "live",
    category: body.category?.trim(),
    skills: Array.isArray(body.skills)
        ? body.skills.map((s) => s.trim()).filter(Boolean)
        : [],
    price: !isNaN(Number(body.price)) ? Number(body.price) : 0,
    duration: body.duration?.trim(),
    contentDriveLink: body.type === "recorded" ? body.contentDriveLink?.trim() || "" : "",
    level: body.level
        ? body.level.charAt(0).toUpperCase() +
            body.level.slice(1).toLowerCase()
        : "Beginner",
    isPublished: typeof body.isPublished === "boolean" ? body.isPublished : true,
});
const buildProfileMap = async (userIds) => {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (!uniqueIds.length) {
        return new Map();
    }
    const profiles = await Profile.find({
        user: {
            $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
    })
        .select("user fullName profilePhoto isTutor")
        .lean();
    return new Map(profiles.map((profile) => [
        profile.user.toString(),
        {
            fullName: profile.fullName || "",
            profilePhoto: profile.profilePhoto || "",
            isTutor: !!profile.isTutor,
        },
    ]));
};
const serializeUser = (value, profileMap) => {
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
const attachProfileToCourses = async (courses) => {
    const userIds = courses.map((c) => c.tutor?._id).filter(Boolean);
    const profileMap = await buildProfileMap(userIds.map((value) => value.toString()));
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
const sanitizeCourseDocument = (course, options) => {
    const { ratings, reviews, contentDriveLink, ...rest } = course;
    if (options?.includeDriveLink) {
        return {
            ...rest,
            contentDriveLink: contentDriveLink || "",
        };
    }
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
const buildEmptyRecordedAccessSummary = () => ({
    hasAccess: false,
    hasPendingRequest: false,
    status: "none",
    requestId: null,
    canPurchase: true,
    contentDriveLink: "",
});
const buildRecordedAccessSummary = async (viewerId, course) => {
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
        contentDriveLink: access.status === "approved" ? course.contentDriveLink || "" : "",
    };
};
const buildTutorRecordedRequests = async (courseId) => {
    const requests = await RecordedCourseAccess.find({
        course: new mongoose.Types.ObjectId(courseId),
    })
        .populate("student", "username")
        .sort({ createdAt: -1 })
        .lean();
    const profileMap = await buildProfileMap(requests.map((request) => request.student?._id?.toString?.() || ""));
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
        const finalCourses = await attachProfileToCourses(courses.map((course) => sanitizeCourseDocument(course, { includeDriveLink: true })));
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
        if (!tutorId) {
            return res.status(500).json({
                message: "Course tutor information is incomplete",
            });
        }
        const isOwner = Boolean(viewerId && tutorId.toString() === viewerId.toString());
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
                recordedAccess: course.type === "recorded" ? buildEmptyRecordedAccessSummary() : null,
                recordedRequests: [],
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
            recordedAccess: !isOwner && course.type === "recorded"
                ? await buildRecordedAccessSummary(viewerId, course)
                : null,
            recordedRequests: isOwner && course.type === "recorded"
                ? await buildTutorRecordedRequests(course._id)
                : [],
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
        await Promise.all([
            CourseReview.deleteMany({ course: course._id }),
            RecordedCourseAccess.deleteMany({ course: course._id }),
        ]);
        return res.json({ message: "Course deleted successfully" });
    }
    catch (err) {
        console.error("DELETE ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to delete course",
        });
    }
};
export const requestRecordedCourseAccess = async (req, res) => {
    let dbSession = null;
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
        let accessRecord = null;
        await dbSession.withTransaction(async () => {
            const existingAccess = await RecordedCourseAccess.findOne({
                course: course._id,
                student: new mongoose.Types.ObjectId(userId),
            }).session(dbSession);
            if (existingAccess?.status === "approved") {
                throw new Error("This recorded course is already unlocked for you");
            }
            if (existingAccess?.status === "pending") {
                throw new Error("Your unlock request is already waiting for tutor approval");
            }
            await lockSkillCoins(student, skillCoinAmount, `SkillCoin locked for recorded course unlock: ${course.title}`, {
                courseId: course._id,
                extra: {
                    accessType: "recorded_course",
                    tutorId: course.tutor.toString(),
                },
            }, dbSession, "recorded_course_lock");
            if (existingAccess) {
                existingAccess.price = course.price || 0;
                existingAccess.skillCoinAmount = skillCoinAmount;
                existingAccess.status = "pending";
                existingAccess.coinStatus = "locked";
                existingAccess.approvedAt = null;
                existingAccess.rejectedAt = null;
                existingAccess.unlockedAt = null;
                await existingAccess.save({ session: dbSession });
                accessRecord = existingAccess;
                return;
            }
            const [createdAccess] = await RecordedCourseAccess.create([
                {
                    course: course._id,
                    student: new mongoose.Types.ObjectId(userId),
                    tutor: course.tutor,
                    price: course.price || 0,
                    skillCoinAmount,
                    status: "pending",
                    coinStatus: "locked",
                },
            ], { session: dbSession });
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
    }
    catch (err) {
        console.error("REQUEST RECORDED ACCESS ERROR:", err);
        const message = err?.message ||
            "We could not start the unlock request for this recorded course";
        return res.status([
            "Insufficient SkillCoin balance",
            "This recorded course is already unlocked for you",
            "Your unlock request is already waiting for tutor approval",
        ].includes(message)
            ? 400
            : 500).json({ message });
    }
    finally {
        await dbSession?.endSession();
    }
};
export const approveRecordedCourseAccess = async (req, res) => {
    let dbSession = null;
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
        const access = await RecordedCourseAccess.findById(accessId).session(dbSession);
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
                dbSession: dbSession,
                studentTransactionType: "recorded_course_spend",
                tutorTransactionType: "recorded_course_earn",
            });
            access.status = "approved";
            access.coinStatus = "settled";
            access.approvedAt = new Date();
            access.unlockedAt = new Date();
            await access.save({ session: dbSession });
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
    }
    catch (err) {
        console.error("APPROVE RECORDED ACCESS ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to approve recorded course access",
        });
    }
    finally {
        await dbSession?.endSession();
    }
};
export const rejectRecordedCourseAccess = async (req, res) => {
    let dbSession = null;
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
        const access = await RecordedCourseAccess.findById(accessId).session(dbSession);
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
            await unlockSkillCoins(student, access.skillCoinAmount, `SkillCoin unlocked after recorded course rejection: ${course.title}`, {
                courseId: access.course,
                extra: {
                    accessType: "recorded_course",
                },
            }, dbSession, "recorded_course_unlock");
            access.status = "rejected";
            access.coinStatus = "released";
            access.rejectedAt = new Date();
            access.approvedAt = null;
            access.unlockedAt = null;
            await access.save({ session: dbSession });
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
    }
    catch (err) {
        console.error("REJECT RECORDED ACCESS ERROR:", err);
        return res.status(500).json({
            message: err.message || "Failed to reject recorded course access",
        });
    }
    finally {
        await dbSession?.endSession();
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
            isSaved: normalizeObjectIdArray(course.savedBy).some((savedUserId) => savedUserId.toString() === userId),
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
            isSaved: normalizeObjectIdArray(course.savedBy).some((savedUserId) => savedUserId.toString() === userId),
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