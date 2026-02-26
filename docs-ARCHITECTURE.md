# Architecture and Design Notes

## High-Level Design
- Application framework: Next.js App Router.
- Database: PostgreSQL.
- ORM: Sequelize.
- Runtime model: frontend and API routes in a single project.

## Core Data Model

### users
- `id`, `name`, `email`, `password_hash`, `role`, `timezone`, `preferences`, `created_at`

### events
- `id`, `title`, `description`, `date`, `location`, `category`, `created_by`, `recurrence_series_id`, `occurrence_date`, `occurrence_status`, `modified_from_series`, `created_at`

### recurrence_series
- `id`, `title`, `description`, `location`, `category`, `created_by`, `frequency`, `interval_count`, `weekdays`, `start_date`, `until_date`, `start_time`, `end_time`, `capacity`, `timezone`, `series_version`, `created_at`, `updated_at`

### slots
- `id`, `event_id`, `start_time`, `end_time`, `capacity`, `created_at`

### bookings
- `id`, `user_id`, `slot_id`, `spots`, `status`, `cancelled_at`, `created_at`, `updated_at`

### notifications
- `id`, `user_id`, `type`, `payload`, `read`, `created_at`

## Booking Integrity and Concurrency
- Booking actions run inside DB transactions.
- Slot rows are locked during critical booking operations.
- Capacity is calculated consistently within the same transaction.
- Waitlist promotion is FIFO and triggered during cancellation flows.

## Business Rules
- Booking quantity must be 1-5.
- A user cannot hold multiple active bookings in the same event.
- Time-overlap conflicts across events are blocked.
- Undo cancellation works only within a 24-hour window.

## Sorting Strategy
Smart sorting order:
1. preference and category match
2. date ascending
3. remaining capacity descending

## Timezone Strategy
- Slot times are stored in UTC.
- Display uses user/client timezone formatting in UI.

## Realtime Availability
- Event detail view polls availability updates every 5 seconds.
- Remaining spots are shown per slot and updated continuously.

## Recurring Event Strategy
- Selected approach: `Materialize all occurrences` (Approach A).
- Reason: keeps booking/waitlist/conflict logic simple because each occurrence is a normal event + slot row.
- Trade-off: updating series can touch many rows; mitigated with index coverage and effective-date updates.
- Future-series edits preserve occurrences that already hold active bookings/waitlist entries.

## Load and Query Performance
- Added indexes:
  - `events(date)`
  - `events(occurrence_status)`
  - `events(recurrence_series_id)`
  - `slots(event_id, start_time)`
  - `slots(start_time, end_time)`
  - `bookings(slot_id, status)`
  - `bookings(user_id, status)`
  - `bookings(created_at)`

## Edge Cases and Handling
1. Concurrent booking for the same slot:
- Protected with transaction boundaries and slot row locks.

2. Booking the same event more than once:
- Blocked at service level by checking active bookings across event slots.

3. Overlapping schedule conflicts:
- Rejected when requested slot overlaps with another active booking.

4. Capacity race and overflow:
- Remaining capacity is recalculated inside the transaction before booking status is assigned.

5. Waitlist ordering:
- Promotion is FIFO based on booking creation timestamp.

6. Cancellation undo safety:
- Undo is limited to a 24-hour grace window and current capacity availability.

7. Session and identity drift:
- Token/session errors and DB constraint messages are normalized to user-facing API errors.

8. Timezone boundary changes:
- UTC storage + local rendering avoids cross-day display confusion for users in different regions.
