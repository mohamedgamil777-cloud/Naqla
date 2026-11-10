-- «للشركات»: businesses ask for a company account from the website; staff follow up from
-- admin → الشركات. Saved addresses get a default, which the order form fills in by itself.
-- Safe on existing databases: only adds a table and a column.
CREATE TABLE IF NOT EXISTS company_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  monthly_trips text,
  note text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_requests_status_idx ON company_requests(status, created_at);

ALTER TABLE saved_addresses ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
-- at most one default per list (a person, or a whole company)
CREATE UNIQUE INDEX IF NOT EXISTS saved_addresses_one_default_uq ON saved_addresses(owner) WHERE is_default;
