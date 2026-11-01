-- Naqla — per-delivery driver fee (what the driver earns, pre-agreed by governorate). Safe to run once.
ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS driver_fee integer NOT NULL DEFAULT 0;
