/**
 * Drizzle relations for the relational query API (`db.query.<table>.findMany({ with })`).
 * Every relation lives here, next to the table modules; foreign keys stay on the tables.
 */
import { relations } from "drizzle-orm";
import { bookings } from "./bookings";
import { branches } from "./branches";
import { companies } from "./companies";
import { companyMembers } from "./company-members";
import { companyPayments } from "./company-payments";
import { deliveryOrders } from "./delivery-orders";
import { driverPayouts } from "./driver-payouts";
import { payments } from "./payments";
import { users } from "./users";
import { vehicleCategories } from "./vehicle-categories";
import { vehicleImages } from "./vehicle-images";
import { vehicles } from "./vehicles";

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  vehicle: one(vehicles, { fields: [bookings.vehicleId], references: [vehicles.id] }),
  branch: one(branches, { fields: [bookings.branchId], references: [branches.id] }),
  driver: one(users, { fields: [bookings.driverId], references: [users.id] }),
  payments: many(payments),
}));

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  company: one(companies, { fields: [companyMembers.companyId], references: [companies.id] }),
}));

export const companyPaymentsRelations = relations(companyPayments, ({ one }) => ({
  company: one(companies, { fields: [companyPayments.companyId], references: [companies.id] }),
}));

export const deliveryOrdersRelations = relations(deliveryOrders, ({ one }) => ({
  driver: one(users, { fields: [deliveryOrders.driverId], references: [users.id] }),
  category: one(vehicleCategories, {
    fields: [deliveryOrders.categoryId],
    references: [vehicleCategories.id],
  }),
  company: one(companies, { fields: [deliveryOrders.companyId], references: [companies.id] }),
}));

export const driverPayoutsRelations = relations(driverPayouts, ({ one }) => ({
  driver: one(users, { fields: [driverPayouts.driverId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({ one }) => ({
  vehicle: one(vehicles, { fields: [vehicleImages.vehicleId], references: [vehicles.id] }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  category: one(vehicleCategories, { fields: [vehicles.categoryId], references: [vehicleCategories.id] }),
  branch: one(branches, { fields: [vehicles.branchId], references: [branches.id] }),
  images: many(vehicleImages),
}));
