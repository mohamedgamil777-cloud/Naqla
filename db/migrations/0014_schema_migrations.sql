-- Naqla — migration history table used by db/migrate.ts (one tracked history).
-- The runner also creates it on first use; this file makes it part of the recorded history.
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       text PRIMARY KEY,
  checksum   text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Not for the public API: the app and the migration runner use direct Postgres connections.
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
