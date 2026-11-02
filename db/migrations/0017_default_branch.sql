-- Every customer and admin page reads the active branch (working hours, map centre), and staff can
-- only edit an existing one (admin → الإعدادات). A brand-new database gets one placeholder branch so
-- the site works from the first deploy; rename it and set its hours from the settings page.
-- Safe for existing databases: nothing happens when any branch already exists.
INSERT INTO branches (name, lat, lng, working_hours, active)
SELECT 'الفرع الرئيسي', 30.0444, 31.2357, '{"open":8,"close":22}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM branches);
