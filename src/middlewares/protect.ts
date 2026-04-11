import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

/* ================= PROTECT ================= */

export const protect: RequestHandler = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    /* 🔐 VERIFY TOKEN */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    /* ✅ NOW FULLY TYPED (NO CASTING NEEDED ANYWHERE) */
    req.userId = decoded.id as string;

    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};