/** Company users: username login, password reset by phone code, company-admin-only edits, monthly report. */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthError,
  RESET_CODES_PER_HOUR,
  RESET_MAX_ATTEMPTS,
  loginWithPassword,
  normalizePhone,
  registerCustomer,
  requestPasswordReset,
  resetPasswordWithCode,
} from "@/services/auth";
import { getLoginAccount, setUsername } from "@/db/lib/accounts";
import { setCompanyUserLogin } from "@/services/company-users";
import { canEditAddresses, type CompanyContext } from "@/services/company-service";
import { companyReportCsv, companyReportFilename } from "@/services/company-report";
import { usernameProblem } from "@/lib/username";

let n = 0;
// stored numbers are +20… (the forms normalise them before these services)
const phone = () => normalizePhone(`0103${String(1000000 + (Date.now() % 900000) + ++n).slice(-7)}`);
const uname = () => `co.user${Date.now() % 1e7}${++n}`;
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    return e instanceof AuthError ? e.code : String(e);
  }
};
/** The 6-digit code from the last SMS (console adapter logs it). */
function sentCode(log: ReturnType<typeof vi.spyOn>): string {
  const msg = String(log.mock.calls.at(-1)?.[0] ?? "");
  const m = msg.match(/: (\d{6})\n/);
  if (!m) throw new Error(`no code in: ${msg}`);
  return m[1];
}

afterEach(() => vi.restoreAllMocks());

describe("usernames", () => {
  it("accepts simple latin names only", () => {
    expect(usernameProblem("ahmed.nour")).toBeNull();
    expect(usernameProblem("Ahmed_1")).toBeNull(); // stored lower-case
    expect(usernameProblem("ab")).not.toBeNull();
    expect(usernameProblem("1ahmed")).not.toBeNull();
    expect(usernameProblem("أحمد")).not.toBeNull();
    expect(usernameProblem("ahmed nour")).not.toBeNull();
  });

  it("company user signs in with username (any case) or phone", async () => {
    const p = phone();
    const u = uname();
    expect(await setCompanyUserLogin({ phone: p, name: "موظف", username: u.toUpperCase(), password: "co-pass-1" })).toBeNull();
    expect((await loginWithPassword(u, "co-pass-1")).name).toBe("موظف");
    expect((await loginWithPassword(u.toUpperCase(), "co-pass-1")).name).toBe("موظف");
    expect((await loginWithPassword(p, "co-pass-1")).name).toBe("موظف");
    expect(await code(loginWithPassword(u, "wrong-pass"))).toBe("INVALID_CREDENTIALS");
    expect(await code(loginWithPassword("no.such.user", "co-pass-1"))).toBe("INVALID_CREDENTIALS");
  });

  it("a username belongs to one account", async () => {
    const u = uname();
    expect(await setCompanyUserLogin({ phone: phone(), name: null, username: u, password: "co-pass-1" })).toBeNull();
    const msg = await setCompanyUserLogin({ phone: phone(), name: null, username: u, password: "co-pass-2" });
    expect(msg).toContain("مستخدم قبل كده");
    const other = await getLoginAccount((await registerCustomer(phone(), "تاني", "other-pass-1")).phone);
    expect(await setUsername(other!.id, u)).toBe(false);
  });

  it("a company admin can't replace a password someone already has; staff can", async () => {
    const p = phone();
    await registerCustomer(p, "عنده حساب", "own-pass-1");
    const u = uname();
    const msg = await setCompanyUserLogin({ phone: p, name: null, username: u, password: "taken-over-1" });
    expect(msg).toContain("نسيت كلمة السر");
    expect((await loginWithPassword(p, "own-pass-1")).name).toBe("عنده حساب");
    // no password typed: they keep theirs and get the username
    expect(await setCompanyUserLogin({ phone: p, name: null, username: u, password: null })).toBeNull();
    expect((await loginWithPassword(u, "own-pass-1")).name).toBe("عنده حساب");
    // staff (admin → الشركات) may set a new one
    expect(
      await setCompanyUserLogin({ phone: p, name: null, username: u, password: "staff-set-1", mayReplacePassword: true }),
    ).toBeNull();
    expect((await loginWithPassword(u, "staff-set-1")).name).toBe("عنده حساب");
  });

  it("a new account needs a password", async () => {
    expect(await setCompanyUserLogin({ phone: phone(), name: null, username: uname(), password: null })).toContain(
      "كلمة سر",
    );
  });
});

describe("password reset by code to the phone", () => {
  it("sends a code to the account's phone and sets the new password", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const p = phone();
    const u = uname();
    await setCompanyUserLogin({ phone: p, name: "ناسي", username: u, password: "old-pass-1" });
    const res = await requestPasswordReset(u);
    expect(res.sentTo).toMatch(/•+\d\d$/); // masked number shown when they typed the username
    expect(String(log.mock.calls.at(-1)?.[0])).toContain(p);
    const c = sentCode(log);
    expect(await code(resetPasswordWithCode(u, c, "123"))).toBe("WEAK_PASSWORD");
    expect((await resetPasswordWithCode(u, c, "new-pass-1")).name).toBe("ناسي");
    expect((await loginWithPassword(u, "new-pass-1")).name).toBe("ناسي");
    expect(await code(loginWithPassword(u, "old-pass-1"))).toBe("INVALID_CREDENTIALS");
    // a code works once
    expect(await code(resetPasswordWithCode(u, c, "newer-pass-1"))).toBe("INVALID_CODE");
  });

  it("refuses wrong codes, and the right one after too many tries", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const p = phone();
    await registerCustomer(p, "عميل", "old-pass-1");
    await requestPasswordReset(p);
    const c = sentCode(log);
    const wrong = c === "000000" ? "111111" : "000000";
    for (let i = 0; i < RESET_MAX_ATTEMPTS; i++) {
      expect(await code(resetPasswordWithCode(p, wrong, "new-pass-1"))).toBe("INVALID_CODE");
    }
    expect(await code(resetPasswordWithCode(p, c, "new-pass-1"))).toBe("INVALID_CODE");
    expect((await loginWithPassword(p, "old-pass-1")).name).toBe("عميل");
  });

  it("refuses an expired code", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const p = phone();
    await registerCustomer(p, "عميل", "old-pass-1");
    await requestPasswordReset(p);
    const c = sentCode(log);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11 * 60 * 1000);
    expect(await code(resetPasswordWithCode(p, c, "new-pass-1"))).toBe("INVALID_CODE");
  });

  it("limits codes per hour and says nothing about unknown accounts", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const p = phone();
    await registerCustomer(p, "عميل", "old-pass-1");
    for (let i = 0; i < RESET_CODES_PER_HOUR; i++) await requestPasswordReset(p);
    expect(await code(requestPasswordReset(p))).toBe("TOO_MANY_CODES");
    expect(await requestPasswordReset("nobody.here")).toEqual({ sentTo: null });
  });
});

describe("company admin only", () => {
  const ctx = (role: "owner" | "member") => ({ member: { role } }) as unknown as CompanyContext;
  it("only the company admin edits company addresses; personal users edit their own", () => {
    expect(canEditAddresses(null)).toBe(true);
    expect(canEditAddresses(ctx("owner"))).toBe(true);
    expect(canEditAddresses(ctx("member"))).toBe(false);
  });
});

describe("monthly trips report", () => {
  it("lists every trip and a summary, safe for Excel", () => {
    const trip = (code: string, billing: "account" | "cash", status: string, total: number) => ({
      code,
      billing,
      status,
      scheduledAt: new Date("2026-10-05T09:30:00Z"),
      pickupAddress: "=HYPERLINK(\"x\")",
      pickupDetails: "عمارة 5",
      dropoffAddress: "مدينة نصر",
      dropoffDetails: null,
      sizeName: "ربع نقل",
      loaders: 2,
      km: 12.34,
      contactName: "أحمد",
      podName: "محمود",
      priceSnapshot: { total },
    });
    const st = {
      month: "2026-10",
      opening: 0,
      charges: 50000,
      paid: 20000,
      closing: 30000,
      cashTotal: 15000,
      allTrips: [trip("NQ-1", "account", "completed", 50000), trip("NQ-2", "cash", "cancelled", 15000)],
    } as unknown as Parameters<typeof companyReportCsv>[0];
    const csv = companyReportCsv(st);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("NQ-1");
    expect(csv).toContain("12:30"); // Cairo time (summer +3)
    expect(csv).toContain("على الحساب");
    expect(csv).toContain("500.00");
    expect(csv).not.toMatch(/(^|,)"?=HYPERLINK/m); // formula neutralised
    expect(csv).toContain("المستحق آخر المدة");
    expect(companyReportFilename(st)).toBe("enqelly-2026-10-trips.csv");
  });
});
