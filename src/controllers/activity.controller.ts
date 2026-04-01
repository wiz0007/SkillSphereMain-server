import type { Response } from "express";
import Activity from "../models/Activity.js";

export const getMyActivity = async (req: any, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: No user" });
    }

    const activities = await Activity.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(activities);
  } catch (error) {
    console.error("ACTIVITY ERROR:", error);
    res.status(500).json({ message: "Error fetching activity" });
  }
};