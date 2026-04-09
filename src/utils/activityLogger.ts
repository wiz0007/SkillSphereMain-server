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
    if (!user) return;

    let finalMessage = message || "New activity";

    const activityData: any = {
      user: new mongoose.Types.ObjectId(user),
      type,
      action,
      message: finalMessage,
      metadata,
      isRead: false,
    };

    if (entityId) {
      activityData.entityId = new mongoose.Types.ObjectId(entityId);
    }

    await Activity.create(activityData);
  } catch (err) {
    console.error("ACTIVITY LOG ERROR:", err);
  }
};