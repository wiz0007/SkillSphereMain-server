import express from "express";
import {
  createProfile,
  getMyProfile,
  uploadPhoto,
  becomeTutor,
  updateProfile
} from "../controllers/profile.controller.js";

import { protect } from "../middlewares/protect.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/", protect, createProfile);

router.get("/me", protect, getMyProfile);

router.post(
  "/upload-photo",
  upload.single("profilePhoto"),
  uploadPhoto
);

router.post("/become-tutor", protect, becomeTutor);

router.put("/", protect, updateProfile);


export default router;