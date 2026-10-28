# Database

| Folder | What |
| --- | --- |
| `migrations/` | The single tracked migration history, applied in order by `db/migrate.ts` |
| `seeds/` | Development seed data (`npm run db:seed`) — never run by the migration command |
| `schema/` | Drizzle table definitions (used by the app's queries and by `db:generate` for review) |
| `client.ts`, `repo.ts`, `memory.ts` | Postgres client, data access, and the in-memory store used only outside production |

## Migrations

Applied migrations are recorded in `public.schema_migrations` (file name + checksum), so running the command again is safe.

```bash
npm run db:migrate -- --status   # what is applied / pending (changes nothing)
npm run db:migrate               # apply pending files, each in its own transaction
```

Rules:

1. **Forward-only.** Never edit a file that has been applied; the runner refuses a changed checksum. Add the next numbered file (`0015_….sql`).
2. **Safe for existing data.** Add a column as nullable or with a default, backfill, *then* add `NOT NULL`. Keep `btree_gist`, generated range columns and the booking `EXCLUDE` constraint intact.
3. **Review before applying.** `npm run db:generate` writes Drizzle's suggested SQL to `db/generated/` for review only. Copy the reviewed statements into the next numbered file. Never `drizzle-kit push` to a real database.
4. **Seeds are separate.** Put sample data in `db/seeds/`, not in migrations.

The production database (Supabase) was set up before tracking existed. Its history was baselined on 2026-10-28: 0001 and 0003–0013 recorded as already applied, plus `0014_schema_migrations.sql`.
