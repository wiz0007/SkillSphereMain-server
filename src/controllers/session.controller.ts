import type { RequestHandler } from "express";
import mongoose from "mongoose";
import Session from "../models/Session.js";
import Profile from "../models/Profile.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { logActivity } from "../utils/activityLogger.js";
import { emitNotification, emitWalletUpdate } from "../config/socket.js";
import {
  buildWalletSummary,
  lockSkillCoins,
  settleLockedSkillCoins,
  unlockSkillCoins,
} from "../utils/wallet.js";

/* ================= HELPERS ================= */

const isValidObjectId = (id: string) =>
  mongoose.Types.ObjectId.isValid(id);

const getId = (param: unknown): string => {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && typeof param[0] === "string") return param[0];
  return "";
};

const getSkillCoinAmount = (coursePrice: number, duration: number) =>
  Math.max(0, Math.round(((coursePrice || 0) / 60) * duration));

const releaseExpiredPendingSessionLocks = async () => {
  const expiredSessions = await Session.find({
    status: "pending",
    coinStatus: "locked",
    date: { $lt: new Date() },
  });

  for (const session of expiredSessions) {
    const student = await User.findById(session.student);

    if (!student) {
      continue;
    }

    await unlockSkillCoins(
      student,
      session.skillCoinAmount,
      `SkillCoin unlocked for expired request: ${session.title}`,
      {
        sessionId: session._id,
        courseId: session.course,
      }
    );

    session.coinStatus = "released";
    await session.save();

    emitWalletUpdate(student._id.toString(), buildWalletSummary(student));
  }
};

/* ================= CREATE SESSION ================= */

export const createSession: RequestHandler = async (req, res) => {
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
    const skillCoinAmount = getSkillCoinAmount(price, Number(duration));

    const student = await User.findById(userId);

    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      await lockSkillCoins(
        student,
        skillCoinAmount,
        `SkillCoin locked for session request: ${course.title}`,
        {
          courseId: course._id,
          extra: {
            duration,
            rupeesEquivalent: skillCoinAmount,
          },
        }
      );
    } catch (error: any) {
      return res.status(400).json({
        message:
          error.message ||
          "You do not have enough SkillCoin to request this session",
      });
    }

    const session = await Session.create({
      course: course._id,
      student: new mongoose.Types.ObjectId(userId),
      tutor: tutorId,
      title: course.title,
      description: message,
      date,
      duration,
      price,
      skillCoinAmount,
      coinStatus: "locked",
      status: "pending",
    });

    emitWalletUpdate(userId.toString(), buildWalletSummary(student));

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

  } catch (err) {
    console.error("CREATE SESSION ERROR:", err);
    return res.status(500).json({ message: "Error creating session" });
  }
};

/* ================= GET MY SESSIONS ================= */

export const getMySessions: RequestHandler = async (req, res) => {
  try {
    const { userId } = req;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    await releaseExpiredPendingSessionLocks();

    const sessions = await Session.find({
      hiddenFor: { $ne: userObjectId },
      $or: [{ student: userObjectId }, { tutor: userObjectId }],
    })
      .populate("course", "title")
      .populate("student", "username email")
      .populate("tutor", "username email")
      .sort({ date: -1 });

    return res.json(sessions);

  } catch (err) {
    console.error("GET SESSIONS ERROR:", err);
    return res.status(500).json({ message: "Error fetching sessions" });
  }
};

/* ================= UPDATE SESSION ================= */

export const updateSessionStatus: RequestHandler = async (req, res) => {
  try {
    const { userId } = req;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const status = req.body.status as
      | "accepted"
      | "completed"
      | "cancelled";

    const allowed = ["accepted", "completed", "cancelled"] as const;

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

    const student = await User.findById(session.student);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    session.status = status;

    if (status === "accepted") {
      session.acceptedAt = new Date();
    }

    if (status === "completed") {
      session.tutorMarkedCompletedAt = new Date();
    }

    if (
      status === "cancelled" &&
      session.coinStatus === "locked" &&
      session.skillCoinAmount > 0
    ) {
      await unlockSkillCoins(
        student,
        session.skillCoinAmount,
        `SkillCoin unlocked after session request was declined: ${session.title}`,
        {
          sessionId: session._id,
          courseId: session.course,
        }
      );

      session.coinStatus = "released";
      emitWalletUpdate(student._id.toString(), buildWalletSummary(student));
    }

    await session.save();

    const msgMap = {
      accepted: "Session accepted ✅",
      cancelled: "Session rejected ❌",
      completed: "Session marked complete. Student confirmation is pending ✅",
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

  } catch (err) {
    console.error("UPDATE SESSION ERROR:", err);
    return res.status(500).json({ message: "Error updating session" });
  }
};

export const confirmSessionCompletion: RequestHandler = async (req, res) => {
  try {
    const { userId } = req;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.student.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (session.status !== "completed") {
      return res.status(400).json({
        message: "The tutor needs to mark the session completed first",
      });
    }

    if (session.studentConfirmedCompletionAt || session.coinStatus === "settled") {
      return res.status(400).json({
        message: "This session has already been confirmed",
      });
    }

    const [student, tutor] = await Promise.all([
      User.findById(session.student),
      User.findById(session.tutor),
    ]);

    if (!student || !tutor) {
      return res.status(404).json({ message: "Wallet users not found" });
    }

    await settleLockedSkillCoins({
      student,
      tutor,
      amount: session.skillCoinAmount,
      sessionId: session._id,
      courseId: session.course,
      description: `SkillCoin settled for session: ${session.title}`,
    });

    session.studentConfirmedCompletionAt = new Date();
    session.coinStatus = "settled";
    await session.save();

    emitWalletUpdate(student._id.toString(), buildWalletSummary(student));
    emitWalletUpdate(tutor._id.toString(), buildWalletSummary(tutor));

    const notification = await logActivity({
      user: session.tutor.toString(),
      type: "SESSION",
      action: "CONFIRMED",
      entityId: session._id.toString(),
      message: "Student confirmed completion. SkillCoin released.",
    });

    emitNotification(session.tutor.toString(), notification);

    return res.json(session);
  } catch (err) {
    console.error("CONFIRM SESSION ERROR:", err);
    return res.status(500).json({
      message: "Error confirming session completion",
    });
  }
};

export const hideSession: RequestHandler = async (req, res) => {
  try {
    const { userId } = req;
    const id = getId(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const session = await Session.findOne({
      _id: id,
      $or: [{ student: userObjectId }, { tutor: userObjectId }],
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const alreadyHidden = session.hiddenFor.some(
      (entry) => entry.toString() === userId
    );

    if (!alreadyHidden) {
      session.hiddenFor.push(userObjectId);
      await session.save();
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("HIDE SESSION ERROR:", err);
    return res.status(500).json({ message: "Error hiding session" });
  }
};
