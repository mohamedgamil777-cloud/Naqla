/**
 * Shared helpers for the mobile API (/api/v1). Mobile clients authenticate with
 * "Authorization: Bearer <token>" (token from POST /api/v1/auth/verify); getSession reads it.
 * All money is integer piastres, all times ISO-8601 UTC.
 */
import { NextResponse } from "next/server";
import { photoVersion } from "@/data/content";
import type { CategoryDTO, DeliveryOrderDTO } from "@/data/types";

export const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

/** Category photo as a URL the app can load (uploaded data: URLs are served by /api/v1/vehicle-image). */
export function vehicleImageUrl(c: Pick<CategoryDTO, "id" | "image">): string | null {
  if (!c.image) return null;
  if (c.image.startsWith("data:")) return `/api/v1/vehicle-image/${c.id}?v=${photoVersion(c.image)}`;
  return c.image;
}

/** Order as the customer sees it (no driver pay, no internal cash fields). */
export function customerOrderJson(o: DeliveryOrderDTO) {
  return {
    code: o.code,
    status: o.status,
    sizeName: o.sizeName,
    sizeCode: o.sizeCode,
    pickupAddress: o.pickupAddress,
    pickupDetails: o.pickupDetails,
    dropoffAddress: o.dropoffAddress,
    dropoffDetails: o.dropoffDetails,
    cargoType: o.cargoType,
    notes: o.notes,
    km: o.km,
    loaders: o.loaders,
    scheduledAt: o.scheduledAt.toISOString(),
    createdAt: o.createdAt.toISOString(),
    driverName: o.driverName,
    driverPhone: o.driverPhone,
    total: o.priceSnapshot.total,
    lines: o.priceSnapshot.lines,
    billing: o.billing,
    rating: o.rating,
    ratingComment: o.ratingComment,
    pod: o.podAt ? { name: o.podName, at: o.podAt.toISOString(), photoUrl: `/api/v1/orders/${o.code}/pod` } : null,
  };
}

/** Order as the assigned driver sees it (their fee, the customer's contact, map pins; no customer price). */
export function driverOrderJson(o: DeliveryOrderDTO) {
  return {
    code: o.code,
    status: o.status,
    sizeName: o.sizeName,
    pickupAddress: o.pickupAddress,
    pickupDetails: o.pickupDetails,
    pickupLat: o.pickupLat,
    pickupLng: o.pickupLng,
    dropoffAddress: o.dropoffAddress,
    dropoffDetails: o.dropoffDetails,
    dropoffLat: o.dropoffLat,
    dropoffLng: o.dropoffLng,
    cargoType: o.cargoType,
    notes: o.notes,
    km: o.km,
    loaders: o.loaders,
    scheduledAt: o.scheduledAt.toISOString(),
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    driverFee: o.driverFee,
    // cash orders: what the driver collects from the customer
    collect: o.billing === "cash" ? o.priceSnapshot.total : 0,
    rating: o.rating,
    pod: o.podAt ? { name: o.podName, at: o.podAt.toISOString(), photoUrl: `/api/v1/orders/${o.code}/pod` } : null,
  };
}
