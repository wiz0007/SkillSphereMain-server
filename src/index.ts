import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env")
});
import cors from "cors";
import express from "express";

import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profile.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import activityRoutes from "./routes/activity.routes.js";



connectDB();

import { configureCloudinary } from "./config/cloudinary.js";
configureCloudinary();  

const app = express();

app.use(cors());
app.use(express.json());

console.log("ENV TEST:", process.env.CLOUD_NAME);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

app.use("/api/sessions", sessionRoutes);
app.use("/api/activity", activityRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});