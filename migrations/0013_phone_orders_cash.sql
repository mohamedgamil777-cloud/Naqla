-- Naqla — phone orders taken by staff + cash handed in per delivery order. Safe to run once.
ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS source           text NOT NULL DEFAULT 'customer' CHECK (source IN ('customer','agent')),
  ADD COLUMN IF NOT EXISTS agent_name       text,
  ADD COLUMN IF NOT EXISTS cash_received    integer,
  ADD COLUMN IF NOT EXISTS cash_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS cash_received_by text;
