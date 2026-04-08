import type { Response } from "express";
import Session from "../models/Session.js";
import Profile from "../models/Profile.js";
import { logActivity } from "../utils/activityLogger.js";
import Course from "../models/Course.js";

/* ================= CREATE SESSION ================= */

/* ================= CREATE SESSION ================= */
export const createSession = async (req: any, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { courseId, date, duration, message } = req.body;

    if (!courseId || !date || !duration) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const tutorId = course.tutor;

    const tutorProfile = await Profile.findOne({ user: tutorId });

    if (!tutorProfile || !tutorProfile.isTutor) {
      return res.status(400).json({ message: "User is not a tutor" });
    }

    const sessionStart = new Date(date);
    const sessionEnd = new Date(
      sessionStart.getTime() + duration * 60000
    );

    /* 🔒 DOUBLE BOOKING CHECK */
    const conflict = await Session.findOne({
      tutor: tutorId,
      status: { $in: ["pending", "accepted"] },
      $expr: {
        $and: [
          { $lt: ["$date", sessionEnd] },
          {
            $gt: [
              {
                $add: ["$date", { $multiply: ["$duration", 60000] }],
              },
              sessionStart,
            ],
          },
        ],
      },
    });

    if (conflict) {
      return res.status(400).json({
        message: "Tutor is not available at this time",
      });
    }

    const price =
      (tutorProfile.tutorProfile?.hourlyRate || 0) *
      (duration / 60);

    const session = await Session.create({
      student: req.userId,
      tutor: tutorId,
      title: course.title,
      description: message,
      date,
      duration,
      price,
      status: "pending",
    });

    await logActivity({
      user: req.userId,
      type: "SESSION",
      action: "BOOKED",
      entityId: session._id,
      metadata: { courseId, tutorId, date },
    });

    res.status(201).json(session);
  } catch (error) {
    console.error("CREATE SESSION ERROR:", error);
    res.status(500).json({ message: "Error creating session" });
  }
};

/* ================= GET MY SESSIONS ================= */
export const getMySessions = async (req: any, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sessions = await Session.find({
      $or: [{ student: req.userId }, { tutor: req.userId }],
    })
      .populate("student", "name email")
      .populate("tutor", "name email")
      .sort({ date: -1 });

    res.json(sessions);
  } catch (error) {
    console.error("GET SESSIONS ERROR:", error);
    res.status(500).json({ message: "Error fetching sessions" });
  }
};

/* ================= UPDATE SESSION STATUS ================= */
export const updateSessionStatus = async (req: any, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { status } = req.body;

    const allowedStatuses = ["accepted", "completed", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // 🔒 Only tutor can update
    if (session.tutor.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    session.status = status;
    await session.save();

    // 🔥 Activity for tutor
    await logActivity({
      user: req.userId,
      type: "SESSION",
      action: status.toUpperCase(),
      entityId: session._id,
    });

    // 🔥 Activity for student
    await logActivity({
      user: session.student,
      type: "SESSION",
      action: status.toUpperCase(),
      entityId: session._id,
    });

    res.json(session);
  } catch (error) {
    console.error("UPDATE SESSION ERROR:", error);
    res.status(500).json({ message: "Error updating session" });
  }
};