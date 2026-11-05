import { describe, expect, it } from "vitest";
import { selectBranchSchema, selectDeliveryOrderSchema } from "@/db/schema";

// Production rows were seeded with ids like 11111111-1111-1111-1111-111111111111, which Zod 4's
// strict uuid() rejects; reading them made /estimate return 500 (2026-11-05).
const legacy = "11111111-1111-1111-1111-111111111111";

describe("ids read from the database", () => {
  it("accepts a legacy (non-RFC) branch id", () => {
    const row = { id: legacy, name: "فرع", address: null, lat: 30, lng: 31, workingHours: {}, active: true,
      createdAt: new Date(), updatedAt: new Date() };
    expect(selectBranchSchema.parse(row).id).toBe(legacy);
  });

  it("keeps nullable id columns nullable", () => {
    const shape = selectDeliveryOrderSchema.shape;
    expect(shape.driverId.safeParse(null).success).toBe(true);
    expect(shape.categoryId.safeParse("22222222-0000-0000-0000-000000000001").success).toBe(true);
    expect(shape.id.safeParse("not-an-id").success).toBe(false);
  });
});
