-- Naqla — phone + password login for every user (customers, drivers, staff).
-- OTP is switched off for now and will return later as a second factor / one-time login code.
-- Additive and safe for existing rows: every new column is nullable or has a default.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash      text,
  ADD COLUMN IF NOT EXISTS password_set_at    timestamptz,
  ADD COLUMN IF NOT EXISTS failed_login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until       timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at  timestamptz;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_failed_login_count_chk CHECK (failed_login_count >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Staff and drivers were added by an admin with a known number → treat those numbers as verified.
-- Customers stay unverified until an agent confirms the number by phone.
UPDATE users SET phone_verified_at = created_at
WHERE role <> 'customer' AND phone_verified_at IS NULL;
