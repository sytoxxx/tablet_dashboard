import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  readSessionCookie,
  verifySessionToken,
} from "@/lib/auth/session";

export async function isRequestAuthenticated(
  request: Request,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const token = readSessionCookie(request.headers.get("cookie"));
  return verifySessionToken(token, nowMs);
}

/** Returns a 401 JSON response when the session is missing/invalid. */
export async function unauthorizedIfAnonymous(
  request: Request,
): Promise<NextResponse | null> {
  if (await isRequestAuthenticated(request)) return null;
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401 },
  );
}

export function clearSessionCookieHeader(
  isProduction: boolean = process.env.NODE_ENV === "production",
): string {
  const secure = isProduction ? "; Secure" : "";
  return `${ACCESS_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
