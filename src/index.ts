import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import express from "express";
import http from "http";
import helmet from "helmet";

import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { startAuditAnchorJob } from "./jobs/auditAnchor.job.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profile.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import courseRoutes from "./routes/course.routes.js";
import messageRoutes from "./routes/message.routes.js";

import { configureCloudinary } from "./config/cloudinary.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";

/* ================= ENV ================= */

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

/* ================= INIT ================= */

const app = express();

/* 🔥 REQUIRED FOR RENDER / PROXY */
app.set("trust proxy", 1);

/* ================= SECURITY ================= */

/* 🛡️ Helmet */
app.use(helmet());

/* 🌍 CORS */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://skill-sphere-main-client-oh1p.vercel.app",
      "https://skillsphere.space"
    ],
    credentials: true,
  })
);

/* 🚦 GLOBAL RATE LIMITER */
app.use(globalLimiter);

/* 📦 BODY LIMIT (DoS protection) */
app.use(express.json({ limit: "10kb" }));

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/notifications", activityRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/messages", messageRoutes);

/* ================= 404 HANDLER ================= */

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`,
  });
});

/* ================= ERROR HANDLER ================= */

app.use(errorHandler);

/* ================= SERVER START ================= */

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    configureCloudinary();

    const server = http.createServer(app);

    initSocket(server);
    startAuditAnchorJob();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
