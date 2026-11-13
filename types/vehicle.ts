import type { z } from "zod";
import type { PricingRule } from "@/engines/pricing";
import type {
  selectBranchSchema,
  selectVehicleBlockSchema,
  selectVehicleCategorySchema,
  selectVehicleSchema,
} from "@/db/schema";
import type {
  categoryInputSchema,
  vehicleBlockInputSchema,
  vehicleInputSchema,
} from "@/lib/validation/vehicle";

type VehicleRow = z.infer<typeof selectVehicleSchema>;
type CategoryRow = z.infer<typeof selectVehicleCategorySchema>;
type BranchRow = z.infer<typeof selectBranchSchema>;
type BlockRow = z.infer<typeof selectVehicleBlockSchema>;

export type SizeCode = NonNullable<CategoryRow["sizeCode"]>;

/** A size class / vehicle type. `active` = shown to customers (hidden types stay on old orders). */
export type CategoryDTO = Pick<
  CategoryRow,
  | "id"
  | "kind"
  | "name"
  | "sort"
  | "active"
  | "sizeCode"
  | "capacityKg"
  | "dims"
  | "description"
  | "image"
  | "volumeM3"
  | "bodyType"
  | "features"
  | "baseFare"
  | "perKm"
>;

export type VehicleListItem = Pick<
  VehicleRow,
  "id" | "name" | "categoryId" | "seats" | "cargoKg" | "status"
> & {
  kind: CategoryRow["kind"];
  categoryName: string;
  primaryImage: string | null;
  /** cheapest 1h-equivalent tier for the "من X/ساعة" label (piastres) */
  fromHourlyPiastres: number;
  branchId: string;
  branchName: string;
};

export type VehicleDetail = VehicleListItem &
  Pick<VehicleRow, "brand" | "model" | "year" | "color" | "transmission" | "fuel" | "hasDriverOption"> & {
    images: string[];
    rule: PricingRule;
  };

export type BranchDTO = Pick<BranchRow, "id" | "name" | "address" | "lat" | "lng"> & {
  working: { open: number; close: number };
};

export type BlockDTO = Pick<BlockRow, "id" | "vehicleId" | "startsAt" | "endsAt" | "reason" | "note">;

/** Admin vehicle form, validated (prices in PIASTRES). */
type VehicleForm = z.infer<typeof vehicleInputSchema>;
type VehicleAdminField =
  | "driverId"
  | "ownerIsDriver"
  | "ownerName"
  | "ownerPhone"
  | "ownerNationalId"
  | "ownerPhoto"
  | "licenseNumber"
  | "licenseExpiry"
  | "licensePhoto"
  | "notes";
/** The admin-only fields are optional (left out = no driver, driver owns it, no licence). */
export type VehicleInput = Omit<VehicleForm, VehicleAdminField> &
  Partial<Pick<VehicleForm, VehicleAdminField>> & { branchId?: string };
export type VehiclePricingInput = VehicleInput["pricing"];
export type CategoryInput = Partial<z.infer<typeof categoryInputSchema>> & Pick<CategoryRow, "name" | "kind">;
export type BlockInput = Pick<z.infer<typeof vehicleBlockInputSchema>, "vehicleId" | "reason"> & {
  startsAt: Date;
  endsAt: Date;
  note?: string | null;
};

/** Admin-only vehicle details: driver, owner, licence, notes. Never sent to customers. */
export type VehicleAdminInfo = Pick<
  VehicleRow,
  | "driverId"
  | "ownerIsDriver"
  | "ownerName"
  | "ownerPhone"
  | "ownerNationalId"
  | "ownerPhoto"
  | "licenseNumber"
  | "licenseExpiry"
  | "licensePhoto"
  | "notes"
>;

/** The linked driver as the fleet page shows them (from their staff record). */
export type FleetDriver = {
  id: string;
  name: string;
  phone: string;
  photo: string | null;
  nationalId: string | null;
  drivingLicense: string | null;
  vehicleLicense: string | null;
  available: boolean;
};

/** One card on the admin fleet page. */
export type FleetVehicle = VehicleListItem & {
  plate: string;
  admin: VehicleAdminInfo;
  driver: FleetDriver | null;
};

/** Full editable vehicle (for prefilling the admin edit form). */
export type VehicleEditData = VehicleDetail & {
  plate: string;
  categoryId: string;
  pricing: VehiclePricingInput;
  admin: VehicleAdminInfo;
};
