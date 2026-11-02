import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthError,
  LOCK_MS,
  MAX_FAILED_LOGINS,
  adminSetPassword,
  loginWithPassword,
  registerCustomer,
} from "@/services/auth";
import { ensureBootstrapAdmin } from "@/services/bootstrap";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordProblem } from "@/lib/password-policy";
import { resetEnvCache } from "@/lib/env";
import { getLoginAccount, upsertUser } from "@/db/lib/accounts";
import { createStaff } from "@/db/lib/staff";

// Tests run on the local *_test database (tests/setup). Each test uses its own phone numbers.
let n = 0;
const phone = () => `0102${String(1000000 + ++n).slice(-7)}`;
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    return e instanceof AuthError ? e.code : String(e);
  }
};

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
});

describe("password hashing + policy", () => {
  it("hashes with a salt and verifies only the right password", async () => {
    const a = await hashPassword("secret-123");
    const b = await hashPassword("secret-123");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("secret-123", a)).toBe(true);
    expect(await verifyPassword("secret-124", a)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });

  it("customers need 6+, staff 8+, common passwords refused", () => {
    expect(passwordProblem("abc12", "customer")).not.toBeNull();
    expect(passwordProblem("abc123x", "customer")).toBeNull();
    expect(passwordProblem("abc123x", "agent")).not.toBeNull();
    expect(passwordProblem("abc12345x", "agent")).toBeNull();
    expect(passwordProblem("123456", "customer")).not.toBeNull();
    expect(passwordProblem("aaaaaaa", "customer")).not.toBeNull();
  });
});

describe("customer registration + login", () => {
  it("registers, then logs in with the password (not with a wrong one)", async () => {
    const p = phone();
    const r = await registerCustomer(p, "عميل تجربة", "my-pass-1");
    expect(r.role).toBe("customer");
    expect((await loginWithPassword(p, "my-pass-1")).name).toBe("عميل تجربة");
    expect(await code(loginWithPassword(p, "nope-nope"))).toBe("INVALID_CREDENTIALS");
  });

  it("a new customer number starts unverified (agents confirm it)", async () => {
    const p = phone();
    await registerCustomer(p, "عميل", "my-pass-1");
    const acct = await getLoginAccount(`+20${p.slice(1)}`);
    expect(acct?.phoneVerifiedAt).toBeNull();
  });

  it("refuses a second registration for the same number", async () => {
    const p = phone();
    await registerCustomer(p, "الأول", "my-pass-1");
    expect(await code(registerCustomer(p, "التاني", "other-pass-2"))).toBe("PHONE_TAKEN");
    expect((await loginWithPassword(p, "my-pass-1")).name).toBe("الأول"); // first password still works
  });

  it("only one of two simultaneous registrations wins", async () => {
    const p = phone();
    const results = await Promise.all([
      code(registerCustomer(p, "أحمد", "pass-aaa1")),
      code(registerCustomer(p, "بسمة", "pass-bbb2")),
    ]);
    expect(results.filter((x) => x === "OK")).toHaveLength(1);
    expect(results.filter((x) => x === "PHONE_TAKEN")).toHaveLength(1);
  });

  it("validates phone, name and password", async () => {
    expect(await code(registerCustomer("12345", "اسم", "my-pass-1"))).toBe("INVALID_PHONE");
    expect(await code(registerCustomer(phone(), "ا", "my-pass-1"))).toBe("INVALID_NAME");
    expect(await code(registerCustomer(phone(), "اسم", "123"))).toBe("WEAK_PASSWORD");
  });

  it("an unknown number looks like a wrong password", async () => {
    expect(await code(loginWithPassword(phone(), "whatever-1"))).toBe("INVALID_CREDENTIALS");
  });
});

describe("old accounts without a password", () => {
  it("customer from the OTP era claims the account by registering", async () => {
    const p = phone();
    await upsertUser(`+20${p.slice(1)}`, "قديم");
    expect(await code(loginWithPassword(p, "anything-1"))).toBe("PASSWORD_NOT_SET");
    await registerCustomer(p, "قديم", "new-pass-1");
    expect((await loginWithPassword(p, "new-pass-1")).role).toBe("customer");
  });

  it("drivers/staff cannot claim by registering — an admin sets their password", async () => {
    const id = (await createStaff({ name: "سواق جديد", phone: "+201077700001", role: "driver" })).id;
    expect(await code(loginWithPassword("01077700001", "anything-1"))).toBe("PASSWORD_NOT_SET");
    expect(await code(registerCustomer("01077700001", "سواق", "driver-pass-1"))).toBe("STAFF_ACCOUNT");
    expect(await adminSetPassword(id, "driver", "drv-pass-1")).toEqual({ ok: true });
    expect((await loginWithPassword("01077700001", "drv-pass-1")).role).toBe("driver");
  });

  it("admin password reset enforces the staff minimum", async () => {
    const id = (await createStaff({ name: "موظفة", phone: "+201077700002", role: "agent" })).id;
    expect((await adminSetPassword(id, "agent", "short1")).ok).toBe(false);
    expect((await adminSetPassword(id, "agent", "agent-pass-1")).ok).toBe(true);
  });
});

describe("brute-force protection", () => {
  it(`locks after ${MAX_FAILED_LOGINS} wrong passwords, even for the right password`, async () => {
    const p = phone();
    await registerCustomer(p, "عميل", "right-pass-1");
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++)
      expect(await code(loginWithPassword(p, `wrong-${i}`))).toBe("INVALID_CREDENTIALS");
    expect(await code(loginWithPassword(p, "wrong-last"))).toBe("ACCOUNT_LOCKED");
    expect(await code(loginWithPassword(p, "right-pass-1"))).toBe("ACCOUNT_LOCKED");
  });

  it("unlocks after the lock period and a success resets the counter", async () => {
    const p = phone();
    await registerCustomer(p, "عميل", "right-pass-1");
    const realNow = Date.now;
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await code(loginWithPassword(p, `wrong-${i}`));
    vi.spyOn(Date, "now").mockReturnValue(realNow() + LOCK_MS + 1000);
    expect((await loginWithPassword(p, "right-pass-1")).role).toBe("customer");
    vi.restoreAllMocks();
  });
});

describe("bootstrap admin (never locked out)", () => {
  const env = (vars: Record<string, string>) => {
    for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
    resetEnvCache();
  };

  it("does nothing without env", async () => {
    env({ SEED_ADMIN_PHONE: "", SEED_ADMIN_PASSWORD: "" });
    expect((await ensureBootstrapAdmin()).status).toBe("skipped");
  });

  it("creates the super-admin once, then never overwrites the password", async () => {
    env({ SEED_ADMIN_PHONE: "01099900001", SEED_ADMIN_PASSWORD: "boot-pass-1234" });
    expect((await ensureBootstrapAdmin()).status).toBe("created");
    expect((await loginWithPassword("01099900001", "boot-pass-1234")).role).toBe("super_admin");
    env({ SEED_ADMIN_PHONE: "01099900001", SEED_ADMIN_PASSWORD: "another-pass-99" });
    expect((await ensureBootstrapAdmin()).status).toBe("exists");
    expect((await loginWithPassword("01099900001", "boot-pass-1234")).role).toBe("super_admin");
  });

  it("refuses a weak password", async () => {
    env({ SEED_ADMIN_PHONE: "01099900002", SEED_ADMIN_PASSWORD: "123" });
    expect((await ensureBootstrapAdmin()).status).toBe("refused");
  });

  it("promotes the owner's old password-less customer account", async () => {
    await upsertUser("+201099900003", "المالك");
    env({ SEED_ADMIN_PHONE: "01099900003", SEED_ADMIN_PASSWORD: "owner-pass-123" });
    expect((await ensureBootstrapAdmin()).status).toBe("password-set");
    expect((await loginWithPassword("01099900003", "owner-pass-123")).role).toBe("super_admin");
  });

  it("never promotes a customer who already chose their own password", async () => {
    await registerCustomer("01099900004", "شخص تاني", "their-pass-1");
    env({ SEED_ADMIN_PHONE: "01099900004", SEED_ADMIN_PASSWORD: "owner-pass-123" });
    expect((await ensureBootstrapAdmin()).status).toBe("refused");
    expect((await loginWithPassword("01099900004", "their-pass-1")).role).toBe("customer");
  });
});
