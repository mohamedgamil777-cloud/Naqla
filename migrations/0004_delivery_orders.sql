-- Naqla — A→B delivery orders. Safe to run once on an existing database.

CREATE TABLE IF NOT EXISTS delivery_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL,
  category_id     uuid REFERENCES vehicle_categories(id),
  size_name       text NOT NULL,
  size_code       text,
  pickup_address  text,
  dropoff_address text,
  pickup_lat      real,
  pickup_lng      real,
  dropoff_lat     real,
  dropoff_lng     real,
  km              real NOT NULL DEFAULT 0,
  loaders         integer NOT NULL DEFAULT 0,
  scheduled_at    timestamptz NOT NULL,
  driver_id       uuid,
  status          text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','confirmed','assigned','completed','cancelled')),
  price_snapshot  jsonb NOT NULL,
  contact_name    text,
  contact_phone   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS delivery_orders_code_uq ON delivery_orders(code);
CREATE INDEX IF NOT EXISTS delivery_orders_phone_idx ON delivery_orders(contact_phone);
