import { createHmac, randomBytes } from "crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "octavia_crm_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set in environment variables");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSessionToken(email: string) {
  const payload = `${email}:${Date.now()}`;
  const signature = sign(payload);
  return `${payload}:${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const parts = token.split(":");
  if (parts.length < 3) {
    return false;
  }

  const signature = parts.pop();
  const payload = parts.join(":");
  if (signature !== sign(payload)) {
    return false;
  }

  const [email] = payload.split(":");
  return email === process.env.ADMIN_EMAIL;
}

export function getSessionTokenFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value;
}

export function validateAdminCredentials(email: string, password: string) {
  return email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD;
}

export function buildSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  };
}

export function createRandomState() {
  return randomBytes(16).toString("hex");
}
