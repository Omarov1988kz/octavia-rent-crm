import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "octavia_crm_session";

async function sign(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set in environment variables");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifySessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const parts = token.split(":");
  if (parts.length < 3) {
    return false;
  }

  const signature = parts.pop();
  const payload = parts.join(":");
  if (!signature) {
    return false;
  }

  const expected = await sign(payload);
  if (signature !== expected) {
    return false;
  }

  const [email] = payload.split(":");
  return email === process.env.ADMIN_EMAIL;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAllowedLogin = pathname === "/admin/login" || pathname === "/api/admin/login";

  if (!(isAdminPage || isAdminApi)) {
    return NextResponse.next();
  }

  if (isAllowedLogin) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/admin/login";
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
