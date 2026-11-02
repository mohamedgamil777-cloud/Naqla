# Database

| Folder        | What                                                                                                                                                                                                                                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/` | The single tracked migration history, applied in order by `db/migrate.ts`                                                                                                                                                                                                                                                                                                           |
| `seeds/`      | Seed steps, one file per domain, run in order by `db/seed.ts` (`npm run db:seed`) — never run by the migration command                                                                                                                                                                                                                                                              |
| `schema/`     | One Drizzle table per file (relations for `db.query` all in `schema/relations.ts`), each with its drizzle-zod `select…/insert…/update…Schema` (row types in `types/` are inferred from these)                                                                                                                                                                                       |
| `client.ts`   | The Postgres client (opened on first use)                                                                                                                                                                                                                                                                                                                                           |
| `lib/`        | Data access, one module per entity/feature (`delivery-orders`, `bookings`, `drivers`, `companies`, …), functions imported by name: `import { searchDeliveryOrders } from "@/db/lib/delivery-orders"`. `lib/shared.ts` holds the joins, row → DTO mappers and paging helpers. Lists are filtered and paginated in the database; only the CSV export reads whole tables (`listAll…`). |

Postgres is the only data store — local development and tests use their own local databases.

## Local setup

```bash
# one-time: two empty local databases
createdb naqla_dev && createdb naqla_test

# .env.local       (gitignored, read by `next dev` and the db:* scripts)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/naqla_dev
# .env.test.local  (gitignored, read by `npm test`)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/naqla_test

npm run db:migrate   # apply migrations to naqla_dev
npm run db:seed      # SEED_ADMIN_* admin + sample fleet, prices, bookings and staff logins (local databases only; safe to re-run)
npm test             # migrates naqla_test, empties it, runs the suite

# start over on a clean database
npm run db:reset     # drop everything in naqla_dev and re-apply all migrations
npm run db:fresh     # db:reset + db:seed
```

The test setup refuses any database whose name does not end in `_test`, because every run empties it. The seed and reset scripts refuse any database that is not on this machine (the seed's staff passwords are public, below; a reset deletes all data).

## Migrations

Applied migrations are recorded in `public.schema_migrations` (file name + checksum), so running the command again is safe.

```bash
npm run db:migrate -- --status   # what is applied / pending (changes nothing)
npm run db:migrate               # apply pending files, each in its own transaction
```

Rules:

1. **Forward-only.** Never edit a file that has been applied; the runner refuses a changed checksum. Add the next numbered file (`0015_….sql`).
2. **Safe for existing data.** Add a column as nullable or with a default, backfill, _then_ add `NOT NULL`. Keep `btree_gist`, generated range columns and the booking `EXCLUDE` constraint intact.
3. **Review before applying.** `npm run db:generate` writes Drizzle's suggested SQL to `db/generated/` for review only. Copy the reviewed statements into the next numbered file. Never `drizzle-kit push` to a real database.
4. **Seeds are separate.** Put sample data in `db/seeds/`, not in migrations.

The production database (Supabase) was set up before tracking existed. Its history was baselined on 2026-10-28: 0001 and 0003–0013 recorded as already applied, plus `0014_schema_migrations.sql`.

## Accounts and logins

Everyone signs in with **phone + password** (OTP is switched off for now and returns later as a second factor).

- **Customers** create their account on `/login` (or in the app). Customers from the OTP era create a password the same way. The number then shows as «رقم غير مؤكد» until an agent confirms it in admin → العملاء.
- **Drivers and staff** get their password from an admin (admin → الموظفين → كلمة السر).
- **First super-admin:** set `SEED_ADMIN_PHONE` and `SEED_ADMIN_PASSWORD` (8+ characters, not a common password) in Vercel. The server creates the account before a staff login if it's missing. It never overwrites an existing password, so changing `SEED_ADMIN_PASSWORD` later does not change the login of an account that already exists. To run it by hand: `npm run db:seed:admin` (needs `DATABASE_URL`; prints why an account was refused).
- **Lockout:** 5 wrong passwords lock an account for 15 minutes.

`npm run db:seed` creates sample staff logins on a local database (never production). The `SEED_ADMIN_*` account is seeded first; a sample login whose phone is already taken by it is skipped:

| Role        | Phone       | Password        |
| ----------- | ----------- | --------------- |
| super_admin | 01000000001 | dev-admin-1234  |
| agent       | 01000000002 | dev-agent-1234  |
| driver      | 01000000003 | dev-driver-1234 |
