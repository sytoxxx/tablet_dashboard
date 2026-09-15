import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { GET as busDeparturesGet } from "@/app/api/bus/departures/route";
import { GET as busStatusGet } from "@/app/api/bus/status/route";
import {
  ACCESS_CODE_ENV,
  ACCESS_COOKIE_NAME,
  SESSION_SECRET_ENV,
} from "@/lib/auth/constants";
import {
  accessCodeMatches,
  createSessionToken,
  readSessionCookie,
  verifySessionToken,
} from "@/lib/auth/session";

const TEST_CODE = "test-access-code-not-for-production";
const TEST_SECRET = "test-session-secret-not-for-production";

const ENV_KEYS = [ACCESS_CODE_ENV, SESSION_SECRET_ENV] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
  }
  process.env[ACCESS_CODE_ENV] = TEST_CODE;
  process.env[SESSION_SECRET_ENV] = TEST_SECRET;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("access session crypto", () => {
  it("rejects missing or wrong access code", async () => {
    expect(await accessCodeMatches("")).toBe(false);
    expect(await accessCodeMatches("wrong")).toBe(false);
    expect(await accessCodeMatches(TEST_CODE)).toBe(true);
  });

  it("creates a verifiable session token", async () => {
    const token = await createSessionToken();
    expect(token).toBeTruthy();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it("rejects tampered or expired tokens", async () => {
    const token = await createSessionToken();
    expect(token).toBeTruthy();
    expect(await verifySessionToken(token + "x")).toBe(false);
    expect(await verifySessionToken("v1.1.deadbeef")).toBe(false);

    const shortLived = await createSessionToken(Date.now() - 5_000, 1);
    expect(await verifySessionToken(shortLived)).toBe(false);
  });

  it("keeps a fresh session valid across a simulated reload time", async () => {
    const now = Date.now();
    const token = await createSessionToken(now);
    expect(await verifySessionToken(token, now + 60_000)).toBe(true);
  });
});

describe("POST /api/auth/login", () => {
  it("rejects empty body / wrong code without setting cookie", async () => {
    const bad = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "nope" }),
      }),
    );
    expect(bad.status).toBe(401);
    expect(bad.headers.get("set-cookie") || "").not.toContain(
      `${ACCESS_COOKIE_NAME}=v1.`,
    );

    const empty = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(empty.status).toBe(401);
  });

  it("sets HttpOnly session cookie on correct code", async () => {
    const res = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: TEST_CODE }),
      }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(`${ACCESS_COOKIE_NAME}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    // must not echo secrets
    const text = JSON.stringify(json);
    expect(text).not.toContain(TEST_CODE);
    expect(text).not.toContain(TEST_SECRET);
  });

  it("returns 503 when access code env is missing", async () => {
    delete process.env[ACCESS_CODE_ENV];
    const res = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "anything" }),
      }),
    );
    expect(res.status).toBe(503);
  });
});

describe("private bus API auth", () => {
  it("returns 401 without session", async () => {
    const res = await busDeparturesGet(
      new Request("http://localhost/api/bus/departures?personId=heidi"),
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error?: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 for /api/bus/status without session", async () => {
    const res = await busStatusGet(
      new Request("http://localhost/api/bus/status"),
    );
    expect(res.status).toBe(401);
  });

  it("allows /api/bus/status with valid session cookie", async () => {
    const token = await createSessionToken();
    expect(token).toBeTruthy();
    const res = await busStatusGet(
      new Request("http://localhost/api/bus/status", {
        headers: { cookie: `${ACCESS_COOKIE_NAME}=${token}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("parses session cookie from header", () => {
    const token = "v1.123.abc";
    expect(
      readSessionCookie(`foo=1; ${ACCESS_COOKIE_NAME}=${token}; bar=2`),
    ).toBe(token);
    expect(readSessionCookie(null)).toBeNull();
  });
});
