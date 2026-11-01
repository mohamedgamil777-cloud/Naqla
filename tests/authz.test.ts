import { beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// --- server-side identity is mocked; everything else is the real code ---
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
const adminRole = vi.fn<() => Promise<string | null>>();
vi.mock("@/services/admin-auth", () => ({ getAdminRole: () => adminRole() }));
const session = vi.fn<() => Promise<{ phone: string } | null>>();
vi.mock("@/services/session", () => ({ getSession: () => session() }));

import { ADMIN_ROLES, PERMISSIONS, ROLE_PERMISSIONS, can } from "@/lib/permissions";
import { authorizeRequest, canViewBooking, requirePermission } from "@/lib/authz";
import { csvCell } from "@/lib/csv";

beforeEach(() => {
  adminRole.mockReset();
  session.mockReset();
});

describe("permission registry", () => {
  it("super_admin holds every permission", () => {
    for (const p of PERMISSIONS) expect(can("super_admin", p)).toBe(true);
  });

  it("roles only hold what the map grants", () => {
    expect(can("agent", "booking:create")).toBe(true);
    expect(can("agent", "finance:read")).toBe(false);
    expect(can("agent", "export:read")).toBe(false);
    expect(can("finance", "export:read")).toBe(true);
    expect(can("finance", "booking:read")).toBe(false);
    expect(can("fleet_mgr", "fleet:manage")).toBe(true);
    expect(can("fleet_mgr", "staff:manage")).toBe(false);
  });

  it("drivers, customers and unknown roles have no admin permission", () => {
    for (const p of PERMISSIONS) {
      expect(can("driver", p)).toBe(false);
      expect(can(null, p)).toBe(false);
      expect(can("owner", p)).toBe(false);
    }
  });

  it("every mapped permission is a known permission", () => {
    for (const r of ADMIN_ROLES) for (const p of ROLE_PERMISSIONS[r]) expect(PERMISSIONS).toContain(p);
  });
});

describe("requirePermission (pages + server actions)", () => {
  it("unauthenticated → admin login", async () => {
    adminRole.mockResolvedValue(null);
    await expect(requirePermission("booking:read")).rejects.toThrow("REDIRECT:/admin-login");
  });

  it("wrong role → dashboard with denied notice", async () => {
    adminRole.mockResolvedValue("agent");
    await expect(requirePermission("finance:read")).rejects.toThrow("REDIRECT:/admin?denied=finance%3Aread");
  });

  it("a driver session is not an admin", async () => {
    adminRole.mockResolvedValue("driver");
    await expect(requirePermission("dashboard:read")).rejects.toThrow("REDIRECT:/admin-login");
  });

  it("allowed role → actor", async () => {
    adminRole.mockResolvedValue("finance");
    await expect(requirePermission("finance:read")).resolves.toEqual({ role: "finance" });
  });
});

describe("authorizeRequest (route handlers)", () => {
  it("401 when not signed in", async () => {
    adminRole.mockResolvedValue(null);
    const r = await authorizeRequest("export:read");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("403 for a signed-in customer (known identity, no admin access)", async () => {
    adminRole.mockResolvedValue(null);
    session.mockResolvedValue({ phone: "+201000000009" });
    const r = await authorizeRequest("export:read");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("403 when signed in without the permission", async () => {
    adminRole.mockResolvedValue("agent");
    const r = await authorizeRequest("export:read");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("ok with the permission", async () => {
    adminRole.mockResolvedValue("finance");
    expect((await authorizeRequest("export:read")).ok).toBe(true);
  });
});

describe("customer-owned bookings", () => {
  it("the owner can view", async () => {
    session.mockResolvedValue({ phone: "+201000000001" });
    adminRole.mockResolvedValue(null);
    expect(await canViewBooking("+201000000001")).toBe(true);
  });

  it("another customer cannot (cross-customer access)", async () => {
    session.mockResolvedValue({ phone: "+201000000002" });
    adminRole.mockResolvedValue(null);
    expect(await canViewBooking("+201000000001")).toBe(false);
  });

  it("anonymous cannot, even with the right code", async () => {
    session.mockResolvedValue(null);
    adminRole.mockResolvedValue(null);
    expect(await canViewBooking("+201000000001")).toBe(false);
  });

  it("staff need booking:read", async () => {
    session.mockResolvedValue(null);
    adminRole.mockResolvedValue("agent");
    expect(await canViewBooking("+201000000001")).toBe(true);
    adminRole.mockResolvedValue("finance");
    expect(await canViewBooking("+201000000001")).toBe(false);
  });
});

describe("admin export route", { timeout: 60_000 }, () => {
  const call = async (qs: string) => {
    const { GET } = await import("@/app/api/admin/export/route");
    const { NextRequest } = await import("next/server");
    return GET(new NextRequest(`http://localhost/api/admin/export${qs}`));
  };

  it("401 / 403 / 200 by identity", async () => {
    adminRole.mockResolvedValue(null);
    expect((await call("?report=bookings")).status).toBe(401);
    adminRole.mockResolvedValue("agent");
    expect((await call("?report=bookings")).status).toBe(403);
    adminRole.mockResolvedValue("finance");
    const ok = await call("?report=bookings&from=2026-01-01&to=2026-01-31");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toContain("text/csv");
  });

  it("400 for unknown reports and bad dates", async () => {
    adminRole.mockResolvedValue("finance");
    expect((await call("?report=../../etc")).status).toBe(400);
    expect((await call("?report=bookings&from=2026-13-99x")).status).toBe(400);
    expect((await call("?report=bookings&from=2026-02-01&to=2026-01-01")).status).toBe(400);
    expect((await call("?report=bookings&from=2020-01-01&to=2026-01-01")).status).toBe(400);
  });
});

describe("CSV formula injection", () => {
  it("neutralises formula-looking text but keeps numbers", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+201000000001")).toBe("'+201000000001");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-12.50")).toBe("-12.50");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell("محمد")).toBe("محمد");
  });
});

describe("every admin page and action checks a permission on the server", () => {
  const root = join(process.cwd(), "app", "admin");
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f === "page.tsx" || f === "actions.ts") files.push(p);
    }
  };
  walk(root);

  it.each(files.map((f) => [f.slice(process.cwd().length + 1)]))("%s", (rel) => {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    if (rel.endsWith("page.tsx")) {
      expect(src).toMatch(/requirePermission\("[a-z]+:[a-z]+"\)/);
    } else {
      // each exported server action must check a permission (directly or via a shared guard)
      const exported = [...src.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
      for (const name of exported) {
        const body = src.slice(src.indexOf(`export async function ${name}`)).split(/\nexport /)[0];
        // content actions share a guarded helper: update() → requirePermission("content:manage")
        const viaGuardedHelper =
          /(await|return) update\(/.test(body) && /async function update\([\s\S]*?requirePermission\(/.test(src);
        const guarded = /requirePermission\(/.test(body) || viaGuardedHelper;
        expect(guarded, `${rel} → ${name} has no permission check`).toBe(true);
      }
    }
  });
});
