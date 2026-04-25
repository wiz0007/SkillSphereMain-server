import mongoose from "mongoose";
import Session from "../models/Session.js";
import Profile from "../models/Profile.js";
import Course from "../models/Course.js";
import { logActivity } from "../utils/activityLogger.js";
import { emitNotification } from "../config/socket.js";
/* ================= HELPERS ================= */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getId = (param) => {
    if (typeof param === "string")
        return param;
    if (Array.isArray(param) && typeof param[0] === "string")
        return param[0];
    return "";
};
/* ================= CREATE SESSION ================= */
export const createSession = async (req, res) => {
    try {
        const { userId } = req;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { courseId, date, duration, message } = req.body;
        if (!courseId || !date || !duration) {
            return res.status(400).json({ message: "Missing fields" });
        }
        if (!isValidObjectId(courseId)) {
            return res.status(400).json({ message: "Invalid course ID" });
        }
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        const tutorId = course.tutor;
        /* ❌ PREVENT SELF BOOKING */
        if (tutorId.toString() === userId.toString()) {
            return res.status(400).json({
                message: "Cannot book your own course",
            });
        }
        const tutorProfile = await Profile.findOne({ user: tutorId });
        if (!tutorProfile || !tutorProfile.isTutor) {
            return res.status(400).json({ message: "User is not a tutor" });
        }
        /* 🔒 DOUBLE BOOKING CHECK */
        const start = new Date(date);
        const end = new Date(start.getTime() + duration * 60000);
        const conflict = await Session.findOne({
            tutor: tutorId,
            status: { $in: ["pending", "accepted"] },
            $expr: {
                $and: [
                    { $lt: ["$date", end] },
                    {
                        $gt: [
                            {
                                $add: ["$date", { $multiply: ["$duration", 60000] }],
                            },
                            start,
                        ],
                    },
                ],
            },
        });
        if (conflict) {
            return res.status(400).json({
                message: "Tutor not available at this time",
            });
        }
        /* 💰 PRICE FROM COURSE */
        const price = course.price || 0;
        const session = await Session.create({
            student: new mongoose.Types.ObjectId(userId),
            tutor: tutorId,
            title: course.title,
            description: message,
            date,
            duration,
            price,
            status: "pending",
        });
        /* 🔔 CREATE NOTIFICATION */
        const msg = `A student requested "${course.title}"`;
        const notification = await logActivity({
            user: tutorId.toString(),
            type: "SESSION",
            action: "REQUESTED",
            entityId: session._id.toString(),
            message: msg,
            metadata: { courseId, date },
        });
        /* 🔥 REAL-TIME */
        emitNotification(tutorId.toString(), notification);
        return res.status(201).json(session);
    }
    catch (err) {
        console.error("CREATE SESSION ERROR:", err);
        return res.status(500).json({ message: "Error creating session" });
    }
};
/* ================= GET MY SESSIONS ================= */
export const getMySessions = async (req, res) => {
    try {
        const { userId } = req;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const sessions = await Session.find({
            $or: [{ student: userObjectId }, { tutor: userObjectId }],
        })
            .populate("student", "username email")
            .populate("tutor", "username email")
            .sort({ date: -1 });
        return res.json(sessions);
    }
    catch (err) {
        console.error("GET SESSIONS ERROR:", err);
        return res.status(500).json({ message: "Error fetching sessions" });
    }
};
/* ================= UPDATE SESSION ================= */
export const updateSessionStatus = async (req, res) => {
    try {
        const { userId } = req;
        const id = getId(req.params.id);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid session ID" });
        }
        const status = req.body.status;
        const allowed = ["accepted", "completed", "cancelled"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ message: "Not found" });
        }
        if (session.tutor.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }
        session.status = status;
        await session.save();
        const msgMap = {
            accepted: "Session accepted ✅",
            cancelled: "Session rejected ❌",
            completed: "Session completed 🎉",
        };
        const message = msgMap[status];
        const notification = await logActivity({
            user: session.student.toString(),
            type: "SESSION",
            action: status.toUpperCase(),
            entityId: session._id.toString(),
            message,
        });
        /* 🔥 REAL-TIME */
        emitNotification(session.student.toString(), notification);
        return res.json(session);
    }
    catch (err) {
        console.error("UPDATE SESSION ERROR:", err);
        return res.status(500).json({ message: "Error updating session" });
    }
};
//# sourceMappingURL=session.controller.js.map