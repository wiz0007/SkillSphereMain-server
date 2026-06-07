import type { RequestHandler } from "express";

const usedNonces = new Map<string, number>();

const REPLAY_WINDOW_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();

  for (const [nonce, timestamp] of usedNonces.entries()) {
    if (now - timestamp > REPLAY_WINDOW_MS) {
      usedNonces.delete(nonce);
    }
  }
}, 60 * 1000);

export const replayProtection: RequestHandler = (
  req,
  res,
  next
) => {
  try {
    const timestamp = Number(req.header("X-Timestamp"));
    const nonce = req.header("X-Nonce");

    if (!timestamp || !nonce) {
      return res.status(400).json({
        message: "Missing replay protection headers",
      });
    }

    const now = Date.now();

    if (Math.abs(now - timestamp) > REPLAY_WINDOW_MS) {
      return res.status(403).json({
        message: "Request expired",
      });
    }

    if (usedNonces.has(nonce)) {
      return res.status(403).json({
        message: "Replay attack detected",
      });
    }

    usedNonces.set(nonce, now);

    next();
  } catch {
    return res.status(500).json({
      message: "Failed to validate request",
    });
  }
};