/** Saved addresses: one default per list, writes stay inside the owner's list; «للشركات» requests. */
import { describe, expect, it } from "vitest";
import {
  addSavedAddress,
  deleteSavedAddress,
  listSavedAddresses,
  setDefaultSavedAddress,
  updateSavedAddress,
} from "@/db/lib/addresses";
import {
  addCompanyRequest,
  countRecentCompanyRequests,
  listCompanyRequests,
  setCompanyRequestStatus,
} from "@/db/lib/company-requests";
import { companyRequestInputSchema, savedAddressInputSchema } from "@/lib/validation/company";

const place = (owner: string, label: string, isDefault?: boolean) => ({
  owner,
  label,
  address: `${label} — شارع التسعين`,
  details: null,
  lat: 30.02,
  lng: 31.43,
  isDefault,
});

describe("saved addresses", () => {
  it("makes the first address the default and keeps one default per list", async () => {
    const owner = `p:+2010${Date.now() % 1e8}`;
    const home = await addSavedAddress(place(owner, "البيت"));
    const work = await addSavedAddress(place(owner, "الشغل"));
    let list = await listSavedAddresses(owner);
    expect(list.map((a) => [a.label, a.isDefault])).toEqual([
      ["البيت", true],
      ["الشغل", false],
    ]);

    // a new default (on add or later) replaces the old one; the default is listed first
    const store = await addSavedAddress(place(owner, "المخزن", true));
    list = await listSavedAddresses(owner);
    expect(list[0].id).toBe(store.id);
    expect(list.filter((a) => a.isDefault)).toHaveLength(1);

    expect(await setDefaultSavedAddress(work.id, owner)).toBe(true);
    list = await listSavedAddresses(owner);
    expect(list.filter((a) => a.isDefault).map((a) => a.id)).toEqual([work.id]);

    // deleting the default hands it to another address
    expect(await deleteSavedAddress(work.id, owner)).toBe(true);
    list = await listSavedAddresses(owner);
    expect(list.filter((a) => a.isDefault)).toHaveLength(1);
    expect(list.map((a) => a.id)).toEqual(expect.arrayContaining([home.id, store.id]));
  });

  it("edits and defaults only inside the caller's own list", async () => {
    const mine = `c:mine-${Date.now()}`;
    const theirs = `c:theirs-${Date.now()}`;
    const a = await addSavedAddress(place(mine, "الفرع"));
    await addSavedAddress(place(theirs, "مخزنهم"));
    const patch = { label: "الفرع الرئيسي", address: "مدينة نصر", details: "الدور 2", lat: null, lng: null };

    expect(await updateSavedAddress(a.id, theirs, patch)).toBe(false);
    expect(await setDefaultSavedAddress(a.id, theirs)).toBe(false);
    expect(await deleteSavedAddress(a.id, theirs)).toBe(false);
    expect((await listSavedAddresses(theirs)).filter((x) => x.isDefault)).toHaveLength(1);

    expect(await updateSavedAddress(a.id, mine, patch)).toBe(true);
    const [row] = await listSavedAddresses(mine);
    expect(row).toMatchObject({ label: "الفرع الرئيسي", address: "مدينة نصر", details: "الدور 2", lat: null });
  });

  it("validates the address form", () => {
    expect(savedAddressInputSchema.safeParse({ label: "", address: "مدينة نصر" }).success).toBe(false);
    expect(savedAddressInputSchema.safeParse({ label: "البيت", address: "" }).success).toBe(false);
    expect(savedAddressInputSchema.safeParse({ label: "البيت", address: "x", lat: "95" }).success).toBe(false);
    const ok = savedAddressInputSchema.parse({ label: " البيت ", address: "مدينة نصر", lat: "30.1", lng: "31.2", isDefault: "on" });
    expect(ok).toMatchObject({ id: null, label: "البيت", lat: 30.1, lng: 31.2, isDefault: true, details: null });
  });
});

describe("company account requests", () => {
  it("validates, stores and moves between new and handled", async () => {
    expect(companyRequestInputSchema.safeParse({ companyName: "x", contactName: "y", phone: "123" }).success).toBe(false);
    const input = companyRequestInputSchema.parse({
      companyName: "محلات النور",
      contactName: "أحمد",
      phone: "01001234567",
      monthlyTrips: "10 لـ 30",
      note: "",
    });
    expect(input.phone).toBe("+201001234567");
    expect(input.note).toBeNull();

    const { id } = await addCompanyRequest(input);
    expect(await countRecentCompanyRequests(input.phone, new Date(Date.now() - 60_000))).toBe(1);
    let lists = await listCompanyRequests();
    expect(lists.open.map((r) => r.id)).toContain(id);

    expect(await setCompanyRequestStatus(id, "handled")).toBe(true);
    lists = await listCompanyRequests();
    expect(lists.open.map((r) => r.id)).not.toContain(id);
    expect(lists.handled.map((r) => r.id)).toContain(id);
  });
});
