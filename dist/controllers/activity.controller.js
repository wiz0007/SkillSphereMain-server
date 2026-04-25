import mongoose from "mongoose";
import Activity from "../models/Activity.js";
/* ================= HELPERS ================= */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getId = (param) => {
    if (typeof param === "string")
        return param;
    if (Array.isArray(param) && typeof param[0] === "string")
        return param[0];
    return "";
};
/* ================= GET ALL ================= */
export const getNotifications = async (req, res) => {
    try {
        const { userId } = req;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const notifications = await Activity.find({
            user: userId
        }).sort({ createdAt: -1 });
        return res.json(notifications);
    }
    catch (err) {
        console.error("GET NOTIFICATIONS ERROR:", err);
        return res.status(500).json({
            message: "Error fetching notifications",
        });
    }
};
/* ================= UNREAD COUNT ================= */
export const getUnreadCount = async (req, res) => {
    try {
        const { userId } = req;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const count = await Activity.countDocuments({
            user: userId,
            isRead: false,
        });
        return res.json({ count });
    }
    catch (err) {
        console.error("UNREAD COUNT ERROR:", err);
        return res.status(500).json({
            message: "Error fetching count",
        });
    }
};
/* ================= MARK AS READ ================= */
export const markAsRead = async (req, res) => {
    try {
        const { userId } = req;
        const id = getId(req.params.id);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid ID" });
        }
        const notification = await Activity.findById(id);
        if (!notification) {
            return res.status(404).json({ message: "Not found" });
        }
        /* 🔒 OWNERSHIP CHECK (IMPORTANT) */
        if (notification.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }
        notification.isRead = true;
        await notification.save();
        return res.json({ success: true });
    }
    catch (err) {
        console.error("MARK READ ERROR:", err);
        return res.status(500).json({
            message: "Error updating",
        });
    }
};
//# sourceMappingURL=activity.controller.js.map