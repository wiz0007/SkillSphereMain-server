import express from "express";
import {
  createProfile,
  getMyProfile,
  uploadPhoto
} from "../controllers/profile.controller.js";

import { protect } from "../middlewares/protect.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/", protect, createProfile);

router.get("/me", protect, getMyProfile);

router.post(
  "/upload-photo",
  uploadPhoto
);

export default router;