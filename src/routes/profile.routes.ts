import express from "express";
import {
  becomeTutor,
  createProfile,
  getMyProfile,
  getPublicProfile,
  updateProfile,
  uploadPhoto,
} from "../controllers/profile.controller.js";
import {
  getVerificationSummary,
  submitIdentityVerification,
  submitTutorVerification,
} from "../controllers/verification.controller.js";
import { protect } from "../middlewares/protect.js";
import { upload, verificationUpload } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";
import {
  createProfileSchema,
  tutorSchema,
  updateProfileSchema,
} from "../validators/profile.validator.js";

const router = express.Router();

router.post("/", protect, validate(createProfileSchema), createProfile);
router.get("/me", protect, getMyProfile);
router.post(
  "/upload-photo",
  protect,
  upload.single("profilePhoto"),
  uploadPhoto
);
router.post("/become-tutor", protect, validate(tutorSchema), becomeTutor);
router.put("/", protect, validate(updateProfileSchema), updateProfile);

router.get("/verification", protect, getVerificationSummary);
router.post(
  "/verification/identity",
  protect,
  verificationUpload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  submitIdentityVerification
);
router.post(
  "/verification/tutor",
  protect,
  verificationUpload.fields([{ name: "supportingDocument", maxCount: 1 }]),
  submitTutorVerification
);

router.get("/public/:userId", getPublicProfile);

export default router;
