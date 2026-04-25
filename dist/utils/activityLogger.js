import Activity from "../models/Activity.js";
import mongoose from "mongoose";
export const logActivity = async ({ user, type, action, entityId, message, metadata = {}, }) => {
    try {
        if (!user)
            return null;
        const activityData = {
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
    }
    catch (err) {
        console.error("ACTIVITY LOG ERROR:", err);
        return null;
    }
};
//# sourceMappingURL=activityLogger.js.map