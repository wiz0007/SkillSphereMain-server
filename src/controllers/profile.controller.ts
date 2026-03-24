import type { Response } from "express";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { type AuthRequest } from "../middlewares/protect.js";
import cloudinary from "../config/cloudinary.js";
import upload from "../middlewares/upload.js";



/* ================= CREATE PROFILE ================= */

export const createProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId;

    // ✅ create profile
    const profile = await Profile.create({
      user: userId,
      ...req.body
    });

    // ✅ update user
    await User.findByIdAndUpdate(userId, {
      profileCompleted: true
    });

    // ✅ get updated user
    const updatedUser = await User.findById(userId).lean();

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // 🔥 FINAL RESPONSE (merged object)
    return res.status(201).json({
      ...updatedUser,
      profilePhoto: profile.profilePhoto || ""
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
    if (!req.userId) {
      return res.status(400).json({
        message: "User ID is required"
      });
    }

    const profile = await Profile.findOne({
      user: req.userId
    });

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found"
      });
    }

    const user = await User.findById(req.userId).lean();

    // ✅ return merged data here also (important for consistency)
    return res.json({
      ...user,
      profilePhoto: profile.profilePhoto || ""
    });

  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch profile"
    });
  }
};


export const uploadPhoto = async (req:AuthRequest, res:Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await cloudinary.uploader.upload(req.file.path);

    res.json({
      imageUrl: result.secure_url, // ✅ ALWAYS correct
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed" });
  }
};