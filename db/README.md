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

## Accounts and logins

Everyone signs in with **phone + password** (OTP is switched off for now and returns later as a second factor).

- **Customers** create their account on `/login` (or in the app). Customers from the OTP era create a password the same way. The number then shows as «رقم غير مؤكد» until an agent confirms it in admin → العملاء.
- **Drivers and staff** get their password from an admin (admin → الموظفين → كلمة السر).
- **First super-admin:** set `SEED_ADMIN_PHONE` and `SEED_ADMIN_PASSWORD` in Vercel. The server creates the account at startup if missing. It never overwrites an existing password. To run it by hand: `npm run db:seed:admin` (needs `DATABASE_URL`).
- **Lockout:** 5 wrong passwords lock an account for 15 minutes.

Local development (in-memory store only, never production) has sample logins:

| Role | Phone | Password |
| --- | --- | --- |
| super_admin | 01000000001 | dev-admin-1234 |
| agent | 01000000002 | dev-agent-1234 |
| driver | 01000000003 | dev-driver-1234 |
