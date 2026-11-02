/**
 * Password hashing with Argon2id. Stored format is the standard PHC string
 * ($argon2id$v=19$m=…,t=…,p=…$<salt>$<hash>), so the parameters travel with the hash and can be
 * raised later without breaking existing passwords.
 */
import "server-only";
import { argon2id, hash, verify, type HashOptions } from "argon2";
import { randomBytes } from "node:crypto";

const OPTIONS: HashOptions = { type: argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 4 }; // 64 MiB

function normalize(password: string): string {
  return password.normalize("NFKC");
}

export async function hashPassword(password: string): Promise<string> {
  return hash(normalize(password), OPTIONS);
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored?.startsWith("$argon2")) return false;
  try {
    return await verify(stored, normalize(password));
  } catch {
    return false; // malformed hash
  }
}

/** A real hash of a random password: compared against when the phone is unknown, so a wrong
 *  number and a wrong password take the same time (no account discovery by timing). */
let dummy: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  return (dummy ??= hashPassword(randomBytes(12).toString("base64")));
}
