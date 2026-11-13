/**
 * Data-layer rules that only the database can enforce: owner/tenant scope in the query, one-step
 * conditional updates, transactions and foreign keys. Runs on the *_test database (see setup).
 */
import { describe, expect, it } from "vitest";
import { upsertUser } from "@/db/lib/accounts";
import { createVehicleBlock, getBusy, getBusyForVehicles, listVehicleBlocks } from "@/db/lib/availability";
import { categoryUsage, createCategory, deleteCategory } from "@/db/lib/categories";
import {
  addCompanyMember,
  addCompanyPayment,
  companyBalances,
  countCompanyMembers,
  createCompany,
  deleteCompanyPayment,
  listCompanyMembers,
  removeCompanyMember,
} from "@/db/lib/companies";
import { createCoupon, listCoupons } from "@/db/lib/coupons";
import {
  advanceDeliveryOrderByDriver,
  assignDeliveryDriver,
  countDeliveryOrdersByStatus,
  deliveryOrderMonths,
  getDeliveryOrder,
  insertDeliveryOrder,
  listOpenDeliveryOrders,
  rateDeliveryOrder,
  searchDeliveryOrders,
  setDriverFee,
  updateDeliveryOrderStatus,
} from "@/db/lib/delivery-orders";
import { deleteDocument, listDocuments, saveDocument } from "@/db/lib/documents";
import { driverEarnings, driverRatingStats, driverStats } from "@/db/lib/drivers";
import { reportRowCounts } from "@/db/lib/reporting";
import { getAppContent, getBusiness, updateAppContent, updateBusiness } from "@/db/lib/settings";
import { createStaff, deleteStaff } from "@/db/lib/staff";
import { db } from "@/db/client";
import { createVehicle, getVehicle, getVehicleForEdit, listFleet, updateVehicle } from "@/db/lib/vehicles";
import { branches } from "@/db/schema";
import { getDashboard } from "@/services/admin-service";
import { DEFAULTS } from "@/lib/constants";
import type { Quote } from "@/engines/pricing";

let n = 0;
const uniquePhone = () => `+2010555${String(10000 + ++n).slice(-5)}`;

const QUOTE: Quote = {
  hours: 0,
  lines: [{ key: "base", labelAr: "سعر التوصيل", amount: 10000 }],
  subtotal: 10000,
  discount: 0,
  vat: 0,
  total: 10000,
  deposit: 0,
  currency: "EGP",
};

async function newCategory() {
  const { id } = await createCategory({
    kind: "pickup",
    name: `حجم ${++n}`,
    sizeCode: "S",
    baseFare: 5000,
    perKm: 500,
  });
  return id;
}

async function newDriver() {
  const { id } = await createStaff({ name: "سواق تجربة", phone: uniquePhone(), role: "driver" });
  return id;
}

async function newOrder(
  categoryId: string,
  extra: {
    source?: "agent" | "customer";
    promo?: string | null;
    phone?: string;
    companyId?: string;
    scheduledAt?: Date;
  } = {},
) {
  const { code } = await insertDeliveryOrder(
    {
      categoryId,
      km: 5,
      loaders: 0,
      scheduledAt: extra.scheduledAt ?? new Date(Date.now() + 86_400_000),
      contactName: "عميل",
      contactPhone: extra.phone ?? uniquePhone(),
      companyId: extra.companyId ?? null,
      billing: extra.companyId ? "account" : "cash",
      pickupAddress: "المعادي",
      dropoffAddress: "مدينة نصر",
      source: extra.source ?? "customer",
      agentName: extra.source === "agent" ? "منى" : null,
    },
    QUOTE,
    "صغيرة",
    "S",
    extra.promo ?? null,
  );
  return code;
}

describe("company scope is part of every delete", () => {
  it("a member or payment of another company can't be removed", async () => {
    const a = await createCompany({
      name: "شركة أ",
      phone: null,
      taxNumber: null,
      address: null,
      discountPct: 0,
      billing: "cash",
      creditLimit: 0,
      active: true,
    });
    const b = await createCompany({
      name: "شركة ب",
      phone: null,
      taxNumber: null,
      address: null,
      discountPct: 0,
      billing: "cash",
      creditLimit: 0,
      active: true,
    });
    await addCompanyMember(a.id, uniquePhone(), "عضو", "member");
    const [member] = await listCompanyMembers(a.id);
    const payment = await addCompanyPayment({
      companyId: a.id,
      amount: 1000,
      method: "bank",
      note: null,
    });

    expect(await removeCompanyMember(b.id, member.id)).toBe(false);
    expect(await deleteCompanyPayment(b.id, payment.id)).toBe(false);
    expect(await listCompanyMembers(a.id)).toHaveLength(1);

    expect(await removeCompanyMember(a.id, member.id, member.id)).toBe(false); // can't remove yourself
    expect(await removeCompanyMember(a.id, member.id)).toBe(true);
    expect(await deleteCompanyPayment(a.id, payment.id)).toBe(true);
  });

  it("one company per phone — the unique index decides", async () => {
    const a = await createCompany({
      name: "شركة ج",
      phone: null,
      taxNumber: null,
      address: null,
      discountPct: 0,
      billing: "cash",
      creditLimit: 0,
      active: true,
    });
    const phone = uniquePhone();
    const results = await Promise.all([
      addCompanyMember(a.id, phone, null, "member"),
      addCompanyMember(a.id, phone, null, "member"),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
});

describe("documents belong to their phone", () => {
  it("only the owner can delete, and saving replaces the same type", async () => {
    const owner = uniquePhone();
    await saveDocument({ phone: owner, type: "license", url: "data:image/png;base64,AA" });
    const { id } = await saveDocument({
      phone: owner,
      type: "license",
      url: "data:image/png;base64,BB",
    });
    expect(await listDocuments(owner)).toHaveLength(1);
    expect(await deleteDocument(id, uniquePhone())).toBe(false);
    expect(await deleteDocument(id, owner)).toBe(true);
  });
});

describe("driver steps are one conditional update", () => {
  it("only the assigned driver, only the next step", async () => {
    const categoryId = await newCategory();
    const [driver, other] = [await newDriver(), await newDriver()];
    const code = await newOrder(categoryId);
    await assignDeliveryDriver(code, driver);

    expect(await advanceDeliveryOrderByDriver(code, other, "assigned", "en_route")).toBe(false);
    expect(await advanceDeliveryOrderByDriver(code, driver, "en_route", "arrived")).toBe(false); // skipping
    expect(await advanceDeliveryOrderByDriver(code, driver, "assigned", "en_route")).toBe(true);
    // a double tap on the same step does nothing the second time
    expect(await advanceDeliveryOrderByDriver(code, driver, "assigned", "en_route")).toBe(false);
    expect((await getDeliveryOrder(code))?.status).toBe("en_route");
  });

  it("finished orders can't get a new driver", async () => {
    const categoryId = await newCategory();
    const driver = await newDriver();
    const code = await newOrder(categoryId);
    await updateDeliveryOrderStatus(code, "completed");
    expect(await assignDeliveryDriver(code, driver)).toBe(false);
  });
});

describe("foreign keys keep history", () => {
  it("a driver with orders can't be deleted; one without can", async () => {
    const categoryId = await newCategory();
    const busy = await newDriver();
    const code = await newOrder(categoryId);
    await assignDeliveryDriver(code, busy);
    expect(await deleteStaff(busy)).toEqual({ ok: false, reason: "IN_USE" });

    const idle = await newDriver();
    expect(await deleteStaff(idle)).toEqual({ ok: true });
  });

  it("a size used by an order can't be deleted", async () => {
    const categoryId = await newCategory();
    await newOrder(categoryId);
    expect(await deleteCategory(categoryId)).toEqual({ ok: false, reason: "IN_USE" });
    expect(await deleteCategory(await newCategory())).toEqual({ ok: true });
  });
});

describe("orders: creation transaction and paged lists", () => {
  it("phone orders start confirmed and the coupon use is counted with the order", async () => {
    const categoryId = await newCategory();
    const promo = `T${++n}`;
    await createCoupon({
      code: promo,
      type: "pct",
      value: 10,
      minValue: 0,
      validTo: null,
      maxUses: null,
      active: true,
    });

    const code = await newOrder(categoryId, { source: "agent", promo });
    expect((await getDeliveryOrder(code))?.status).toBe("confirmed");
    expect((await listCoupons()).find((c) => c.code === promo)?.used).toBe(1);

    const failing = insertDeliveryOrder(
      {
        categoryId: "00000000-0000-0000-0000-000000000000",
        km: 1,
        loaders: 0,
        scheduledAt: new Date(),
        contactName: "x",
        contactPhone: "x",
      },
      QUOTE,
      "x",
      null,
      promo,
    );
    await expect(failing).rejects.toThrow(); // FK on the size → the whole transaction rolls back
    expect((await listCoupons()).find((c) => c.code === promo)?.used).toBe(1);
  });

  it("searches, filters and paginates in the database", async () => {
    const categoryId = await newCategory();
    const codes = [await newOrder(categoryId), await newOrder(categoryId), await newOrder(categoryId)];
    await updateDeliveryOrderStatus(codes[0], "cancelled");

    const page1 = await searchDeliveryOrders({}, 1, 2);
    expect(page1.rows).toHaveLength(2);
    expect(page1.total).toBeGreaterThanOrEqual(3);
    expect(page1.totalPages).toBe(Math.ceil(page1.total / 2));

    const byCode = await searchDeliveryOrders({ q: codes[1] }, 1, 20);
    expect(byCode.rows.map((o) => o.code)).toEqual([codes[1]]);

    const cancelled = await searchDeliveryOrders({ status: "cancelled" }, 1, 50);
    expect(cancelled.rows.every((o) => o.status === "cancelled")).toBe(true);
    const open = await searchDeliveryOrders({ status: "open" }, 1, 50);
    expect(open.rows.some((o) => o.code === codes[0])).toBe(false);
  });

  it("driver earnings and ratings are summed in the database", async () => {
    const categoryId = await newCategory();
    const driver = await newDriver();
    const code = await newOrder(categoryId);
    await assignDeliveryDriver(code, driver);
    await setDriverFee(code, 7500);
    await updateDeliveryOrderStatus(code, "completed");
    const order = await getDeliveryOrder(code);
    await rateDeliveryOrder(code, order!.contactPhone!, 4, null);

    expect((await driverEarnings()).get(driver)).toBe(7500);
    expect((await driverRatingStats())[driver]).toEqual({ avg: 4, count: 1 });
    expect((await categoryUsage())[categoryId]).toEqual({ vehicles: 0, orders: 1 });
    const counts = await reportRowCounts();
    expect(counts["delivery-orders"]).toBeGreaterThan(0);
  });
});

describe("settings documents update atomically", () => {
  it("business settings merge in the database (other fields keep their values)", async () => {
    await updateBusiness({ bufferMinutes: 45 });
    await updateBusiness({ minHours: 3 });
    const b = await getBusiness();
    expect(b.bufferMinutes).toBe(45);
    expect(b.minHours).toBe(3);
    expect(b.maxHours).toBe(DEFAULTS.maxHours);
  });

  it("app content: concurrent edits of different sections both survive; an error saves nothing", async () => {
    await Promise.all([
      updateAppContent((c) => {
        c.supportPhone = "16000";
      }),
      updateAppContent((c) => {
        c.home.title = "عنوان جديد";
      }),
    ]);
    const content = await getAppContent();
    expect(content.supportPhone).toBe("16000");
    expect(content.home.title).toBe("عنوان جديد");

    const res = await updateAppContent((c) => {
      c.supportPhone = "999";
      return "refused";
    });
    expect(res).toEqual({ ok: false, error: "refused" });
    expect((await getAppContent()).supportPhone).toBe("16000");
  });
});

describe("users", () => {
  it("find-or-create by phone is one statement (same id, name kept unless given)", async () => {
    const phone = uniquePhone();
    const [a, b] = await Promise.all([upsertUser(phone, "سارة"), upsertUser(phone)]);
    expect(a.id).toBe(b.id);
    expect((await upsertUser(phone)).name).toBe("سارة");
  });
});

describe("dashboard reads", () => {
  it("runs the date-bounded queries (dates bind through column-aware operators)", async () => {
    const d = await getDashboard();
    expect(d.activeRentals).toBeGreaterThanOrEqual(0);
    expect(d.collectedToday).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(d.upcoming)).toBe(true);
  });
});

describe("scoped, paginated order reads", () => {
  it("a customer sees only their own orders, page by page; open and closed are split", async () => {
    const categoryId = await newCategory();
    const phone = uniquePhone();
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push(await newOrder(categoryId, { phone }));
    await newOrder(categoryId); // someone else's
    await updateDeliveryOrderStatus(codes[0], "completed");
    await updateDeliveryOrderStatus(codes[1], "cancelled");

    const page1 = await searchDeliveryOrders({ phone }, 1, 2);
    const page3 = await searchDeliveryOrders({ phone }, 3, 2);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
    expect(page3.rows).toHaveLength(1);
    expect(page1.rows.every((o) => o.contactPhone === phone)).toBe(true);

    expect((await listOpenDeliveryOrders({ phone })).map((o) => o.code).sort()).toEqual(
      codes.slice(2).sort(),
    );
    expect((await searchDeliveryOrders({ phone, status: "closed" }, 1, 10)).total).toBe(2);
    expect(
      (await searchDeliveryOrders({ phone, status: "completed", unrated: true }, 1, 1)).rows[0]?.code,
    ).toBe(codes[0]);
    expect(await countDeliveryOrdersByStatus({ phone })).toEqual({
      new: 3,
      completed: 1,
      cancelled: 1,
    });
  });

  it("a driver's active work, history and totals come from the database", async () => {
    const categoryId = await newCategory();
    const driver = await newDriver();
    const [a, b, c] = [await newOrder(categoryId), await newOrder(categoryId), await newOrder(categoryId)];
    for (const code of [a, b, c]) await assignDeliveryDriver(code, driver);
    await setDriverFee(a, 4000);
    await updateDeliveryOrderStatus(a, "completed");
    await updateDeliveryOrderStatus(b, "cancelled");

    const active = await listOpenDeliveryOrders({
      driverId: driver,
      statuses: ["assigned", "en_route", "arrived"],
    });
    expect(active.map((o) => o.code)).toEqual([c]);
    expect((await searchDeliveryOrders({ driverId: driver, status: "closed" }, 1, 10, "recent")).total).toBe(
      2,
    );
    expect(await driverStats(driver)).toEqual({
      completed: 1,
      earned: 4000,
      active: 1,
      rating: null,
    });
  });
});

describe("company balances and statement months", () => {
  it("balances are summed per company, optionally before a date", async () => {
    const categoryId = await newCategory();
    const company = await createCompany({
      name: "شركة رصيد",
      phone: null,
      taxNumber: null,
      address: null,
      discountPct: 0,
      billing: "monthly",
      creditLimit: 0,
      active: true,
    });
    const lastMonth = new Date(Date.now() - 40 * 86_400_000);
    const old = await newOrder(categoryId, { companyId: company.id, scheduledAt: lastMonth });
    await updateDeliveryOrderStatus(old, "completed");
    await newOrder(categoryId, { companyId: company.id }); // open
    await addCompanyPayment({ companyId: company.id, amount: 3000, method: "bank", note: null });

    const all = (await companyBalances([company.id])).get(company.id);
    expect(all).toEqual({ charged: 10000, paid: 3000, outstanding: 7000, open: 10000 });
    const before = (await companyBalances([company.id], new Date(Date.now() - 30 * 86_400_000))).get(
      company.id,
    );
    expect(before).toEqual({ charged: 10000, paid: 0, outstanding: 10000, open: 0 });
    expect((await deliveryOrderMonths({ companyId: company.id })).length).toBe(2);
    expect((await countCompanyMembers()).get(company.id)).toBeUndefined();
  });
});

describe("availability only looks ahead", () => {
  it("bookings / blocks that ended before `since` are not loaded; one query covers many vehicles", async () => {
    await db.insert(branches).values({ name: "فرع تجربة", workingHours: { open: 8, close: 22 } });
    const pricing = {
      hour1: 10000,
      hour2: 0,
      hour4: 0,
      hour8: 0,
      daily: 0,
      extraHour: 0,
      deposit: 0,
      driverFeePerHour: 0,
      loaderFeePerPerson: 0,
      perKmPrice: 0,
      deliveryFee: 0,
    };
    const vehicle = (base: string) => ({
      name: base,
      plate: `${base}-${++n}`,
      categoryId: "",
      brand: null,
      model: null,
      year: null,
      color: null,
      transmission: "manual" as const,
      fuel: "benzine" as const,
      seats: null,
      cargoKg: null,
      hasDriverOption: true,
      status: "available" as const,
      imageUrl: null,
      pricing,
    });
    const categoryId = await newCategory();
    const a = await createVehicle({ ...vehicle("أ"), categoryId });
    const b = await createVehicle({ ...vehicle("ب"), categoryId });

    const day = 86_400_000;
    const block = (vehicleId: string, fromDays: number, toDays: number) =>
      createVehicleBlock({
        vehicleId,
        startsAt: new Date(Date.now() + fromDays * day),
        endsAt: new Date(Date.now() + toDays * day),
        reason: "block",
      });
    await block(a.id, -10, -9); // long over
    await block(a.id, 1, 2);
    await block(b.id, 3, 4);

    expect(await getBusy(a.id, new Date(Date.now() - day))).toHaveLength(1);
    const both = await getBusyForVehicles([a.id, b.id], new Date(), new Date(Date.now() + 2.5 * day));
    expect(both.get(a.id)).toHaveLength(1);
    expect(both.get(b.id)).toHaveLength(0); // starts after `until`
    expect(await listVehicleBlocks(a.id)).toHaveLength(1); // past blocks are history
  });
});

describe("fleet: driver, owner and licence stay admin-only", () => {
  it("saves them, clears the owner when the driver owns it, and keeps them off the customer read", async () => {
    await db.insert(branches).values({ name: "فرع أسطول", workingHours: { open: 8, close: 22 } });
    const categoryId = await newCategory();
    const driverId = await newDriver();
    const pricing = {
      hour1: 10000,
      hour2: 0,
      hour4: 0,
      hour8: 0,
      daily: 0,
      extraHour: 0,
      deposit: 0,
      driverFeePerHour: 0,
      loaderFeePerPerson: 0,
      perKmPrice: 0,
      deliveryFee: 0,
    };
    const base = {
      name: "دبابة 1",
      plate: `ق ن ل ${++n}`,
      categoryId,
      brand: null,
      model: null,
      year: null,
      color: null,
      transmission: "manual" as const,
      fuel: "benzine" as const,
      seats: null,
      cargoKg: null,
      hasDriverOption: true,
      status: "available" as const,
      imageUrl: null,
      pricing,
    };
    const { id } = await createVehicle({
      ...base,
      driverId,
      ownerIsDriver: false,
      ownerName: "صاحب العربية",
      ownerPhone: "01000000000",
      licenseNumber: "123456",
      licenseExpiry: "2027-01-31",
      notes: "ملاحظة",
    });

    const fleet = (await listFleet()).find((v) => v.id === id)!;
    expect(fleet.plate).toBe(base.plate);
    expect(fleet.driver?.id).toBe(driverId);
    expect(fleet.admin).toMatchObject({
      ownerIsDriver: false,
      ownerName: "صاحب العربية",
      licenseExpiry: "2027-01-31",
    });

    const customer = (await getVehicle(id))! as unknown as Record<string, unknown>;
    for (const k of ["driverId", "ownerName", "ownerPhone", "licenseNumber", "notes", "admin", "plate"]) {
      expect(customer[k]).toBeUndefined();
    }

    await updateVehicle(id, { ...base, driverId, ownerIsDriver: true, ownerName: "يتمسح" });
    const edit = (await getVehicleForEdit(id))!;
    expect(edit.admin).toMatchObject({ ownerIsDriver: true, ownerName: null, driverId, licenseNumber: null });
  });
});
