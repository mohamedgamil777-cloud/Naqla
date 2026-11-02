-- Driver references become real foreign keys (they were bare uuids).
-- ON DELETE RESTRICT: a driver who has trips, orders or payouts cannot be deleted — those rows are
-- the history driver fees and settlements are computed from.
-- Safe for existing rows: references to users that no longer exist are cleared first on the
-- nullable columns; payouts (NOT NULL) to a missing driver keep the constraint NOT VALID so old rows
-- are left alone while new rows are checked.

UPDATE bookings SET driver_id = NULL
WHERE driver_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = bookings.driver_id);

UPDATE delivery_orders SET driver_id = NULL
WHERE driver_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = delivery_orders.driver_id);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS bookings_driver_idx ON bookings(driver_id);

ALTER TABLE delivery_orders
  ADD CONSTRAINT delivery_orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS delivery_orders_driver_idx ON delivery_orders(driver_id);

ALTER TABLE driver_payouts
  ADD CONSTRAINT driver_payouts_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM driver_payouts p WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.driver_id)
  ) THEN
    ALTER TABLE driver_payouts VALIDATE CONSTRAINT driver_payouts_driver_id_fkey;
  END IF;
END $$;

-- Lists that are now paginated / filtered in the database.
CREATE INDEX IF NOT EXISTS delivery_orders_created_idx ON delivery_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS delivery_orders_status_idx ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);
