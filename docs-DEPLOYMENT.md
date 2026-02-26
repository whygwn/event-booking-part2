# Deployment Guide

## Required Environment Variables
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `JWT_SECRET`

## Vercel
1. Push repository to GitHub.
2. Import the project into Vercel.
3. Add all required environment variables.
4. Deploy.

## Railway or Fly.io
1. Connect repository.
2. Provision PostgreSQL.
3. Add the same environment variables.
4. Deploy.

## Post-Deployment Checks
1. Run schema SQL on the target database.
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
