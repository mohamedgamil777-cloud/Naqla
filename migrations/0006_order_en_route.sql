-- Naqla — add the "en_route" (السائق في الطريق) order status. Safe to run once.
ALTER TABLE delivery_orders DROP CONSTRAINT IF EXISTS delivery_orders_status_check;
ALTER TABLE delivery_orders ADD CONSTRAINT delivery_orders_status_check
  CHECK (status IN ('new','confirmed','assigned','en_route','completed','cancelled'));
