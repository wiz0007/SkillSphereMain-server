import express from "express";
import { getMyActivity } from "../controllers/activity.controller.js";
import { protect } from "../middlewares/protect.js";

const router = express.Router();

router.get("/", protect, getMyActivity);

export default router;