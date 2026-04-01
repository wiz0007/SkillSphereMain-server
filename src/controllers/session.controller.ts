import type { Request, Response } from "express";
import Session from "../models/Session.js";
import Profile from "../models/Profile.js";
import { logActivity } from "../utils/activityLogger.js";

// CREATE SESSION (Student books tutor)
export const createSession = async (req: any, res: Response) => {
  try {
    const { tutorId, title, date, duration } = req.body;

    if (!tutorId || !title || !date || !duration) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const tutorProfile = await Profile.findOne({ user: tutorId });

    if (!tutorProfile || !tutorProfile.isTutor) {
      return res.status(400).json({ message: "User is not a tutor" });
    }

    const price =
      (tutorProfile.tutorProfile?.hourlyRate || 0) *
      (duration / 60);

    const session = await Session.create({
      student: req.user._id,
      tutor: tutorId,
      title,
      date,
      duration,
      price,
    });

    // 🔥 Structured Activity Logging
    await logActivity({
      user: req.user._id,
      type: "SESSION",
      action: "BOOKED",
      entityId: session._id,
      metadata: {
        title,
        tutorId,
        date,
      },
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: "Error creating session" });
  }
};

export const getMySessions = async (req: any, res: Response) => {
  try {
    const sessions = await Session.find({
      $or: [{ student: req.user._id }, { tutor: req.user._id }],
    })
      .populate("student", "name email")
      .populate("tutor", "name email")
      .sort({ date: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sessions" });
  }
};

export const updateSessionStatus = async (req: any, res: Response) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["accepted", "completed", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // 🔒 Only tutor can accept/reject
    if (session.tutor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    session.status = status;
    await session.save();

    // 🔥 Activity for tutor
    await logActivity({
      user: req.user._id,
      type: "SESSION",
      action: status.toUpperCase(),
      entityId: session._id,
    });

    // 🔥 Activity for student (IMPORTANT UX)
    await logActivity({
      user: session.student,
      type: "SESSION",
      action: status.toUpperCase(),
      entityId: session._id,
    });

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: "Error updating session" });
  }
};