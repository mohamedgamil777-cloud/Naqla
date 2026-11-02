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
export type VehicleInput = z.infer<typeof vehicleInputSchema> & { branchId?: string };
export type VehiclePricingInput = VehicleInput["pricing"];
export type CategoryInput = Partial<z.infer<typeof categoryInputSchema>> & Pick<CategoryRow, "name" | "kind">;
export type BlockInput = Pick<z.infer<typeof vehicleBlockInputSchema>, "vehicleId" | "reason"> & {
  startsAt: Date;
  endsAt: Date;
  note?: string | null;
};

/** Full editable vehicle (for prefilling the admin edit form). */
export type VehicleEditData = VehicleDetail & {
  plate: string;
  categoryId: string;
  pricing: VehiclePricingInput;
};
