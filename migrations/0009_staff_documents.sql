-- Naqla — staff/driver documents: national id, personal photo, driving & vehicle license. Safe to run once.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS national_id      text,
  ADD COLUMN IF NOT EXISTS photo            text,
  ADD COLUMN IF NOT EXISTS driving_license  text,
  ADD COLUMN IF NOT EXISTS vehicle_license  text;
