# Event Booking Platform

A production-style event booking application built with Next.js, PostgreSQL, and Sequelize.

## Live Links
- Live demo: https://event-booking-part2.vercel.app/
- Loom walkthrough (3-5 min): none

## Tech Choices
- Next.js App Router for a single frontend + API codebase with fast iteration.
- PostgreSQL for transactional consistency and strong relational modeling.
- Sequelize for ORM ergonomics plus raw SQL flexibility where needed.
- Tailwind + shadcn/ui for fast, consistent UI implementation.

### Considered but not selected
- Prisma: better type ergonomics, but Sequelize was already integrated with the booking transaction logic.
- WebSocket stack: polling was enough for the current scope and timeline.
- Separate backend service: unnecessary overhead for this submission.

## Feature Coverage

### Layer 1
- Authentication with registration, login, password hashing, and protected booking actions.
- Event CRUD with role/ownership checks.
- Upcoming event browsing with search and pagination.
- Booking 1-5 spots with capacity checks and UI confirmation.
- Double-booking prevention at event level.
- User booking history with full cancellation.

### Layer 2
- Multi-slot events with independent slot capacity.
- Full and partial cancellation.
- Waitlist with FIFO auto-promotion.
- In-app promotion notifications.
- Time overlap conflict detection.
- Real-time slot availability refresh with polling.

### Layer 3
- Concurrent booking protection using transaction + row locks.
- Undo cancellation with a 24-hour grace period.
- UTC storage with local timezone rendering.
- Smart event sorting by preference match, date, then remaining capacity.
- Role-based access in schema, API, and UI.

### Layer 4
- Recurring events (materialized occurrence approach):
  - Daily/weekly/monthly recurrence generation.
  - Single-occurrence edit/cancel without mutating the full series.
  - Series-forward edits from an effective date.
  - Delete one occurrence or cancel all future occurrences in a series.
- Extended automated tests for recurring flow and hard booking edge cases.
- Performance-ready schema upgrades with targeted indexes and optional large seed mode.

## Trade-offs
- Polling (5 seconds) instead of WebSockets: simpler implementation, higher API traffic under load.
- Schema-first SQL without full migration history: fast for this scope, weaker long-term change management.
- JWT in localStorage: practical for MVP, less secure than hardened cookie/session flows.

### Production risks
- Read-heavy endpoints may need Redis caching.
- Single database setup will need scaling strategy for higher traffic.
- Notifications are in-app only; no background delivery channel yet.

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 12+

### Run locally
1. Install dependencies
```bash
npm install
```

2. Create database and apply schema
```bash
createdb whygwn_db
psql -d whygwn_db -f whyplan-core-schema.txt
```

3. Configure environment
```bash
cp .env.example .env
```
Set values in `.env`:
```env
PGHOST=/var/run/postgresql
PGPORT=5432
PGUSER=whygwn
PGPASSWORD=your_db_password
PGDATABASE=whygwn_db
JWT_SECRET=dev-secret
NODE_ENV=development
```

4. Seed test data
```bash
npm run seed
```

5. Start the app
```bash
npm run dev
```

6. Open in browser
- http://localhost:3000

### Useful scripts
```bash
npm run seed
npm run validate
npm run test
npx tsc --noEmit
# optional high-volume dataset:
SEED_SCALE=large npm run seed
```

## Test Credentials

### Admin
- `admin@example.com` / `admin123`

### Scenario users
- Scenario 1 (full slot and waitlist):
  - `fullslot1@test.com` / `test123`
  - `waitlist1@test.com` / `test123`
  - `waitlist2@test.com` / `test123`
  - `waitlist3@test.com` / `test123`
- Scenario 2 (busy user):
  - `busyuser@test.com` / `test123`
- Scenario 3 (multi-slot event):
  - Event title: `Multi-Slot Ocean Discovery Day`
- Scenario 4 (cancellation chain):
  - `promoted@test.com` / `test123`
- Scenario 5 (time conflict):
  - `conflict@test.com` / `test123`

### General users
- `user1@example.com` through `user299@example.com`
- Password for all: `password123`

## Seed Script Guarantees
- At least 100 events and 300 users.
- At least 30 past events and 70 upcoming events.
- All five required scenarios are generated out of the box.
- Dataset theme is maritime tourism events.

## Edge Cases and Handling
1. Concurrent last-spot booking:
- Handling: transaction + row lock ensures only one request gets the final capacity; others are waitlisted or rejected safely.
- Implementation: `src/services/bookings.ts`.

2. Double booking in the same event:
- Handling: user cannot hold multiple active bookings within one event across slots.
- Implementation: `src/services/bookings.ts`.

3. Time overlap across different events:
- Handling: booking is blocked with a clear conflict error when slot times overlap.
- Implementation: `src/services/bookings.ts`.

4. Capacity overflow attempts:
- Handling: requested spots above available capacity are not confirmed as booked.
- Implementation: `src/services/bookings.ts`.

5. Waitlist promotion order:
- Handling: FIFO promotion is applied when spots are released.
- Implementation: `src/services/bookings.ts`.

6. Undo cancellation after state changes:
- Handling: undo works only within 24 hours and only if capacity is still available; otherwise fails gracefully.
- Implementation: `src/services/bookings.ts`, `src/app/api/bookings/[id]/route.ts`.

7. Stale session or invalid token:
- Handling: API returns clear sign-in prompts; client redirects or shows user-friendly errors.
- Implementation: API routes + `src/lib/api-errors.ts`.

8. Foreign key failures from stale user IDs:
- Handling: low-level DB errors are translated into understandable session messages.
- Implementation: `src/lib/api-errors.ts`.

9. Timezone date-boundary shifts:
- Handling: all slot times are stored in UTC and rendered in user/client local timezone.
- Implementation: `src/lib/timezone.ts`, event/booking UI pages.

10. Realtime stale availability in active sessions:
- Handling: polling refresh updates remaining spots while users stay on event pages.
- Implementation: `src/components/EventSlotsRealtime.tsx`.

## Manual Verification Notes
- This flow has been tested manually: when an event slot is full, a user cancels, and the freed spots are taken by another user, clicking undo on the cancelled booking is handled gracefully.
- The system returns:
  `Not enough spots available. Required: 5, Available: 0. Your booking is still pending recovery.`
- This rule has also been tested manually in Admin Events:
  - Increasing slot capacity is allowed.
  - Reducing slot capacity below currently booked spots is blocked by the API with a validation error.
- This booking capacity rule has been tested manually:
  - If only 1 spot remains and a user requests more than 1 spot, the booking is rejected.
  - The API returns a clear message such as:
    `Not enough spots available. Requested: 2, Available: 1.`

## API Summary
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/events`
- `GET /api/events/smart`
- `POST /api/events`
- `GET /api/events/:id`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `POST /api/events/:id/slots`
- `POST /api/slots/:id/book`
- `GET /api/bookings`
- `DELETE /api/bookings/:id`
- `PATCH /api/bookings/:id`
- `PUT /api/bookings/:id` (undo cancellation)
- `GET /api/notifications`
- `GET /api/events/recurring`
- `POST /api/events/recurring`
- `PATCH /api/events/recurring/:seriesId`
- `DELETE /api/events/recurring/:seriesId`
- `PATCH /api/events/recurring/:seriesId/occurrences/:eventId`
- `DELETE /api/events/recurring/:seriesId/occurrences/:eventId`

## Recurring Usage (No UI Yet)
- Catatan: UI khusus recurring event belum sempat diimplementasikan. Fitur recurring saat ini digunakan via API.

### Step-by-step (tanpa UI)
1. Login admin dan ambil JWT token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

2. Buat recurring series (contoh Senin dan Rabu jam 09:00)
```bash
curl -X POST http://localhost:3000/api/events/recurring \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Morning Yoga",
    "description":"Recurring class",
    "location":"Bali",
    "category":"Wellness",
    "frequency":"weekly",
    "weekdays":[1,3],
    "intervalCount":1,
    "startDate":"2026-03-01",
    "untilDate":"2026-05-31",
    "startTime":"09:00",
    "endTime":"10:00",
    "capacity":20,
    "timezone":"UTC"
  }'
```

3. Lihat daftar recurring series
```bash
curl "http://localhost:3000/api/events/recurring?page=1&pageSize=10"
```

4. Edit satu occurrence (cancel satu tanggal)
```bash
curl -X PATCH http://localhost:3000/api/events/recurring/<SERIES_ID>/occurrences/<EVENT_ID> \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"action":"cancel"}'
```

5. Edit series ke depan dari tanggal tertentu
```bash
curl -X PATCH http://localhost:3000/api/events/recurring/<SERIES_ID> \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "effectiveDate":"2026-04-01",
    "title":"Morning Yoga Updated",
    "capacity":25,
    "startTime":"08:30",
    "endTime":"10:00"
  }'
```

6. Hapus satu occurrence
```bash
curl -X DELETE http://localhost:3000/api/events/recurring/<SERIES_ID>/occurrences/<EVENT_ID> \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```

7. Hapus seluruh future occurrences dalam satu series (past occurrence tetap)
```bash
curl -X DELETE "http://localhost:3000/api/events/recurring/<SERIES_ID>?fromDate=2026-04-01" \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```

## What You'd Improve
1. Replace localStorage JWT with secure cookie-based auth and refresh flow.
2. Upgrade realtime updates from polling to WebSocket/SSE.
3. Add Redis caching for event and slot reads.
4. Add migration tooling and CI-level schema checks.
5. Expand integration and concurrency tests against isolated test databases.
6. Add observability (error tracking, metrics, structured logs).
