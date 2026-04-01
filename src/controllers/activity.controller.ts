import type { Response } from "express";
import Activity from "../models/Activity.js";

/* ================= GET MY ACTIVITY ================= */
export const getMyActivity = async (req: any, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const activities = await Activity.find({
      user: req.userId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(activities);
  } catch (error) {
    console.error("ACTIVITY ERROR:", error);
    res.status(500).json({ message: "Error fetching activity" });
  }
};