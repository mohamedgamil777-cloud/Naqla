import { describe, expect, it } from "vitest";
import { selectBranchSchema, selectDeliveryOrderSchema } from "@/db/schema";
import { vehicleFormValues, vehicleInputSchema } from "@/lib/validation/vehicle";

// Production rows were seeded with ids like 11111111-1111-1111-1111-111111111111, which Zod 4's
// strict uuid() rejects; reading them made /estimate return 500 (2026-11-05).
const legacy = "11111111-1111-1111-1111-111111111111";

describe("ids read from the database", () => {
  it("accepts a legacy (non-RFC) branch id", () => {
    const row = {
      id: legacy,
      name: "فرع",
      address: null,
      lat: 30,
      lng: 31,
      workingHours: {},
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(selectBranchSchema.parse(row).id).toBe(legacy);
  });

  it("keeps nullable id columns nullable", () => {
    const shape = selectDeliveryOrderSchema.shape;
    expect(shape.driverId.safeParse(null).success).toBe(true);
    expect(shape.categoryId.safeParse("22222222-0000-0000-0000-000000000001").success).toBe(true);
    expect(shape.id.safeParse("not-an-id").success).toBe(false);
  });
});

describe("ids picked in admin forms", () => {
  // the car form refused every type with an old id ("اختار النوع."), so "add car" did nothing (2026-11-13)
  it("a car can be saved under a type with a legacy id", () => {
    const parsed = vehicleInputSchema.safeParse(
      vehicleFormValues({
        name: "جامبو 2",
        plate: "ج م ب 2",
        categoryId: legacy,
        driverId: "22222222-0000-0000-0000-000000000003",
        hour1: "250",
      }),
    );
    expect(parsed.success).toBe(true);
  });
});
