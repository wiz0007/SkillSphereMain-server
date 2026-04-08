import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import express from "express";
import http from "http";

import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profile.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import courseRoutes from "./routes/course.routes.js";

import { configureCloudinary } from "./config/cloudinary.js";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

connectDB();
configureCloudinary();

const app = express();

app.use(cors());
app.use(express.json());

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/courses", courseRoutes);

/* ✅ CREATE HTTP SERVER */
const server = http.createServer(app);

/* ✅ INIT SOCKET */
initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});