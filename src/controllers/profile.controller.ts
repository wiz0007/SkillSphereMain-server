import type { Response } from "express";
import mongoose from "mongoose";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { type AuthRequest } from "../middlewares/protect.js";
import cloudinary from "../config/cloudinary.js";

/* ================= CREATE PROFILE ================= */

export const createProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ✅ AUTH CHECK (FIXES TS ERROR)
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    // ✅ CONVERT TO OBJECTID
    const userId = new mongoose.Types.ObjectId(req.userId);

    // ❌ prevent duplicate profile
    const existing = await Profile.findOne({ user: userId });
    if (existing) {
      return res.status(400).json({
        message: "Profile already exists"
      });
    }

    // ✅ create profile
    const profile = await Profile.create({
      user: userId,
      ...req.body,
      isTutor: false
    });

    // ✅ update user
    const user = await User.findByIdAndUpdate(
      userId,
      { profileCompleted: true },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.status(201).json({
      ...user,
      ...profile.toObject()
    });

  } catch (error) {
    console.error("CREATE PROFILE ERROR:", error);

    return res.status(500).json({
      message: "Profile creation failed"
    });
  }
};

/* ================= GET PROFILE ================= */

export const getMyProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ✅ AUTH CHECK
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);

    const profile = await Profile.findOne({ user: userId }).lean();
    const user = await User.findById(userId).lean();

    if (!profile || !user) {
      return res.status(404).json({
        message: "Profile not found"
      });
    }

    return res.json({
      ...user,
      ...profile
    });

  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch profile"
    });
  }
};

/* ================= BECOME TUTOR ================= */

export const becomeTutor = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ✅ AUTH CHECK
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);

    const { category, experience, hourlyRate } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      {
        isTutor: true,
        tutorProfile: {
          category,
          experience,
          hourlyRate
        }
      },
      { new: true }
    ).lean();

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found"
      });
    }

    const user = await User.findById(userId).lean();

    return res.json({
      ...user,
      ...profile
    });

  } catch (error) {
    console.error("BECOME TUTOR ERROR:", error);

    return res.status(500).json({
      message: "Failed to become tutor"
    });
  }
};

/* ================= UPLOAD PHOTO ================= */

export const uploadPhoto = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path);

    return res.json({
      imageUrl: result.secure_url
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return res.status(500).json({
      message: "Upload failed"
    });
  }
};