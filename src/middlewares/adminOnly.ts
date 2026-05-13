import type { RequestHandler } from "express";
import User from "../models/User.js";

const getAdminEmails = () =>
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

export const syncAdminAccess = async (userId: string) => {
  const user = await User.findById(userId).select("email isAdmin");

  if (!user) {
    return null;
  }

  const adminEmails = getAdminEmails();
  const shouldBeAdmin = adminEmails.includes(user.email.toLowerCase());

  if (shouldBeAdmin !== user.isAdmin) {
    user.isAdmin = shouldBeAdmin;
    await user.save();
  }

  return user;
};

export const adminOnly: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await syncAdminAccess(userId);

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify admin access" });
  }
};
