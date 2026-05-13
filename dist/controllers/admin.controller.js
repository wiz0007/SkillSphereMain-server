import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import Course from "../models/Course.js";
import CourseReview from "../models/CourseReview.js";
import Message from "../models/Message.js";
import Profile from "../models/Profile.js";
import RecordedCourseAccess from "../models/RecordedCourseAccess.js";
import Session from "../models/Session.js";
import SupportConversation from "../models/SupportConversation.js";
import SupportMessage from "../models/SupportMessage.js";
import User from "../models/User.js";
import WalletRechargeOrder from "../models/WalletRechargeOrder.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { emitNotification, emitWalletUpdate } from "../config/socket.js";
import { logActivity } from "../utils/activityLogger.js";
import { creditSkillCoins, debitSkillCoins } from "../utils/wallet.js";
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getId = (param) => {
    if (typeof param === "string")
        return param;
    if (Array.isArray(param) && typeof param[0] === "string")
        return param[0];
    return "";
};
const getProfileMap = async (userIds) => {
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
const serializeUser = (user, profileMap) => {
    const id = user?._id?.toString?.() || user?.toString?.() || "";
    const profile = profileMap.get(id);
    return {
        _id: id,
        username: user?.username || "",
        email: user?.email || "",
        fullName: profile?.fullName || "",
        profilePhoto: profile?.profilePhoto || "",
        isTutor: profile?.isTutor || false,
        isAdmin: Boolean(user?.isAdmin),
        profileCompleted: Boolean(user?.profileCompleted),
        isVerified: Boolean(user?.isVerified),
        skillCoinBalance: Number(user?.skillCoinBalance || 0),
        lockedSkillCoins: Number(user?.lockedSkillCoins || 0),
        createdAt: user?.createdAt || null,
    };
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
const deleteUserData = async (userId) => {
    const affectedCourseIds = await CourseReview.distinct("course", {
        user: userId,
    });
    const supportConversationIds = await SupportConversation.find({
        $or: [{ requester: userId }, { assignedTo: userId }],
    })
        .select("_id")
        .lean();
    const ownedCourseIds = await Course.find({ tutor: userId }).distinct("_id");
    await Promise.all([
        Activity.deleteMany({ user: userId }),
        Message.deleteMany({
            $or: [{ sender: userId }, { recipient: userId }],
        }),
        Session.deleteMany({
            $or: [{ student: userId }, { tutor: userId }],
        }),
        Profile.deleteOne({ user: userId }),
        RecordedCourseAccess.deleteMany({
            $or: [{ student: userId }, { tutor: userId }, { course: { $in: ownedCourseIds } }],
        }),
        CourseReview.deleteMany({ user: userId }),
        CourseReview.deleteMany({ course: { $in: ownedCourseIds } }),
        Course.deleteMany({ tutor: userId }),
        SupportMessage.deleteMany({
            $or: [
                { sender: userId },
                { conversation: { $in: supportConversationIds.map((entry) => entry._id) } },
            ],
        }),
        SupportConversation.deleteMany({
            $or: [{ requester: userId }, { assignedTo: userId }],
        }),
        WalletRechargeOrder.deleteMany({ user: userId }),
        WalletTransaction.deleteMany({ user: userId }),
        Course.updateMany({}, {
            $pull: {
                savedBy: userId,
            },
        }),
    ]);
    for (const courseId of affectedCourseIds) {
        await syncCourseRatings(courseId);
        await syncCourseReviewRefs(courseId);
    }
};
export const getAdminOverview = async (_req, res) => {
    try {
        const [totalUsers, totalCourses, totalSessions, totalSupportThreads, totalReviews, totalWalletTransactions, totalTutors, pendingSupportThreads, pendingSessions, recordedCourses, liveCourses, recentUsers, recentActivities,] = await Promise.all([
            User.countDocuments(),
            Course.countDocuments(),
            Session.countDocuments(),
            SupportConversation.countDocuments(),
            CourseReview.countDocuments(),
            WalletTransaction.countDocuments(),
            Profile.countDocuments({ isTutor: true }),
            SupportConversation.countDocuments({
                status: { $ne: "resolved" },
            }),
            Session.countDocuments({ status: "pending" }),
            Course.countDocuments({ type: "recorded" }),
            Course.countDocuments({ type: "live" }),
            User.find()
                .select("username email isAdmin profileCompleted isVerified skillCoinBalance lockedSkillCoins createdAt")
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),
            Activity.find()
                .sort({ createdAt: -1 })
                .limit(8)
                .lean(),
        ]);
        const profileMap = await getProfileMap(recentUsers.map((user) => user._id.toString()));
        return res.json({
            metrics: {
                totalUsers,
                totalTutors,
                totalCourses,
                liveCourses,
                recordedCourses,
                totalSessions,
                pendingSessions,
                totalSupportThreads,
                pendingSupportThreads,
                totalReviews,
                totalWalletTransactions,
            },
            recentUsers: recentUsers.map((user) => serializeUser(user, profileMap)),
            recentActivities,
        });
    }
    catch (error) {
        console.error("ADMIN OVERVIEW ERROR:", error);
        return res.status(500).json({ message: "Failed to fetch admin overview" });
    }
};
export const getAdminUsers = async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();
        const query = search
            ? {
                $or: [
                    { username: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ],
            }
            : {};
        const users = await User.find(query)
            .select("username email isAdmin profileCompleted isVerified skillCoinBalance lockedSkillCoins createdAt")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        const profileMap = await getProfileMap(users.map((user) => user._id.toString()));
        return res.json(users.map((user) => serializeUser(user, profileMap)));
    }
    catch (error) {
        console.error("ADMIN USERS ERROR:", error);
        return res.status(500).json({ message: "Failed to fetch users" });
    }
};
export const adjustAdminUserSkillCoins = async (req, res) => {
    try {
        const id = getId(req.params.id);
        const actorId = req.userId;
        const { action, amount, note } = req.body;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        if (!actorId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!["credit", "debit"].includes(action)) {
            return res.status(400).json({ message: "Invalid wallet action" });
        }
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        const targetUser = await User.findById(id);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }
        const actor = await User.findById(actorId).select("email username").lean();
        const actorLabel = actor?.email || actor?.username || "admin";
        const description = `Admin ${action} by ${actorLabel}${note ? `: ${String(note).trim()}` : ""}`;
        const metadata = {
            extra: {
                adminId: actorId,
                note: typeof note === "string" ? note.trim() : "",
            },
        };
        const walletSummary = action === "credit"
            ? await creditSkillCoins(targetUser, numericAmount, description, metadata)
            : await debitSkillCoins(targetUser, numericAmount, description, metadata);
        emitWalletUpdate(targetUser._id.toString(), walletSummary);
        if (action === "credit") {
            const giftNotification = await logActivity({
                user: targetUser._id.toString(),
                type: "SYSTEM",
                action: "ADMIN_GIFT",
                message: `You received ${numericAmount} SkillCoin from admin`,
                metadata: {
                    kind: "admin_skillcoin_gift",
                    amount: numericAmount,
                    note: typeof note === "string" ? note.trim() : "",
                },
            });
            if (giftNotification) {
                emitNotification(targetUser._id.toString(), giftNotification);
            }
        }
        return res.json({
            message: action === "credit"
                ? "SkillCoin credited successfully"
                : "SkillCoin debited successfully",
            wallet: walletSummary,
        });
    }
    catch (error) {
        console.error("ADMIN USER WALLET ERROR:", error);
        return res.status(500).json({
            message: error?.message || "Failed to update user wallet",
        });
    }
};
export const deleteAdminUser = async (req, res) => {
    try {
        const id = getId(req.params.id);
        const actorId = req.userId;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        if (!actorId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (id === actorId) {
            return res.status(400).json({ message: "Use account deletion for your own admin account" });
        }
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        await deleteUserData(user._id);
        await user.deleteOne();
        return res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.error("ADMIN DELETE USER ERROR:", error);
        return res.status(500).json({ message: "Failed to delete user" });
    }
};
export const getAdminCourses = async (_req, res) => {
    try {
        const courses = await Course.find()
            .populate("tutor", "username email isAdmin")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        const profileMap = await getProfileMap(courses
            .map((course) => course.tutor?._id?.toString?.() || "")
            .filter(Boolean));
        return res.json(courses.map((course) => ({
            _id: course._id.toString(),
            title: course.title,
            type: course.type,
            category: course.category || "",
            level: course.level || "",
            price: course.price || 0,
            duration: course.duration || "",
            isPublished: Boolean(course.isPublished),
            averageRating: Number(course.averageRating || 0),
            totalRatings: Number(course.totalRatings || 0),
            createdAt: course.createdAt,
            tutor: serializeUser(course.tutor, profileMap),
        })));
    }
    catch (error) {
        console.error("ADMIN COURSES ERROR:", error);
        return res.status(500).json({ message: "Failed to fetch courses" });
    }
};
export const updateAdminCoursePublishStatus = async (req, res) => {
    try {
        const id = getId(req.params.id);
        const { isPublished } = req.body;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }
        if (typeof isPublished !== "boolean") {
            return res.status(400).json({ message: "isPublished must be boolean" });
        }
        const course = await Course.findByIdAndUpdate(id, { isPublished }, { new: true }).lean();
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        return res.json({
            _id: course._id.toString(),
            isPublished: course.isPublished,
        });
    }
    catch (error) {
        console.error("ADMIN COURSE PUBLISH ERROR:", error);
        return res.status(500).json({ message: "Failed to update course status" });
    }
};
export const deleteAdminCourse = async (req, res) => {
    try {
        const id = getId(req.params.id);
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }
        const course = await Course.findByIdAndDelete(id);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        await CourseReview.deleteMany({ course: course._id });
        return res.json({ message: "Course deleted successfully" });
    }
    catch (error) {
        console.error("ADMIN DELETE COURSE ERROR:", error);
        return res.status(500).json({ message: "Failed to delete course" });
    }
};
export const getAdminSessions = async (_req, res) => {
    try {
        const sessions = await Session.find()
            .populate("student", "username email isAdmin")
            .populate("tutor", "username email isAdmin")
            .populate("course", "title type")
            .sort({ date: -1 })
            .limit(100)
            .lean();
        const userIds = sessions.flatMap((session) => [
            session.student?._id?.toString?.() || "",
            session.tutor?._id?.toString?.() || "",
        ]);
        const profileMap = await getProfileMap(userIds);
        return res.json(sessions.map((session) => ({
            _id: session._id.toString(),
            title: session.title,
            status: session.status,
            price: session.price,
            skillCoinAmount: session.skillCoinAmount,
            coinStatus: session.coinStatus,
            date: session.date,
            duration: session.duration,
            student: serializeUser(session.student, profileMap),
            tutor: serializeUser(session.tutor, profileMap),
            course: session.course
                ? {
                    _id: session.course._id?.toString?.() || "",
                    title: session.course.title || "",
                    type: session.course.type || "live",
                }
                : null,
        })));
    }
    catch (error) {
        console.error("ADMIN SESSIONS ERROR:", error);
        return res.status(500).json({ message: "Failed to fetch sessions" });
    }
};
export const getAdminSupportConversations = async (_req, res) => {
    try {
        const conversations = await SupportConversation.find()
            .populate("requester", "username email isAdmin")
            .populate("assignedTo", "username email isAdmin")
            .sort({ lastMessageAt: -1 })
            .limit(100)
            .lean();
        const userIds = conversations.flatMap((conversation) => [
            conversation.requester?._id?.toString?.() || "",
            conversation.assignedTo?._id?.toString?.() || "",
        ]);
        const profileMap = await getProfileMap(userIds);
        return res.json(conversations.map((conversation) => ({
            _id: conversation._id.toString(),
            topic: conversation.topic,
            subject: conversation.subject,
            status: conversation.status,
            lastMessageAt: conversation.lastMessageAt,
            createdAt: conversation.createdAt,
            requester: serializeUser(conversation.requester, profileMap),
            assignedTo: conversation.assignedTo
                ? serializeUser(conversation.assignedTo, profileMap)
                : null,
        })));
    }
    catch (error) {
        console.error("ADMIN SUPPORT ERROR:", error);
        return res.status(500).json({ message: "Failed to fetch support threads" });
    }
};
export const updateAdminSupportStatus = async (req, res) => {
    try {
        const id = getId(req.params.id);
        const { status } = req.body;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid support thread ID" });
        }
        if (!["open", "waiting_on_support", "waiting_on_user", "resolved"].includes(status)) {
            return res.status(400).json({ message: "Invalid support status" });
        }
        const conversation = await SupportConversation.findByIdAndUpdate(id, { status }, { new: true }).lean();
        if (!conversation) {
            return res.status(404).json({ message: "Support conversation not found" });
        }
        return res.json({
            _id: conversation._id.toString(),
            status: conversation.status,
        });
    }
    catch (error) {
        console.error("ADMIN SUPPORT STATUS ERROR:", error);
        return res.status(500).json({ message: "Failed to update support status" });
    }
};
export const getAdminReviews = async (_req, res) => {
    try {
        const reviews = await CourseReview.find()
            .populate("course", "title type")
            .populate("user", "username email isAdmin")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        const profileMap = await getProfileMap(reviews.map((review) => review.user?._id?.toString?.() || ""));
        return res.json(reviews.map((review) => ({
            _id: review._id.toString(),
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            user: serializeUser(review.user, profileMap),
            course: review.course
                ? {
                    _id: review.course._id?.toString?.() || "",
                    title: review.course.title || "",
                    type: review.course.type || "live",
                }
                : null,
        })));
    }
    catch (error) {
        console.error("ADMIN REVIEWS ERROR:", error);
        return res.status(500).json({ message: "Failed to fetch reviews" });
    }
};
export const deleteAdminReview = async (req, res) => {
    try {
        const id = getId(req.params.id);
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid review ID" });
        }
        const review = await CourseReview.findByIdAndDelete(id);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }
        await syncCourseRatings(review.course);
        await syncCourseReviewRefs(review.course);
        return res.json({ message: "Review deleted successfully" });
    }
    catch (error) {
        console.error("ADMIN DELETE REVIEW ERROR:", error);
        return res.status(500).json({ message: "Failed to delete review" });
    }
};
export const getAdminWalletTransactions = async (_req, res) => {
    try {
        const transactions = await WalletTransaction.find()
            .populate("user", "username email isAdmin")
            .sort({ createdAt: -1 })
            .limit(120)
            .lean();
        const profileMap = await getProfileMap(transactions.map((transaction) => transaction.user?._id?.toString?.() || ""));
        return res.json(transactions.map((transaction) => ({
            _id: transaction._id.toString(),
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            balanceAfter: transaction.balanceAfter,
            lockedAfter: transaction.lockedAfter,
            auditStatus: transaction.auditStatus,
            chainTxHash: transaction.chainTxHash || null,
            createdAt: transaction.createdAt,
            user: serializeUser(transaction.user, profileMap),
        })));
    }
    catch (error) {
        console.error("ADMIN WALLET ERROR:", error);
        return res.status(500).json({ message: "Failed to fetch wallet activity" });
    }
};
//# sourceMappingURL=admin.controller.js.map