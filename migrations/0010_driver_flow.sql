-- Naqla — driver flow: "arrived at pickup" status, order details for the driver,
-- and the driver's availability toggle. Safe to run once.
ALTER TABLE delivery_orders DROP CONSTRAINT IF EXISTS delivery_orders_status_check;
ALTER TABLE delivery_orders ADD CONSTRAINT delivery_orders_status_check
  CHECK (status IN ('new','confirmed','assigned','en_route','arrived','completed','cancelled'));

ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS pickup_details  text,
  ADD COLUMN IF NOT EXISTS dropoff_details text,
  ADD COLUMN IF NOT EXISTS cargo_type      text,
  ADD COLUMN IF NOT EXISTS notes           text;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true;
