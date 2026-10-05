-- Naqla — customer ratings on delivery orders. Safe to run once.
ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS rating          integer CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_comment  text;
