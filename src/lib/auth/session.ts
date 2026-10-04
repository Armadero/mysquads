/**
 * JWT-based session management using jose (Edge-compatible)
 * Sessions are stored as httpOnly cookies.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mysquads-session";
const EXPIRY = "7d";
const ALG = "HS256";

export interface SessionPayload {
  sub: string;       // user id
  email: string;
  name: string | null;
  type: "COORDINATOR" | "MANAGER";
  iat?: number;
  exp?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET environment variable is required in production. " +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
      );
    }
    // Development / tests: warn loudly but let the app boot.
    console.warn(
      "[auth] AUTH_SECRET is not set. Using an insecure development fallback — " +
        "DO NOT deploy without configuring AUTH_SECRET."
    );
    return new TextEncoder().encode(
      "mysquads-dev-only-insecure-fallback-secret-32chars-min"
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be at least 32 characters long for HS256 JWT signing."
    );
  }

  return new TextEncoder().encode(secret);
}

// ─── Sign / verify ────────────────────────────────────────────────────────────

export async function signSession(payload: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

/** Read the session from the current request cookies (server component / route handler) */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Read the session from a NextRequest (middleware) */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Attach a session cookie to a NextResponse */
export async function setSessionCookie(
  res: NextResponse,
  payload: Omit<SessionPayload, "iat" | "exp">
): Promise<NextResponse> {
  const token = await signSession(payload);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: "/",
  });
  return res;
}

/** Clear the session cookie */
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}

/** Require a valid session or return a 401 response */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
