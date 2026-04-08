import Activity from "../models/Activity.js";

export const getNotifications = async (req: any, res: any) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notifications = await Activity.find({
      user: req.userId,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

export const markAsRead = async (req: any, res: any) => {
  try {
    await Activity.findByIdAndUpdate(req.params.id, {
      isRead: true,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Error updating notification" });
  }
};