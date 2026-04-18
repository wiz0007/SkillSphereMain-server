import Activity from "../models/Activity.js";
import mongoose from "mongoose";

interface LogActivityParams {
  user: string;
  type: string;
  action: string;
  entityId?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export const logActivity = async ({
  user,
  type,
  action,
  entityId,
  message,
  metadata = {},
}: LogActivityParams) => {
  try {
    if (!user) return null;

    const activityData: any = {
      user: new mongoose.Types.ObjectId(user),
      type,
      action,
      message: message || "New activity",
      metadata,
      isRead: false,
    };

    if (entityId) {
      activityData.entityId = new mongoose.Types.ObjectId(entityId);
    }

    /* 🔥 RETURN THIS */
    const activity = await Activity.create(activityData);

    return activity;

  } catch (err) {
    console.error("ACTIVITY LOG ERROR:", err);
    return null;
  }
};