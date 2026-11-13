/** سجل النشاط: what changed between two versions of a record, how values read, and the log query. */
import { describe, expect, it } from "vitest";
import { insertAuditLog, searchAuditLogs } from "@/db/lib/audit";
import { createStaff } from "@/db/lib/staff";
import { actionsInGroup, auditActionInfo, formatAuditValue } from "@/lib/audit-catalog";
import { changes } from "@/services/audit";

describe("changes()", () => {
  it("keeps only the fields that changed, nested prices flattened", () => {
    const diff = changes(
      { id: "x", name: "دبابة", baseFare: 50000, pricing: { hour1: 100, daily: 900 }, note: null },
      { id: "x", name: "دبابة", baseFare: 55000, pricing: { hour1: 100, daily: 1000 }, note: "" },
    );
    expect(diff).toEqual({
      before: { baseFare: 50000, "pricing.daily": 900 },
      after: { baseFare: 55000, "pricing.daily": 1000 },
    });
  });

  it("treats a missing previous record as all-new", () => {
    expect(changes(null, { status: "cancelled" })).toEqual({ before: { status: null }, after: { status: "cancelled" } });
  });
});

describe("audit catalog", () => {
  it("reads values in Arabic", () => {
    expect(formatAuditValue("orderStatus", "cancelled")).toBe("ملغي");
    expect(formatAuditValue("role", "agent")).toBe("موظف حجوزات");
    expect(formatAuditValue("amount", 150000)).toContain("1,500");
    expect(formatAuditValue("note", null)).toBe("—");
  });

  it("groups actions for the filter", () => {
    expect(actionsInGroup("orders")).toContain("order.cancel");
    expect(auditActionInfo("order.cancel").danger).toBe(true);
    expect(auditActionInfo("unknown.thing").label).toBe("unknown.thing");
  });
});

describe("searchAuditLogs", () => {
  it("filters by staff member, action and text, with the actor's name joined", async () => {
    const staff = await createStaff({ name: "موظف السجل", phone: "+201055599901", role: "agent" });
    const code = `T${Date.now()}`;
    await insertAuditLog({
      actorId: staff.id,
      action: "order.cancel",
      entity: "delivery_order",
      entityId: code,
      before: { orderStatus: "confirmed" },
      after: { orderStatus: "cancelled", _label: `طلب ${code}`, _by: "موظف السجل" },
    });
    await insertAuditLog({
      actorId: null,
      action: "admin.login",
      entity: "admin",
      entityId: null,
      before: null,
      after: { _label: null, _by: "المدير" },
    });

    const mine = await searchAuditLogs({ actor: staff.id }, 1, 10);
    expect(mine.total).toBe(1);
    expect(mine.rows[0]).toMatchObject({ action: "order.cancel", actorName: "موظف السجل", entityId: code });

    const byText = await searchAuditLogs({ q: code, actions: actionsInGroup("orders") }, 1, 10);
    expect(byText.rows.map((r) => r.entityId)).toEqual([code]);

    const owner = await searchAuditLogs({ actor: "owner", actions: ["admin.login"] }, 1, 10);
    expect(owner.rows.length).toBeGreaterThan(0);
    expect(owner.rows.every((r) => r.actorId === null)).toBe(true);

    const none = await searchAuditLogs({ actor: staff.id, from: new Date(Date.now() + 86_400_000) }, 1, 10);
    expect(none.total).toBe(0);
  });
});
