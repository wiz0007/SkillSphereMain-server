import type { RequestHandler } from "express";
import mongoose from "mongoose";
import Profile, { type IProfile } from "../models/Profile.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

/* ================= CREATE PROFILE ================= */

export const createProfile: RequestHandler = async (req, res) => {
  try {
    const userId = (req).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    const existing = await Profile.findOne({ user: objectId });
    if (existing) {
      return res.status(400).json({ message: "Profile already exists" });
    }

    const profile = await Profile.create({
      user: objectId,
      ...req.body, // ⚠️ keep as-is (your original logic)
      isTutor: false,
    });

    const user = await User.findByIdAndUpdate(
      objectId,
      { profileCompleted: true },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(201).json({
      ...user,
      ...profile.toObject(),
    });

  } catch (error) {
    console.error("CREATE PROFILE ERROR:", error);
    return res.status(500).json({ message: "Profile creation failed" });
  }
};

/* ================= GET PROFILE ================= */

export const getMyProfile: RequestHandler = async (req, res) => {
  try {
    const userId = (req).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    const profile = await Profile.findOne({ user: objectId }).lean();
    const user = await User.findById(objectId).lean();

    if (!profile || !user) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json({
      ...user,
      ...profile,
    });

  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/* ================= UTILITIES ================= */

// Clean arrays: trim + remove empty
const cleanArray = (arr: string[] = []) =>
  arr.map((s) => s.trim()).filter(Boolean);

/* =========================================================
   ================= BECOME TUTOR ===========================
   ========================================================= */

export const becomeTutor: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    const {
      headline,
      bio,
      skills,
      categories,
      experience,
      experienceDetails,
      education,
      portfolioLinks,
      languages,
      availability,
      teachingMode,
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!headline || !bio) {
      return res.status(400).json({
        message: "Headline and bio are required",
      });
    }

    if (!Array.isArray(skills) || skills.length < 2) {
      return res.status(400).json({
        message: "At least 2 skills are required",
      });
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        message: "At least 1 category is required",
      });
    }

    if (typeof availability !== "boolean") {
      return res.status(400).json({
        message: "Availability must be true or false",
      });
    }

    /* ================= UPDATE ================= */

    const profile = await Profile.findOneAndUpdate(
      { user: objectId },
      {
        isTutor: true,
        tutorProfile: {
          headline,
          bio,

          skills: cleanArray(skills),
          categories: cleanArray(categories),

          experience: Number(experience) || 0,
          experienceDetails: experienceDetails || "",

          education: education || "",
          portfolioLinks: cleanArray(portfolioLinks),

          languages: cleanArray(languages),

          availability,
          teachingMode: teachingMode || "Online",
        },
      },
      { new: true }
    ).lean();

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const user = await User.findById(objectId).lean();

    return res.json({
      ...user,
      ...profile,
    });

  } catch (error) {
    console.error("BECOME TUTOR ERROR:", error);
    return res.status(500).json({
      message: "Failed to become tutor",
    });
  }
};

/* =========================================================
   ================= UPDATE PROFILE =========================
   ========================================================= */

export const updateProfile: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    const profile = await Profile.findOne({ user: objectId });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    /* ================= BASIC PROFILE ================= */

    const allowedFields: (keyof IProfile)[] = [
      "fullName",
      "bio",
      "country",
      "state",
      "city",
      "timezone",
      "phone",
      "preferredLanguage",
      "profilePhoto",
      "dob",
      "gender",
    ];

    const updates = req.body as Partial<IProfile>;

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        (profile as any)[field] = updates[field];
      }
    });

    /* ================= TUTOR PROFILE ================= */

    if (req.body.tutorProfile) {
      const tp = req.body.tutorProfile;

      if (!profile.tutorProfile) {
        profile.tutorProfile = {} as any;
      }

      const allowedTutorFields = [
        "headline",
        "bio",
        "skills",
        "categories",
        "experience",
        "experienceDetails",
        "education",
        "portfolioLinks",
        "languages",
        "availability",
        "teachingMode",
      ];

      allowedTutorFields.forEach((field) => {
        if (tp[field] !== undefined) {
          if (
            ["skills", "categories", "languages", "portfolioLinks"].includes(
              field
            )
          ) {
            (profile.tutorProfile as any)[field] = cleanArray(tp[field]);
          } else if (field === "experience") {
            (profile.tutorProfile as any)[field] =
              Number(tp[field]) || 0;
          } else if (field === "availability") {
            (profile.tutorProfile as any)[field] =
              Boolean(tp[field]);
          } else {
            (profile.tutorProfile as any)[field] = tp[field];
          }
        }
      });
    }

    await profile.save();

    const user = await User.findById(objectId).lean();

    return res.json({
      ...user,
      ...profile.toObject(),
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

/* =========================================================
   ================= UPLOAD PHOTO ===========================
   ========================================================= */

export const uploadPhoto: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await cloudinary.uploader.upload(req.file.path);

    return res.json({
      imageUrl: result.secure_url,
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({
      message: "Upload failed",
    });
  }
};