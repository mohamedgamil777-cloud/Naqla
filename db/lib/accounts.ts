/** Login accounts: OTP, passwords, lockout, customer search and phone verification. */
import { and, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { otpCodes, users } from "@/db/schema";
import type { CustomerAccountDTO, LoginAccount, Page } from "@/types";

export async function saveOtp(phone: string, codeHash: string, expiresAt: Date) {
  await db.insert(otpCodes).values({ phone, codeHash, expiresAt });
}

export async function latestOtp(phone: string) {
  const o = await db.query.otpCodes.findFirst({
    where: (otpCodes) => eq(otpCodes.phone, phone),
    orderBy: (otpCodes) => desc(otpCodes.createdAt),
  });
  if (!o || o.consumedAt) return null;
  return {
    phone: o.phone,
    codeHash: o.codeHash,
    expiresAt: o.expiresAt,
    attempts: o.attempts,
    consumed: false,
    createdAt: o.createdAt,
  };
}

export async function bumpOtpAttempt(phone: string) {
  await db
    .update(otpCodes)
    .set({ attempts: sql`${otpCodes.attempts} + 1` })
    .where(eq(otpCodes.id, latestOtpId(phone)));
}

export async function consumeOtp(phone: string) {
  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(eq(otpCodes.id, latestOtpId(phone)));
}

/** Find-or-create by phone in one statement (the unique phone index decides under concurrency). */
export async function upsertUser(phone: string, name?: string) {
  const [row] = await db
    .insert(users)
    .values({ phone, name: name ?? null })
    .onConflictDoUpdate({
      target: users.phone,
      set: { name: name ? name : sql`${users.name}` },
    })
    .returning({ id: users.id, name: users.name });
  return { id: row.id, phone, name: row.name };
}

export async function getLoginAccount(phone: string): Promise<LoginAccount | null> {
  const u = await db.query.users.findFirst({ where: (users) => eq(users.phone, phone) });
  return u
    ? {
        id: u.id,
        phone: u.phone,
        username: u.username,
        name: u.name,
        role: u.role,
        passwordHash: u.passwordHash,
        failedLoginCount: u.failedLoginCount,
        lockedUntil: u.lockedUntil,
        phoneVerifiedAt: u.phoneVerifiedAt,
      }
    : null;
}

/** The account behind a login name (stored lower-case). */
export async function getLoginAccountByUsername(username: string): Promise<LoginAccount | null> {
  const u = await db.query.users.findFirst({ where: (users) => eq(users.username, username) });
  return u ? (await getLoginAccount(u.phone)) : null;
}

/** Sets (or clears) an account's login name. false when another account already uses it. */
export async function setUsername(userId: string, username: string | null): Promise<boolean> {
  if (username) {
    const taken = await db.query.users.findFirst({
      where: (users) => and(eq(users.username, username), sql`${users.id} <> ${userId}`),
      columns: { id: true },
    });
    if (taken) return false;
  }
  try {
    await db.update(users).set({ username, updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  } catch (e) {
    // lost a race for the same name (unique index)
    const err = e as { code?: string; cause?: { code?: string } };
    if (err.code === "23505" || err.cause?.code === "23505") return false;
    throw e;
  }
}

/** Login names for these phones (company users list). */
export async function usernamesFor(phones: string[]): Promise<Map<string, string>> {
  const list = [...new Set(phones.filter(Boolean))];
  if (!list.length) return new Map();
  const rows = await db.query.users.findMany({
    where: (users) => and(inArray(users.phone, list), isNotNull(users.username)),
    columns: { phone: true, username: true },
  });
  return new Map(rows.map((r) => [r.phone, r.username as string]));
}

/** Reset codes sent to this phone since `since` (rate limit). */
export async function countOtpsSince(phone: string, since: Date): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gte(otpCodes.createdAt, since)));
  return count;
}

export async function getAccountById(id: string): Promise<LoginAccount | null> {
  const u = await db.query.users.findFirst({ where: (users) => eq(users.id, id) });
  return u
    ? {
        id: u.id,
        phone: u.phone,
        username: u.username,
        name: u.name,
        role: u.role,
        passwordHash: u.passwordHash,
        failedLoginCount: u.failedLoginCount,
        lockedUntil: u.lockedUntil,
        phoneVerifiedAt: u.phoneVerifiedAt,
      }
    : null;
}

/** Set/replace a password (admin reset or seed). Clears failed attempts and any lock. */
export async function setPassword(userId: string, passwordHash: string): Promise<boolean> {
  const res = await db
    .update(users)
    .set({
      passwordHash,
      passwordSetAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return res.length > 0;
}

/** A customer with no password yet creates one. Atomic: only if still unset, so two people can't
 *  both claim the number; the number becomes unverified until an agent calls it. */
export async function claimAccount(
  userId: string,
  passwordHash: string,
  name: string | null,
): Promise<boolean> {
  const res = await db
    .update(users)
    .set({
      passwordHash,
      passwordSetAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
      phoneVerifiedAt: null,
      ...(name ? { name } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), eq(users.role, "customer"), sql`${users.passwordHash} IS NULL`))
    .returning({ id: users.id });
  return res.length > 0;
}

/** One more wrong password, counted atomically; locks the account once `max` is reached. */
export async function recordLoginFailure(
  userId: string,
  max: number,
  lockMs: number,
): Promise<{ lockedUntil: Date | null }> {
  const [row] = await db
    .update(users)
    .set({
      failedLoginCount: sql`CASE WHEN ${users.failedLoginCount} + 1 >= ${max} THEN 0 ELSE ${users.failedLoginCount} + 1 END`,
      lockedUntil: sql`CASE WHEN ${users.failedLoginCount} + 1 >= ${max} THEN now() + (${lockMs} || ' milliseconds')::interval ELSE ${users.lockedUntil} END`,
    })
    .where(eq(users.id, userId))
    .returning({ lockedUntil: users.lockedUntil });
  return { lockedUntil: row?.lockedUntil ?? null };
}

export async function clearLoginFailures(userId: string): Promise<void> {
  await db.update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, userId));
}

/** New account with a password. Returns created=false when the phone is already taken (unique index). */
export async function createUserWithPassword(input: {
  phone: string;
  name: string | null;
  role: LoginAccount["role"];
  passwordHash: string;
  verified: boolean;
}): Promise<{ created: true; id: string } | { created: false }> {
  const now = new Date();
  const res = await db
    .insert(users)
    .values({
      phone: input.phone,
      name: input.name,
      role: input.role,
      passwordHash: input.passwordHash,
      passwordSetAt: now,
      phoneVerifiedAt: input.verified ? now : null,
    })
    .onConflictDoNothing({ target: users.phone })
    .returning({ id: users.id });
  return res[0] ? { created: true, id: res[0].id } : { created: false };
}

/** Bootstrap admin: password, super_admin role and a verified phone, all in one update. */
export async function promoteToBootstrapAdmin(userId: string, passwordHash: string): Promise<boolean> {
  const now = new Date();
  const res = await db
    .update(users)
    .set({
      passwordHash,
      passwordSetAt: now,
      failedLoginCount: 0,
      lockedUntil: null,
      role: "super_admin",
      phoneVerifiedAt: now,
      updatedAt: now,
    })
    .where(and(eq(users.id, userId), isNull(users.passwordHash)))
    .returning({ id: users.id });
  return res.length > 0;
}

export async function setPhoneVerified(userId: string, verified: boolean): Promise<boolean> {
  const res = await db
    .update(users)
    .set({ phoneVerifiedAt: verified ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return res.length > 0;
}

/** Customers for admin, searched and paginated in the database. */
export async function searchCustomers(
  q: string,
  page: number,
  pageSize: number,
): Promise<Page<CustomerAccountDTO>> {
  const term = q.trim();
  const like = `%${term.replace(/[\\%_]/g, (c) => "\\" + c)}%`; // search text is literal, not a LIKE pattern
  const customerWhere = (u: typeof users._.columns) =>
    term
      ? and(eq(u.role, "customer"), sql`(${u.phone} ILIKE ${like} OR ${u.name} ILIKE ${like})`)
      : eq(u.role, "customer");
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(customerWhere(users));
  const rows = await db.query.users.findMany({
    where: (users) => customerWhere(users),
    orderBy: (users) => [desc(users.createdAt), users.id],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return {
    rows: rows.map((u) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      hasPassword: !!u.passwordHash,
      phoneVerifiedAt: u.phoneVerifiedAt,
      createdAt: u.createdAt,
    })),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

/** Which of these phones an agent has verified (for the «رقم غير مؤكد» badge on orders). */
export async function verifiedPhones(phones: string[]): Promise<Set<string>> {
  const list = [...new Set(phones.filter(Boolean))];
  if (!list.length) return new Set();
  const rows = await db.query.users.findMany({
    where: (users) => and(inArray(users.phone, list), isNotNull(users.phoneVerifiedAt)),
    columns: { phone: true },
  });
  return new Set(rows.map((r) => r.phone));
}

/** Subquery: the newest OTP row for a phone. */
const latestOtpId = (phone: string) =>
  sql`(select ${otpCodes.id} from ${otpCodes} where ${otpCodes.phone} = ${phone} order by ${otpCodes.createdAt} desc limit 1)`;
