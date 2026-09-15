import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

/** POST /api/auth/logout — clear session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  const opts = sessionCookieOptions();
  res.cookies.set(ACCESS_COOKIE_NAME, "", { ...opts, maxAge: 0 });
  return res;
}
