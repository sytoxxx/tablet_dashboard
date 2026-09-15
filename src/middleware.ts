import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  readSessionCookie,
  verifySessionToken,
} from "@/lib/auth/session";

const PUBLIC_PATHS = new Set([
  "/zugang",
  "/api/auth/login",
  "/api/auth/logout",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    // Authenticated users hitting login → home
    if (pathname === "/zugang") {
      const token = readSessionCookie(request.headers.get("cookie"));
      if (await verifySessionToken(token)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  const token = readSessionCookie(request.headers.get("cookie"));
  const ok = await verifySessionToken(token);

  if (ok) return NextResponse.next();

  if (isApiPath(pathname)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const login = new URL("/zugang", request.url);
  const next = pathname + request.nextUrl.search;
  if (next && next !== "/") login.searchParams.set("next", next);
  const res = NextResponse.redirect(login);
  // Drop broken cookie if present
  if (token) {
    res.cookies.set(ACCESS_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets Next serves outside middleware need.
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
