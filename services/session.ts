/** Signed session cookie (JWT/HS256 via jose). Holds the authenticated phone. */
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { authSecret } from "@/lib/env";

const COOKIE = "naqla_session";
// Read lazily: the secret is validated by lib/env (production refuses a missing/weak one).
const key = () => new TextEncoder().encode(authSecret());

export interface Session {
  phone: string;
  name?: string;
}

export async function createSessionToken(s: Session): Promise<string> {
  return await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());
}

/** Sets the website cookie and returns the token (the mobile app keeps it as a Bearer token). */
export async function setSession(s: Session): Promise<string> {
  const token = await createSessionToken(s);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

/** Website = cookie; mobile app = `Authorization: Bearer <token>` (same signed token). */
export async function getSession(): Promise<Session | null> {
  const bearer = (await headers()).get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { phone: payload.phone as string, name: payload.name as string | undefined };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
