-- Vehicle types: more customer-facing details (box volume, body type, a list of what fits).
-- Fleet vehicles: the driver who works the vehicle, the owner (when not the driver), the vehicle
-- licence and admin notes. Safe on existing databases: only adds nullable columns / defaults.
ALTER TABLE vehicle_categories ADD COLUMN IF NOT EXISTS volume_m3 real;
ALTER TABLE vehicle_categories ADD COLUMN IF NOT EXISTS body_type text;
ALTER TABLE vehicle_categories ADD COLUMN IF NOT EXISTS features text;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_is_driver boolean NOT NULL DEFAULT true;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_national_id text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_number text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_expiry date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS notes text;
CREATE INDEX IF NOT EXISTS vehicles_driver_idx ON vehicles(driver_id);
