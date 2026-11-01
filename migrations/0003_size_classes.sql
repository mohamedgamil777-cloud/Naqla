-- Naqla — add size-class fields to vehicle categories (A→B booking flow).
-- Safe to run once on an existing database.

ALTER TABLE vehicle_categories
  ADD COLUMN IF NOT EXISTS size_code   text CHECK (size_code IN ('XS','S','M','L')),
  ADD COLUMN IF NOT EXISTS capacity_kg integer,
  ADD COLUMN IF NOT EXISTS dims        text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image       text,
  ADD COLUMN IF NOT EXISTS base_fare   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_km      integer NOT NULL DEFAULT 0;
