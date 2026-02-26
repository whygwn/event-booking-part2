import { sequelize, Event, Slot } from '../src/models';
import { registerUser } from '../src/services/auth';
import { bookSlot } from '../src/services/bookings';
import { createRecurringSeries, editOccurrence, editSeriesForward, deleteSeries } from '../src/services/recurring';

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextWeekday(base: Date, weekday: number): Date {
  const out = new Date(base);
  out.setUTCHours(0, 0, 0, 0);
  const delta = (weekday - out.getUTCDay() + 7) % 7 || 7;
  out.setUTCDate(out.getUTCDate() + delta);
  return out;
}

describe('Recurring events (Layer 4.1)', () => {
  const adminEmail = `rec_admin_${Date.now()}@example.com`;
  const userEmail = `rec_user_${Date.now()}@example.com`;
  let adminId: number;
  let userId: number;
  let seriesId: number;

  beforeAll(async () => {
    await sequelize.authenticate();
    const admin = await registerUser({ name: 'Recurring Admin', email: adminEmail, password: 'password123' });
    adminId = admin.id;
    await sequelize.query(`UPDATE users SET role = 'admin' WHERE id = :id`, { replacements: { id: adminId } });

    const user = await registerUser({ name: 'Recurring User', email: userEmail, password: 'password123' });
    userId = user.id;
  });

  afterAll(async () => {
    if (seriesId) {
      await sequelize.query(`DELETE FROM bookings WHERE slot_id IN (
        SELECT s.id FROM slots s JOIN events e ON e.id = s.event_id WHERE e.recurrence_series_id = :sid
      )`, { replacements: { sid: seriesId } });
      await sequelize.query(`DELETE FROM slots WHERE event_id IN (
        SELECT id FROM events WHERE recurrence_series_id = :sid
      )`, { replacements: { sid: seriesId } });
      await sequelize.query(`DELETE FROM events WHERE recurrence_series_id = :sid`, { replacements: { sid: seriesId } });
      await sequelize.query(`DELETE FROM recurrence_series WHERE id = :sid`, { replacements: { sid: seriesId } });
    }
    await sequelize.query(`DELETE FROM users WHERE email IN (:adminEmail, :userEmail)`, {
      replacements: { adminEmail, userEmail },
    });
    try {
      await sequelize.close();
    } catch {}
  });

  test('create recurring series, edit one occurrence, then edit series forward', async () => {
    const firstMonday = nextWeekday(new Date(), 1);
    const until = new Date(firstMonday);
    until.setUTCDate(until.getUTCDate() + 21);

    const created = await createRecurringSeries({
      userId: adminId,
      title: 'Morning Sea Yoga',
      description: 'Recurring sea-side yoga session',
      location: 'Bali Marina',
      category: 'Wellness',
      frequency: 'weekly',
      weekdays: [1, 3],
      intervalCount: 1,
      startDate: dateOnly(firstMonday),
      untilDate: dateOnly(until),
      startTime: '09:00',
      endTime: '10:30',
      capacity: 20,
      timezone: 'UTC',
    });

    seriesId = created.seriesId;
    expect(created.occurrenceCount).toBeGreaterThanOrEqual(4);

    const occurrences = await Event.findAll({
      where: { recurrence_series_id: seriesId, occurrence_status: 'active' },
      include: [{ model: Slot, as: 'slots' }],
      order: [['occurrence_date', 'ASC']],
    });
    expect(occurrences.length).toBe(created.occurrenceCount);

    const targetOccurrence = occurrences[0];
    const cancelRes = await editOccurrence({
      userId: adminId,
      seriesId,
      eventId: Number(targetOccurrence.get('id')),
      action: 'cancel',
    });
    expect(cancelRes.message).toContain('cancelled');

    const remaining = await Event.findAll({
      where: { recurrence_series_id: seriesId, occurrence_status: 'active' },
      include: [{ model: Slot, as: 'slots' }],
      order: [['occurrence_date', 'ASC']],
    });

    const bookedOccurrence: any = remaining[0];
    const bookedSlotId = Number((bookedOccurrence as any).slots[0].id);
    const bookingResult = await bookSlot({ userId, slotId: bookedSlotId, spots: 2 });
    expect(['booked', 'waitlist']).toContain(bookingResult.status);

    const effectiveDate = String(remaining[0].get('occurrence_date'));
    const editRes = await editSeriesForward({
      userId: adminId,
      seriesId,
      effectiveDate,
      title: 'Morning Sea Yoga Updated',
      capacity: 25,
      startTime: '08:30',
      endTime: '10:00',
    });

    expect(editRes.appliedChanges).toBeGreaterThan(0);
    expect(editRes.preservedOccurrencesWithBookings).toBeGreaterThanOrEqual(1);
  });

  test('delete series cancels future occurrences and active bookings', async () => {
    const deleteRes = await deleteSeries({
      userId: adminId,
      seriesId,
      fromDate: new Date().toISOString().slice(0, 10),
    });
    expect(deleteRes.cancelledOccurrences).toBeGreaterThanOrEqual(1);

    const activeFuture = await Event.count({
      where: {
        recurrence_series_id: seriesId,
        occurrence_status: 'active',
      },
    });
    expect(activeFuture).toBe(0);

    const [activeBookingsResult]: any = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id
       JOIN events e ON e.id = s.event_id
       WHERE e.recurrence_series_id = :seriesId
       AND b.status IN ('booked', 'waitlist')`,
      { replacements: { seriesId } }
    );
    expect(Number(activeBookingsResult[0]?.count || 0)).toBe(0);
  });
});
