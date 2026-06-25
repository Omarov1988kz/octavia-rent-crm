import { NextResponse } from "next/server";
import { createSessionToken, validateAdminCredentials, buildSessionCookie } from "@/server/services/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password || !validateAdminCredentials(email, password)) {
    return NextResponse.json({ message: "Неверные данные входа" }, { status: 401 });
  }

  const token = createSessionToken(email);
  const response = NextResponse.json({ ok: true });
  const cookie = buildSessionCookie(token);
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    path: cookie.path,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  });

  return response;
}
