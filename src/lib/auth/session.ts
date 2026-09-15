/**
 * Edge-safe access session (HMAC). No secrets inlined — reads env at runtime.
 */
import {
  ACCESS_CODE_ENV,
  ACCESS_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_SECRET_ENV,
} from "@/lib/auth/constants";

const enc = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(s: string): Uint8Array | null {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function sha256(data: string): Promise<Uint8Array> {
  const dig = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return new Uint8Array(dig);
}

/** Constant-time string compare via SHA-256 digests (equal length). */
export async function secureStringEqual(
  a: string,
  b: string,
): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  return timingSafeEqualBytes(ha, hb);
}

export function getConfiguredAccessCode(): string | null {
  const v = process.env[ACCESS_CODE_ENV]?.trim();
  return v ? v : null;
}

async function getSigningKeyMaterial(): Promise<Uint8Array | null> {
  const explicit = process.env[SESSION_SECRET_ENV]?.trim();
  if (explicit) return sha256(`cm-session-v1:${explicit}`);
  const code = getConfiguredAccessCode();
  if (!code) return null;
  return sha256(`cm-session-from-code-v1:${code}`);
}

async function importHmacKey(raw: Uint8Array): Promise<CryptoKey> {
  const copy = new Uint8Array(raw.byteLength);
  copy.set(raw);
  return crypto.subtle.importKey(
    "raw",
    copy,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: string): Promise<string | null> {
  const material = await getSigningKeyMaterial();
  if (!material) return null;
  const key = await importHmacKey(material);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(sig);
}

export async function createSessionToken(
  nowMs: number = Date.now(),
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): Promise<string | null> {
  const exp = Math.floor(nowMs / 1000) + maxAgeSeconds;
  const payload = `v1.${exp}`;
  const sig = await signPayload(payload);
  if (!sig) return null;
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string | null | undefined,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ver, expStr, sig] = parts;
  if (ver !== "v1" || !expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 <= nowMs) return false;

  const payload = `v1.${expStr}`;
  const expected = await signPayload(payload);
  if (!expected) return false;

  const a = fromBase64Url(sig);
  const b = fromBase64Url(expected);
  if (!a || !b) return false;
  return timingSafeEqualBytes(a, b);
}

export async function accessCodeMatches(input: string): Promise<boolean> {
  const configured = getConfiguredAccessCode();
  if (!configured) return false;
  return secureStringEqual(input, configured);
}

export type SessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export function sessionCookieOptions(
  isProduction: boolean = process.env.NODE_ENV === "production",
): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function readSessionCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === ACCESS_COOKIE_NAME) {
      return decodeURIComponent(rest.join("=") || "");
    }
  }
  return null;
}

export { ACCESS_COOKIE_NAME };
