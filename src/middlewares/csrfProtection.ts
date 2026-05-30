import type { RequestHandler } from "express";
import {
  getCsrfCookieFromRequest,
  getCsrfHeaderFromRequest,
  isValidCsrfToken,
  setCsrfCookie,
} from "../utils/csrf.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const PUBLIC_MUTATION_PATHS = new Set([
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/verify-otp",
  "/api/auth/resend-otp",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
]);

export const issueCsrfToken: RequestHandler = (_req, res) => {
  const token = setCsrfCookie(res);
  return res.json({ csrfToken: token });
};

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method) || PUBLIC_MUTATION_PATHS.has(req.path)) {
    return next();
  }

  const cookieToken = getCsrfCookieFromRequest(req);
  const headerToken = getCsrfHeaderFromRequest(req);

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      message: "Security check failed. Refresh the page and try again.",
      code: "CSRF_TOKEN_MISSING",
    });
  }

  if (
    cookieToken !== headerToken ||
    !isValidCsrfToken(cookieToken) ||
    !isValidCsrfToken(headerToken)
  ) {
    return res.status(403).json({
      message: "Security check failed. Refresh the page and try again.",
      code: "CSRF_TOKEN_INVALID",
    });
  }

  return next();
};
