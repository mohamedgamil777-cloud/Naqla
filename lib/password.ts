/**
 * Password hashing with Node's built-in scrypt (memory-hard; no extra dependency).
 * Stored format: scrypt$N$r$p$<salt base64>$<hash base64> — parameters travel with the hash so
 * they can be raised later without breaking existing passwords.
 */
import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, keylen, opts, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (!n || !r || !p || !salt.length || !expected.length) return false;
  const key = await scrypt(password, salt, expected.length, { N: n, r, p, maxmem: 64 * 1024 * 1024 });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A real hash of a random password: compared against when the phone is unknown, so a wrong
 *  number and a wrong password take the same time (no account discovery by timing). */
let dummy: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  return (dummy ??= hashPassword(randomBytes(12).toString("base64")));
}
