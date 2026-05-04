import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export const optionalAuth: RequestHandler = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const userId =
      decoded.id || decoded._id || decoded.userId;

    if (userId) {
      req.userId = String(userId);
    }
  } catch {
    // Ignore invalid public-route tokens and continue as guest.
  }

  next();
};
