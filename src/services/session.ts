/** Signed session cookie (JWT/HS256 via jose). Holds the authenticated phone. */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "naqla_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me-please-32b"
);

export interface Session {
  phone: string;
  name?: string;
}

export async function createSessionToken(s: Session): Promise<string> {
  return await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function setSession(s: Session): Promise<void> {
  const token = await createSessionToken(s);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { phone: payload.phone as string, name: payload.name as string | undefined };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
