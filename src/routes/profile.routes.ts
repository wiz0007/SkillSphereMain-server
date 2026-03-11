import express from "express";
import {
  createProfile,
  getMyProfile
} from "../controllers/profile.controller.js";

import { protect } from "../middlewares/protect.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/", protect, createProfile);

router.get("/me", protect, getMyProfile);

router.post(
  "/upload-photo",
  upload.single("profilePhoto"),
  (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    res.json({
      imageUrl: req.file.path
    });

  }
);

export default router;