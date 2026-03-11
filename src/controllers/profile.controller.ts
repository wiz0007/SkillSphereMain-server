import type{ Response } from "express";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { type AuthRequest } from "../middlewares/protect.js";

/* ================= CREATE PROFILE ================= */

export const createProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId;

    const profile = await Profile.create({
      user: userId,
      ...req.body
    });

    await User.findByIdAndUpdate(userId, {
      profileCompleted: true
    });

    res.status(201).json(profile);

  } catch {
    res.status(500).json({
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

    res.json(profile);

  } catch {
    res.status(500).json({
      message: "Failed to fetch profile"
    });
  }
};

