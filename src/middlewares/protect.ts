import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getAuthTokenFromRequest } from "../utils/authCookie.js";

/* ================= PROTECT ================= */

export const protect: RequestHandler = (req, res, next) => {
  try {
    const token = getAuthTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const userId =
      decoded.id || decoded._id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    req.userId = userId as string;

    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};
