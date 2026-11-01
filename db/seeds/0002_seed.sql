-- Naqla — seed data (realistic sample fleet; replace with real vehicles later).
-- Idempotent-ish: safe to run once on a fresh DB.

-- ---------- branch ----------
INSERT INTO branches (id, name, address, lat, lng, working_hours, active) VALUES
('11111111-1111-1111-1111-111111111111', 'فرع أكتوبر',
 '٦ أكتوبر، الجيزة', 29.9668, 30.9476,
 '{"open":8,"close":22}'::jsonb, true);

-- ---------- categories ----------
INSERT INTO vehicle_categories (id, kind, name, sort) VALUES
('22222222-0000-0000-0000-000000000001','pickup','بيك أب كابينة',1),
('22222222-0000-0000-0000-000000000002','pickup','بيك أب دبل كابينة',2),
('22222222-0000-0000-0000-000000000003','pickup','بيك أب كبير',3),
('22222222-0000-0000-0000-000000000011','van','فان صغير',4),
('22222222-0000-0000-0000-000000000012','van','فان متوسط',5),
('22222222-0000-0000-0000-000000000013','van','فان كبير',6);

-- ---------- vehicles ----------
INSERT INTO vehicles (id, category_id, branch_id, name, plate, brand, model, year, color,
                      transmission, fuel, seats, cargo_kg, has_driver_option, status) VALUES
('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002',
 '11111111-1111-1111-1111-111111111111','بيك أب دبل كابينة','ن ص ر 1234','Toyota','Hilux',2022,'أبيض',
 'manual','diesel',5,1000,true,'available'),
('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111','بيك أب كابينة','ب ح ر 5678','Isuzu','D-Max',2021,'فضي',
 'manual','diesel',3,1200,true,'available'),
('33333333-0000-0000-0000-000000000011','22222222-0000-0000-0000-000000000012',
 '11111111-1111-1111-1111-111111111111','فان متوسط','ق ط ر 4321','Hyundai','H1',2023,'رمادي',
 'automatic','benzine',9,800,true,'available'),
('33333333-0000-0000-0000-000000000012','22222222-0000-0000-0000-000000000013',
 '11111111-1111-1111-1111-111111111111','فان كبير','م ص ر 8765','Mercedes','Sprinter',2022,'أبيض',
 'manual','diesel',14,1500,true,'maintenance');

-- ---------- images (local SVG placeholders in /public/vehicles) ----------
INSERT INTO vehicle_images (vehicle_id, url, sort, is_primary) VALUES
('33333333-0000-0000-0000-000000000001','/vehicles/pickup-double.svg',0,true),
('33333333-0000-0000-0000-000000000002','/vehicles/pickup-single.svg',0,true),
('33333333-0000-0000-0000-000000000011','/vehicles/van-medium.svg',0,true),
('33333333-0000-0000-0000-000000000012','/vehicles/van-large.svg',0,true);

-- ---------- pricing: one global rule + one vehicle override ----------
INSERT INTO pricing_rules (id, scope, target_id, tiers, daily_price, extra_hour_price,
  weekend_multiplier, peak_multiplier, peak_window, holiday_multiplier, holiday_dates,
  driver_fee_per_hour, loader_fee_per_person, per_km_price, delivery_fee, deposit, min_hours, max_hours, buffer_minutes) VALUES
('44444444-0000-0000-0000-000000000001','global',NULL,
 '[{"hours":1,"price":25000},{"hours":2,"price":45000},{"hours":4,"price":80000},{"hours":8,"price":150000}]'::jsonb,
 300000, 25000, 1, 1, NULL, 1, '[]'::jsonb, 5000, 8000, 500, 10000, 50000, 2, 336, 30),
-- Large van (Sprinter) is pricier.
('44444444-0000-0000-0000-000000000002','vehicle','33333333-0000-0000-0000-000000000012',
 '[{"hours":1,"price":35000},{"hours":2,"price":65000},{"hours":4,"price":120000},{"hours":8,"price":220000}]'::jsonb,
 450000, 35000, 1.15, 1, NULL, 1, '[]'::jsonb, 7000, 10000, 700, 15000, 80000, 2, 336, 30);

-- ---------- a welcome promo ----------
INSERT INTO promo_codes (code, type, value, scope, min_value, max_uses, active) VALUES
('ترحيب', 'fixed', 5000, 'all', 20000, 1000, true);

-- ---------- sample bookings (relative to now, Cairo) so the grid is populated ----------
-- Pickup Double Cab booked tomorrow 10:00–14:00.
INSERT INTO bookings (code, vehicle_id, branch_id, starts_at, ends_at, status, with_driver,
  delivery, price_snapshot, contact_name, contact_phone) VALUES
('10001','33333333-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111',
 (date_trunc('day',(now() AT TIME ZONE 'Africa/Cairo')) + interval '1 day 10 hours') AT TIME ZONE 'Africa/Cairo',
 (date_trunc('day',(now() AT TIME ZONE 'Africa/Cairo')) + interval '1 day 14 hours') AT TIME ZONE 'Africa/Cairo',
 'confirmed', false, false,
 '{"hours":4,"subtotal":80000,"discount":0,"vat":0,"total":80000,"deposit":50000,"currency":"EGP","lines":[{"key":"base","labelAr":"سعر العربية","amount":80000}]}'::jsonb,
 'محمد علي','+201001112233'),
-- Medium van booked tomorrow 09:00–11:00.
('10002','33333333-0000-0000-0000-000000000011',
 '11111111-1111-1111-1111-111111111111',
 (date_trunc('day',(now() AT TIME ZONE 'Africa/Cairo')) + interval '1 day 9 hours') AT TIME ZONE 'Africa/Cairo',
 (date_trunc('day',(now() AT TIME ZONE 'Africa/Cairo')) + interval '1 day 11 hours') AT TIME ZONE 'Africa/Cairo',
 'confirmed', true, true,
 '{"hours":2,"subtotal":55000,"discount":0,"vat":0,"total":55000,"deposit":50000,"currency":"EGP","lines":[{"key":"base","labelAr":"سعر العربية","amount":45000},{"key":"driver","labelAr":"السائق","amount":10000}]}'::jsonb,
 'سارة محمود','+201007778899');

-- ---------- settings ----------
INSERT INTO settings (key, value) VALUES
('business', '{"bufferMinutes":30,"minHours":2,"maxHours":336,"advanceDays":30,"nowLeadHours":1,"freeCancelHours":6,"vatRate":0,"currency":"EGP","timezone":"Africa/Cairo","durationOptions":[2,4,6,8,12,24]}'::jsonb),
('company', '{"name":"نقلة","phone":"+201000000000","whatsapp":"+201000000000"}'::jsonb),
('terms', '{"ar":"يجب تقديم بطاقة رقم قومي ورخصة قيادة سارية عند الاستلام. التأمين مسترد بعد فحص العربية."}'::jsonb),
('cancellation', '{"ar":"الإلغاء مجاني حتى ٦ ساعات قبل ميعاد الاستلام."}'::jsonb);
