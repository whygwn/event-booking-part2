# Deployment Guide

## Required Environment Variables
- `DATABASE_URL` (recommended) or `POSTGRES_URL`
- `JWT_SECRET`

## Optional / Fallback Environment Variables
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `PGSSLMODE=require`
- `RUN_SEED_ON_BUILD=true` (only if you want auto-seed during build)

## Vercel
1. Push repository to GitHub.
2. Import the project into Vercel.
3. Add environment variables in Vercel Project Settings:
   - `DATABASE_URL` = Neon pooled URL (`...-pooler...`).
   - `DATABASE_URL_UNPOOLED` = Neon non-pooling URL (`...ap-southeast-1.aws.neon.tech...`) for schema/seed operations.
   - `JWT_SECRET` = random secret string for production.
   - `RUN_SEED_ON_BUILD=true` to execute `npm run seed` on every build.
4. Deploy.
5. If `RUN_SEED_ON_BUILD` is not enabled, run schema + seed manually:
   - `psql "<DATABASE_URL_UNPOOLED>" -f whyplan-core-schema.txt`
   - `DATABASE_URL="<DATABASE_URL_UNPOOLED>" npm run seed`

## Railway or Fly.io
1. Connect repository.
2. Provision PostgreSQL.
3. Add the same environment variables.
4. Deploy.

## Post-Deployment Checks
1. Run schema SQL on the target database (if not yet applied).
2. Run `npm run seed`.
3. Verify admin login and all scenario accounts.
4. Verify booking, cancellation, undo, and smart sorting flows.
5. Verify recurring event APIs:
   - create recurring series
   - edit one occurrence
   - edit series forward
   - delete one occurrence and delete future series occurrences
6. Optional load check:
   - run `SEED_SCALE=large npm run seed`
   - verify browse/search and booking API responsiveness.
