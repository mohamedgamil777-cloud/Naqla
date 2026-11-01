-- Naqla — B2B phase 1: companies + members, company payments (monthly billing),
-- saved addresses, proof of delivery + billing on orders. Safe to run once.
CREATE TABLE IF NOT EXISTS companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  phone         text,
  tax_number    text,
  address       text,
  discount_pct  integer NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  billing       text NOT NULL DEFAULT 'cash' CHECK (billing IN ('cash','monthly')),
  credit_limit  integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  phone       text NOT NULL,
  name        text,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS company_members_phone_uq ON company_members(phone);
CREATE INDEX IF NOT EXISTS company_members_company_idx ON company_members(company_id);

CREATE TABLE IF NOT EXISTS company_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount      integer NOT NULL,
  method      text NOT NULL DEFAULT 'bank' CHECK (method IN ('cash','bank','wallet')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_payments_company_idx ON company_payments(company_id);

CREATE TABLE IF NOT EXISTS saved_addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner       text NOT NULL,
  label       text NOT NULL,
  address     text NOT NULL,
  details     text,
  lat         real,
  lng         real,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_addresses_owner_idx ON saved_addresses(owner);

ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing    text NOT NULL DEFAULT 'cash' CHECK (billing IN ('cash','account')),
  ADD COLUMN IF NOT EXISTS pod_name   text,
  ADD COLUMN IF NOT EXISTS pod_photo  text,
  ADD COLUMN IF NOT EXISTS pod_at     timestamptz;
CREATE INDEX IF NOT EXISTS delivery_orders_company_idx ON delivery_orders(company_id);
