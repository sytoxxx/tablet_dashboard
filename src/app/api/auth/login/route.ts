import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  accessCodeMatches,
  createSessionToken,
  getConfiguredAccessCode,
  sessionCookieOptions,
} from "@/lib/auth/session";

export const runtime = "nodejs";

type Body = { code?: unknown };

/**
 * POST /api/auth/login — verify access code server-side, set HttpOnly session.
 * Never echoes the code or configured secret.
 */
export async function POST(request: Request) {
  try {
    if (!getConfiguredAccessCode()) {
      return NextResponse.json(
        { ok: false, error: "auth_not_configured" },
        { status: 503 },
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid_body" },
        { status: 400 },
      );
    }

    const code = typeof body.code === "string" ? body.code : "";
    if (!code) {
      return NextResponse.json(
        { ok: false, error: "invalid_code" },
        { status: 401 },
      );
    }

    const matches = await accessCodeMatches(code);
    if (!matches) {
      return NextResponse.json(
        { ok: false, error: "invalid_code" },
        { status: 401 },
      );
    }

    const token = await createSessionToken();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "auth_not_configured" },
        { status: 503 },
      );
    }

    const res = NextResponse.json({ ok: true });
    const opts = sessionCookieOptions();
    res.cookies.set(ACCESS_COOKIE_NAME, token, opts);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
