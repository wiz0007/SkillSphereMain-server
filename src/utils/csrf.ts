import crypto from "crypto";
import type { Request, Response } from "express";
import { getSharedCookieOptions, parseCookieHeader } from "./authCookie.js";

export const CSRF_COOKIE_NAME = "skillsphere_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const getCsrfSecret = () =>
  process.env.CSRF_SECRET || process.env.JWT_SECRET || "skillsphere-dev-csrf";

const signToken = (nonce: string) =>
  crypto
    .createHmac("sha256", getCsrfSecret())
    .update(nonce)
    .digest("base64url");

const buildToken = (nonce: string) => `${nonce}.${signToken(nonce)}`;

export const createCsrfToken = () => {
  const nonce = crypto.randomBytes(32).toString("base64url");
  return buildToken(nonce);
};

export const isValidCsrfToken = (token: string) => {
  const [nonce, signature] = token.split(".");

  if (!nonce || !signature) {
    return false;
  }

  const expected = signToken(nonce);

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
};

export const setCsrfCookie = (res: Response, token = createCsrfToken()) => {
  res.cookie(CSRF_COOKIE_NAME, token, {
    ...getSharedCookieOptions(),
    httpOnly: false,
  });

  return token;
};

export const getCsrfCookieFromRequest = (req: Request) => {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[CSRF_COOKIE_NAME] || "";
};

export const getCsrfHeaderFromRequest = (req: Request) => {
  const header = req.headers[CSRF_HEADER_NAME];

  if (Array.isArray(header)) {
    return header[0] || "";
  }

  return typeof header === "string" ? header : "";
};
