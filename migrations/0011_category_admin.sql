-- Naqla — full car-type admin: hide/show types for customers, allow an XL size. Safe to run once.
ALTER TABLE vehicle_categories ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE vehicle_categories DROP CONSTRAINT IF EXISTS vehicle_categories_size_code_check;
ALTER TABLE vehicle_categories ADD CONSTRAINT vehicle_categories_size_code_check
  CHECK (size_code IS NULL OR size_code IN ('XS','S','M','L','XL'));
