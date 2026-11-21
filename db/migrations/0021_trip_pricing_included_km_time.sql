-- Trip pricing (Mohamed's Pricing sheet, 2026-11-21): the base fare covers the first km and the first
-- minutes of the trip; per-km is charged only after the included km, and every started 30 minutes
-- after the included time costs a fixed amount. Orders keep the trip time, load size and floors they
-- were priced with. (Floor fees, day/time multipliers and holidays live in the app_content settings.)
ALTER TABLE vehicle_categories ADD COLUMN IF NOT EXISTS included_km integer NOT NULL DEFAULT 0;
ALTER TABLE vehicle_categories ADD COLUMN IF NOT EXISTS included_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE vehicle_categories ADD COLUMN IF NOT EXISTS per_extra_half_hour integer NOT NULL DEFAULT 0;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS trip_minutes integer;
-- what is moved and the floors at each end (floors without elevator are charged by load size)
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS load_size text;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS pickup_floor integer;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS pickup_elevator boolean NOT NULL DEFAULT false;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS dropoff_floor integer;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS dropoff_elevator boolean NOT NULL DEFAULT false;

-- Every type: the base fare covers the first 5 km and 2 hours.
UPDATE vehicle_categories SET included_km = 5, included_minutes = 120;

-- Prices in piastres (EGP × 100). Matched by type name.
-- فان صغير / سوزوكي: 350 base, 8 per km, 60 per extra 30 min
UPDATE vehicle_categories SET base_fare = 35000, per_km = 800, per_extra_half_hour = 6000
  WHERE name LIKE '%فان صغير%' OR name LIKE '%سوزوكي%';
-- دبابة: 550 base, 12 per km, 90 per extra 30 min
UPDATE vehicle_categories SET base_fare = 55000, per_km = 1200, per_extra_half_hour = 9000
  WHERE name LIKE '%دباب%';
-- فان كبير / جامبو: 800 base, 15 per km, 120 per extra 30 min
UPDATE vehicle_categories SET base_fare = 80000, per_km = 1500, per_extra_half_hour = 12000
  WHERE name LIKE '%فان كبير%' OR name LIKE '%جامبو%';
