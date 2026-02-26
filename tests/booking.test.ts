import { sequelize, Event, Slot } from '../src/models';
import { registerUser } from '../src/services/auth';
import { bookSlot } from '../src/services/bookings';
import { ensureSchemaUpgrades } from '../src/lib/schema';

function isoDateOnly(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

describe('Booking Service', () => {
  const email = `booker_${Date.now()}@example.com`;
  const email2 = `booker2_${Date.now()}@example.com`;
  const name = 'Booker';
  const password = 'P@ssw0rd123';
  let userId: number;
  let user2Id: number;
  let eventId: number;
  let slotId: number;

  beforeAll(async () => {
    await sequelize.authenticate();
    await ensureSchemaUpgrades();
    const reg = await registerUser({ name, email, password });
    userId = reg.id;
    const reg2 = await registerUser({ name: `${name} 2`, email: email2, password });
    user2Id = reg2.id;

    const event = await Event.create({
      title: 'Test Event',
      description: 'Testing',
      date: isoDateOnly(),
      location: 'Online',
      created_by: userId,
    });
    eventId = event.get('id') as number;

    const slot = await Slot.create({
      event_id: eventId,
      start_time: new Date(),
      end_time: new Date(Date.now() + 60 * 60 * 1000),
      capacity: 5,
    });
    slotId = slot.get('id') as number;
  });

  afterAll(async () => {
    if (slotId) {
      await sequelize.query('DELETE FROM bookings WHERE slot_id = :slotId', { replacements: { slotId } });
      await sequelize.query('DELETE FROM slots WHERE id = :slotId', { replacements: { slotId } });
    }
    if (eventId) {
      await sequelize.query('DELETE FROM events WHERE id = :eventId', { replacements: { eventId } });
    }
    await sequelize.query('DELETE FROM users WHERE email = :email', { replacements: { email } });
    await sequelize.query('DELETE FROM users WHERE email = :email2', { replacements: { email2 } });
    try {
      await sequelize.close();
    } catch {}
  });

  test('first booking within capacity is booked', async () => {
    const res = await bookSlot({ userId, slotId, spots: 3 });
    expect(res.status).toBe('booked');
  });

  test('booking request above remaining spots is rejected', async () => {
    await expect(bookSlot({ userId: user2Id, slotId, spots: 3 })).rejects.toThrow(
      'Not enough spots available.'
    );
  });
});
