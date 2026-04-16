import express from "express";
import {
  createProfile,
  getMyProfile,
  uploadPhoto,
  becomeTutor,
  updateProfile,
} from "../controllers/profile.controller.js";

import { protect } from "../middlewares/protect.js";
import { upload } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";

import {createProfileSchema, tutorSchema, updateProfileSchema} from "../validators/profile.validator.js";

const router = express.Router();

/* ================= CREATE PROFILE ================= */
router.post(
  "/",
  protect,
  validate(createProfileSchema), // ✅ validation added
  createProfile
);

/* ================= GET PROFILE ================= */
router.get("/me", protect, getMyProfile);

/* ================= UPLOAD PHOTO ================= */
router.post(
  "/upload-photo",
  protect, // ✅ FIXED (IMPORTANT)
  upload.single("profilePhoto"),
  uploadPhoto
);

/* ================= BECOME TUTOR ================= */
router.post(
  "/become-tutor",
  protect,
  validate(tutorSchema), // ✅ validation added
  becomeTutor
);

/* ================= UPDATE PROFILE ================= */
router.put(
  "/",
  protect,
  validate(updateProfileSchema), // ✅ validation added
  updateProfile
);

router.get("/:userId", getPublicProfile);

export default router;