-- Naqla — driver payouts (تسديدات) + business expenses (نثريات). Safe to run once.
CREATE TABLE IF NOT EXISTS driver_payouts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id  uuid NOT NULL,
  amount     integer NOT NULL,
  method     text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','bank','wallet')),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_payouts_driver_idx ON driver_payouts(driver_id);

CREATE TABLE IF NOT EXISTS expenses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount     integer NOT NULL,
  category   text NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
