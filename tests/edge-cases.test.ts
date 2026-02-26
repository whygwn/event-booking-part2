import { sequelize, Event, Slot, Booking } from '../src/models';
import { registerUser } from '../src/services/auth';
import { bookSlot, cancelBooking, undoCancellation } from '../src/services/bookings';

function dateOnly(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

describe('Edge cases (Layer 4.2)', () => {
  const u1Email = `edge_u1_${Date.now()}@example.com`;
  const u2Email = `edge_u2_${Date.now()}@example.com`;
  const u3Email = `edge_u3_${Date.now()}@example.com`;
  let u1: number;
  let u2: number;
  let u3: number;
  let eventId: number;
  let slotId: number;
  let b1Id: number;
  let b2Id: number;

  beforeAll(async () => {
    await sequelize.authenticate();
    u1 = (await registerUser({ name: 'Edge User 1', email: u1Email, password: 'password123' })).id;
    u2 = (await registerUser({ name: 'Edge User 2', email: u2Email, password: 'password123' })).id;
    u3 = (await registerUser({ name: 'Edge User 3', email: u3Email, password: 'password123' })).id;

    const event = await Event.create({
      title: 'Edge Case Event',
      description: 'Test edge interactions',
      date: dateOnly(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
      location: 'Lab Test Bay',
      created_by: u1,
      occurrence_status: 'active',
    });
    eventId = Number(event.get('id'));

    const slot = await Slot.create({
      event_id: eventId,
      start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      capacity: 5,
    });
    slotId = Number(slot.get('id'));
  });

  afterAll(async () => {
    if (slotId) {
      await sequelize.query('DELETE FROM bookings WHERE slot_id = :slotId', { replacements: { slotId } });
      await sequelize.query('DELETE FROM slots WHERE id = :slotId', { replacements: { slotId } });
    }
    if (eventId) {
      await sequelize.query('DELETE FROM events WHERE id = :eventId', { replacements: { eventId } });
    }
    await sequelize.query('DELETE FROM users WHERE email IN (:u1Email, :u2Email, :u3Email)', {
      replacements: { u1Email, u2Email, u3Email },
    });
    try {
      await sequelize.close();
    } catch {}
  });

  test('partial cancellation promotes waitlist and undo fails when capacity is already taken', async () => {
    const b1 = await bookSlot({ userId: u1, slotId, spots: 5 });
    b1Id = b1.id;
    expect(b1.status).toBe('booked');

    const b2 = await bookSlot({ userId: u2, slotId, spots: 2 });
    b2Id = b2.id;
    expect(b2.status).toBe('waitlist');

    await cancelBooking({ bookingId: b1Id, userId: u1, spotsToCancel: 2 });
    const promoted = await Booking.findByPk(b2Id);
    expect(promoted?.get('status')).toBe('booked');

    await cancelBooking({ bookingId: b1Id, userId: u1 });

    const b3 = await bookSlot({ userId: u3, slotId, spots: 3 });
    expect(b3.status).toBe('booked');

    await expect(undoCancellation({ bookingId: b1Id, userId: u1 })).rejects.toThrow(
      'Not enough spots available.'
    );
  });
});
