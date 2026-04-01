import type { Response } from "express";
import Activity from "../models/Activity.js";

export const getMyActivity = async (req: any, res: Response) => {
  try {
    const activities = await Activity.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(10); // 🔥 only recent

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: "Error fetching activity" });
  }
};