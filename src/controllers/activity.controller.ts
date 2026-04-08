import Activity from "../models/Activity.js";

export const getNotifications = async (req: any, res: any) => {
  try {
    const notifications = await Activity.find({
      user: req.userId,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch {
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

export const getUnreadCount = async (req: any, res: any) => {
  try {
    const count = await Activity.countDocuments({
      user: req.userId,
      isRead: false,
    });

    res.json({ count });
  } catch {
    res.status(500).json({ message: "Error fetching count" });
  }
};

export const markAsRead = async (req: any, res: any) => {
  try {
    await Activity.findByIdAndUpdate(req.params.id, {
      isRead: true,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Error updating" });
  }
};