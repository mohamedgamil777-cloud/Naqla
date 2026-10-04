-- Naqla — initial schema.
-- Authoritative DDL. Keep in sync with src/db/schema.ts.
-- Money = integer piastres. Timestamps = timestamptz (stored UTC, shown Africa/Cairo).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- required for the no-overlap EXCLUDE

-- ---------- updated_at helper ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ---------- users / customers ----------
CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text NOT NULL,
  name       text,
  role       text NOT NULL DEFAULT 'customer'
             CHECK (role IN ('customer','super_admin','fleet_mgr','agent','driver','finance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_phone_uq ON users(phone);
CREATE TRIGGER users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  national_id text,
  verified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- branches ----------
CREATE TABLE branches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  address       text,
  lat           real,
  lng           real,
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER branches_updated BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- categories / vehicles ----------
CREATE TABLE vehicle_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL CHECK (kind IN ('pickup','van')),
  name       text NOT NULL,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER categories_updated BEFORE UPDATE ON vehicle_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE vehicles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       uuid NOT NULL REFERENCES vehicle_categories(id),
  branch_id         uuid NOT NULL REFERENCES branches(id),
  name              text NOT NULL,
  plate             text NOT NULL,
  brand             text,
  model             text,
  year              integer,
  color             text,
  transmission      text DEFAULT 'manual' CHECK (transmission IN ('manual','automatic')),
  fuel              text DEFAULT 'benzine' CHECK (fuel IN ('benzine','diesel','gas','electric')),
  seats             integer,
  cargo_kg          integer,
  has_driver_option boolean NOT NULL DEFAULT true,
  status            text NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','reserved','rented','maintenance','inactive')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vehicles_plate_uq ON vehicles(plate);
CREATE INDEX vehicles_category_idx ON vehicles(category_id);
CREATE INDEX vehicles_branch_idx ON vehicles(branch_id);
CREATE TRIGGER vehicles_updated BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE vehicle_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url        text NOT NULL,
  sort       integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- pricing ----------
CREATE TABLE pricing_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope               text NOT NULL CHECK (scope IN ('global','category','vehicle')),
  target_id           uuid,
  tiers               jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_price         integer NOT NULL DEFAULT 0,
  extra_hour_price    integer NOT NULL DEFAULT 0,
  weekend_multiplier  real NOT NULL DEFAULT 1,
  peak_multiplier     real NOT NULL DEFAULT 1,
  peak_window         jsonb,
  holiday_multiplier  real NOT NULL DEFAULT 1,
  holiday_dates       jsonb NOT NULL DEFAULT '[]'::jsonb,
  driver_fee_per_hour integer NOT NULL DEFAULT 0,
  loader_fee_per_person integer NOT NULL DEFAULT 0,
  per_km_price        integer NOT NULL DEFAULT 0,
  delivery_fee        integer NOT NULL DEFAULT 0,
  deposit             integer NOT NULL DEFAULT 0,
  min_hours           integer NOT NULL DEFAULT 2,
  max_hours           integer NOT NULL DEFAULT 336,
  buffer_minutes      integer NOT NULL DEFAULT 30,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pricing_scope_idx ON pricing_rules(scope, target_id);
CREATE TRIGGER pricing_updated BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE promo_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('pct','fixed')),
  value      integer NOT NULL,
  scope      text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','category','vehicle')),
  target_id  uuid,
  min_value  integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_to   timestamptz,
  max_uses   integer,
  used       integer NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX promo_code_uq ON promo_codes(code);
CREATE TRIGGER promo_updated BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- vehicle blocks (maintenance / manual blocks) ----------
CREATE TABLE vehicle_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz NOT NULL,
  reason     text NOT NULL DEFAULT 'block' CHECK (reason IN ('maintenance','block')),
  note       text,
  period     tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX vehicle_blocks_vehicle_idx ON vehicle_blocks(vehicle_id);
CREATE INDEX vehicle_blocks_period_gist ON vehicle_blocks USING gist (vehicle_id, period);
CREATE TRIGGER vehicle_blocks_updated BEFORE UPDATE ON vehicle_blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- bookings (the core) ----------
CREATE TABLE bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL,
  customer_id      uuid REFERENCES customers(id),
  vehicle_id       uuid NOT NULL REFERENCES vehicles(id),
  branch_id        uuid NOT NULL REFERENCES branches(id),
  driver_id        uuid,
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','ready','active','completed','cancelled')),
  with_driver      boolean NOT NULL DEFAULT false,
  delivery         boolean NOT NULL DEFAULT false,
  loaders          integer NOT NULL DEFAULT 0,
  source           text NOT NULL DEFAULT 'customer' CHECK (source IN ('customer','agent')),
  agent_name       text,
  delivery_address jsonb,
  price_snapshot   jsonb NOT NULL,
  contact_name     text,
  contact_phone    text,
  notes            text,
  -- Generated occupancy range; the EXCLUDE constraint acts on this.
  period           tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE UNIQUE INDEX bookings_code_uq ON bookings(code);
CREATE INDEX bookings_vehicle_idx ON bookings(vehicle_id);
CREATE INDEX bookings_customer_idx ON bookings(customer_id);
CREATE INDEX bookings_starts_idx ON bookings(starts_at);
CREATE TRIGGER bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- THE double-booking guarantee: no two active bookings of the same vehicle may
-- have overlapping periods. Enforced by Postgres, race-proof, un-bypassable.
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    vehicle_id WITH =,
    period     WITH &&
  ) WHERE (status IN ('pending','confirmed','ready','active'));

-- A booking may not be created over a maintenance/block window for that vehicle.
CREATE OR REPLACE FUNCTION booking_not_blocked() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('pending','confirmed','ready','active') AND EXISTS (
    SELECT 1 FROM vehicle_blocks b
    WHERE b.vehicle_id = NEW.vehicle_id
      AND b.period && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'VEHICLE_BLOCKED' USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER bookings_block_guard
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION booking_not_blocked();

-- A maintenance/block may not be created over an existing active booking.
CREATE OR REPLACE FUNCTION block_not_over_booking() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings bk
    WHERE bk.vehicle_id = NEW.vehicle_id
      AND bk.status IN ('pending','confirmed','ready','active')
      AND bk.period && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'BLOCK_OVER_BOOKING' USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER blocks_booking_guard
  BEFORE INSERT OR UPDATE ON vehicle_blocks
  FOR EACH ROW EXECUTE FUNCTION block_not_over_booking();

-- ---------- payments / documents ----------
CREATE TABLE payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  method          text NOT NULL CHECK (method IN ('cash','card','online')),
  kind            text NOT NULL CHECK (kind IN ('rent','deposit')),
  amount_piastres integer NOT NULL,
  status          text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded')),
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_booking_idx ON payments(booking_id);

CREATE TABLE documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text NOT NULL,
  type       text NOT NULL CHECK (type IN ('national_id','license')),
  url        text NOT NULL,
  expiry     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_phone_idx ON documents(phone);

-- ---------- OTP / settings / audit ----------
CREATE TABLE otp_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_phone_idx ON otp_codes(phone);

CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER settings_updated BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE audit_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
