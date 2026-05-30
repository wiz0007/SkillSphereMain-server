import type { Request, Response } from "express";

export const AUTH_COOKIE_NAME = "skillsphere_session";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isProductionRuntime = () =>
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.RENDER || process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT) ||
  [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.APP_URL,
    process.env.BACKEND_URL,
    process.env.API_URL,
    process.env.SERVER_URL,
  ].some((url) => url?.startsWith("https://"));

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProductionRuntime(),
  sameSite: isProductionRuntime() ? "none" : "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_MS,
}) as const;

export const getSharedCookieOptions = () => ({
  secure: isProductionRuntime(),
  sameSite: isProductionRuntime() ? "none" : "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_MS,
}) as const;

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
};

export const clearAuthCookie = (res: Response) => {
  const options = getCookieOptions();

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
};

export const parseCookieHeader = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, pair) => {
    const separatorIndex = pair.indexOf("=");

    if (separatorIndex === -1) {
      return cookies;
    }

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();

    if (key) {
      cookies[key] = decodeURIComponent(value);
    }

    return cookies;
  }, {});
};

export const getAuthTokenFromRequest = (req: Request) => {
  const cookies = parseCookieHeader(req.headers.cookie);
  const cookieToken = cookies[AUTH_COOKIE_NAME];

  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1] || null;
  }

  return null;
};
