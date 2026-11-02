import { db } from "@/db/client";
import { pricingRules, vehicleCategories, vehicleImages, vehicles } from "@/db/schema";
import { SAMPLE_BRANCH_ID } from "./branch";

/** Logs one row: inserted, or already there (re-running the seed is safe). */
function report(label: string, inserted: boolean) {
  console.log(inserted ? `✅ Inserted: ${label}` : `⚠️ Skipped (Already Exists): ${label}`);
}

// Sizes used by the delivery estimate (/estimate); the medium van is for hourly rental only.
// Money is in piastres.
const CATEGORIES = [
  {
    id: "22222222-0000-4000-8000-000000000001",
    kind: "pickup",
    name: "بيك أب كابينة",
    sort: 1,
    sizeCode: "S",
    capacityKg: 750,
    dims: "1.8 × 1.5 م",
    baseFare: 20000,
    perKm: 500,
  },
  {
    id: "22222222-0000-4000-8000-000000000002",
    kind: "pickup",
    name: "بيك أب دبل كابينة",
    sort: 2,
    sizeCode: "M",
    capacityKg: 1200,
    dims: "2.3 × 1.6 م",
    baseFare: 25000,
    perKm: 600,
  },
  {
    id: "22222222-0000-4000-8000-000000000003",
    kind: "pickup",
    name: "بيك أب كبير",
    sort: 3,
    sizeCode: "L",
    capacityKg: 2000,
    dims: "3.2 × 1.9 م",
    baseFare: 35000,
    perKm: 800,
  },
  {
    id: "22222222-0000-4000-8000-000000000011",
    kind: "van",
    name: "فان صغير",
    sort: 4,
    sizeCode: "XS",
    capacityKg: 400,
    dims: "1.5 × 1.2 م",
    baseFare: 15000,
    perKm: 400,
  },
  {
    id: "22222222-0000-4000-8000-000000000012",
    kind: "van",
    name: "فان متوسط",
    sort: 5,
    sizeCode: null,
    capacityKg: null,
    dims: null,
    baseFare: 0,
    perKm: 0,
  },
  {
    id: "22222222-0000-4000-8000-000000000013",
    kind: "van",
    name: "فان كبير",
    sort: 6,
    sizeCode: "XL",
    capacityKg: 3500,
    dims: "4.2 × 2.1 م",
    baseFare: 50000,
    perKm: 1000,
  },
] as const;

export const SAMPLE_VEHICLE_IDS = {
  pickupDouble: "33333333-0000-4000-8000-000000000001",
  pickupSingle: "33333333-0000-4000-8000-000000000002",
  vanMedium: "33333333-0000-4000-8000-000000000011",
  vanLarge: "33333333-0000-4000-8000-000000000012",
} as const;

const VEHICLES = [
  {
    id: SAMPLE_VEHICLE_IDS.pickupDouble,
    categoryId: CATEGORIES[1].id,
    name: "بيك أب دبل كابينة",
    plate: "ن ص ر 1234",
    brand: "Toyota",
    model: "Hilux",
    year: 2022,
    color: "أبيض",
    transmission: "manual",
    fuel: "diesel",
    seats: 5,
    cargoKg: 1000,
    status: "available",
    image: "/vehicles/pickup-double.svg",
  },
  {
    id: SAMPLE_VEHICLE_IDS.pickupSingle,
    categoryId: CATEGORIES[0].id,
    name: "بيك أب كابينة",
    plate: "ب ح ر 5678",
    brand: "Isuzu",
    model: "D-Max",
    year: 2021,
    color: "فضي",
    transmission: "manual",
    fuel: "diesel",
    seats: 3,
    cargoKg: 1200,
    status: "available",
    image: "/vehicles/pickup-single.svg",
  },
  {
    id: SAMPLE_VEHICLE_IDS.vanMedium,
    categoryId: CATEGORIES[4].id,
    name: "فان متوسط",
    plate: "ق ط ر 4321",
    brand: "Hyundai",
    model: "H1",
    year: 2023,
    color: "رمادي",
    transmission: "automatic",
    fuel: "benzine",
    seats: 9,
    cargoKg: 800,
    status: "available",
    image: "/vehicles/van-medium.svg",
  },
  {
    id: SAMPLE_VEHICLE_IDS.vanLarge,
    categoryId: CATEGORIES[5].id,
    name: "فان كبير",
    plate: "م ص ر 8765",
    brand: "Mercedes",
    model: "Sprinter",
    year: 2022,
    color: "أبيض",
    transmission: "manual",
    fuel: "diesel",
    seats: 14,
    cargoKg: 1500,
    status: "maintenance",
    image: "/vehicles/van-large.svg",
  },
] as const;

export async function seedCategories() {
  for (const c of CATEGORIES) {
    const rows = await db
      .insert(vehicleCategories)
      .values({ ...c })
      .onConflictDoNothing()
      .returning({ id: vehicleCategories.id });
    report(`category ${c.name}`, rows.length > 0);
  }
}

export async function seedVehicles() {
  for (const { image, ...v } of VEHICLES) {
    const rows = await db
      .insert(vehicles)
      .values({ ...v, branchId: SAMPLE_BRANCH_ID, hasDriverOption: true })
      .onConflictDoNothing()
      .returning({ id: vehicles.id });
    report(`vehicle ${v.name} (${v.plate})`, rows.length > 0);
    // photos only with a newly created vehicle, so re-runs don't duplicate them
    if (rows.length)
      await db.insert(vehicleImages).values({ vehicleId: v.id, url: image, sort: 0, isPrimary: true });
  }
}

/** One global hourly-rental rule, plus a pricier override for the large van. */
export async function seedPricingRules() {
  const rules = [
    {
      id: "44444444-0000-4000-8000-000000000001",
      label: "global rule",
      scope: "global" as const,
      targetId: null,
      tiers: [
        { hours: 1, price: 25000 },
        { hours: 2, price: 45000 },
        { hours: 4, price: 80000 },
        { hours: 8, price: 150000 },
      ],
      dailyPrice: 300000,
      extraHourPrice: 25000,
      weekendMultiplier: 1,
      driverFeePerHour: 5000,
      loaderFeePerPerson: 8000,
      perKmPrice: 500,
      deliveryFee: 10000,
      deposit: 50000,
    },
    {
      id: "44444444-0000-4000-8000-000000000002",
      label: "large van override",
      scope: "vehicle" as const,
      targetId: SAMPLE_VEHICLE_IDS.vanLarge,
      tiers: [
        { hours: 1, price: 35000 },
        { hours: 2, price: 65000 },
        { hours: 4, price: 120000 },
        { hours: 8, price: 220000 },
      ],
      dailyPrice: 450000,
      extraHourPrice: 35000,
      weekendMultiplier: 1.15,
      driverFeePerHour: 7000,
      loaderFeePerPerson: 10000,
      perKmPrice: 700,
      deliveryFee: 15000,
      deposit: 80000,
    },
  ];
  for (const { label, ...rule } of rules) {
    const rows = await db
      .insert(pricingRules)
      .values({ ...rule, minHours: 2, maxHours: 336, bufferMinutes: 30 })
      .onConflictDoNothing()
      .returning({ id: pricingRules.id });
    report(`pricing ${label}`, rows.length > 0);
  }
}
