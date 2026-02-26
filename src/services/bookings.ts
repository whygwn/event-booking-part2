import { Booking, Slot } from '../models';
import { sequelize } from '../models';
import { ensureSchemaUpgrades } from '../lib/schema';

export async function bookSlot(params: { userId: number; slotId: number; spots: number }) {
  await ensureSchemaUpgrades();
  const { userId, slotId, spots } = params;
  if (spots < 1 || spots > 5) throw new Error('Invalid spots');

  return sequelize.transaction(async (t) => {
    const slot = await Slot.findByPk(slotId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!slot) throw new Error('Slot not found');

    const [conflicts]: any = await sequelize.query(
      `SELECT COUNT(*) as count FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       WHERE b.user_id = :userId
       AND b.status = 'booked'
       AND s.id != :slotId
       AND s.start_time < (SELECT end_time FROM slots WHERE id = :slotId)
       AND s.end_time > (SELECT start_time FROM slots WHERE id = :slotId)`,
      { replacements: { userId, slotId }, transaction: t }
    );

    if (conflicts[0]?.count > 0) {
      throw new Error('Time slot conflict: You already have a booking at this time');
    }

    const [eventBookingCount]: any = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id
       WHERE b.user_id = :userId
       AND b.status = 'booked'
       AND s.event_id = :eventId`,
      {
        replacements: { userId, eventId: Number(slot.get('event_id')) },
        transaction: t,
      }
    );

    if (eventBookingCount[0]?.count > 0) {
      throw new Error('You already have a booking for this event');
    }

    const [result] = await sequelize.query(
      'SELECT COALESCE(SUM(spots),0) AS taken FROM bookings WHERE slot_id = :slotId AND status = :status',
      { replacements: { slotId, status: 'booked' }, transaction: t }
    );
    const taken = Number((result as any)[0]?.taken ?? 0);
    const capacity = Number(slot.get('capacity'));
    const remaining = capacity - taken;

    if (remaining > 0 && remaining < spots) {
      throw new Error(`Not enough spots available. Requested: ${spots}, Available: ${remaining}.`);
    }

    const status: 'booked' | 'waitlist' = remaining >= spots ? 'booked' : 'waitlist';

    const booking = await Booking.create(
      { user_id: userId, slot_id: slotId, spots, status },
      { transaction: t }
    );

    return { id: booking.get('id') as number, status };
  });
}

export async function cancelBooking(params: { bookingId: number; userId: number; spotsToCancel?: number }) {
  await ensureSchemaUpgrades();
  const { bookingId, userId, spotsToCancel } = params;

  return sequelize.transaction(async (t) => {
    const booking = await Booking.findByPk(bookingId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) throw new Error('Booking not found');
    if (booking.get('user_id') !== userId) throw new Error('Unauthorized');

    const currentSpots = Number(booking.get('spots'));
    const slotId = Number(booking.get('slot_id'));

    if (spotsToCancel) {
      if (spotsToCancel >= currentSpots) {
        throw new Error('Use full cancellation instead');
      }
      const newSpots = currentSpots - spotsToCancel;
      await booking.update({ spots: newSpots, updated_at: new Date() }, { transaction: t });

      await promoteFromWaitlist(slotId, spotsToCancel, t);
    } else {
      await booking.update({ status: 'cancelled', cancelled_at: new Date(), updated_at: new Date() }, { transaction: t });

      await promoteFromWaitlist(slotId, currentSpots, t);
    }
  });
}

export async function undoCancellation(params: { bookingId: number; userId: number }) {
  await ensureSchemaUpgrades();
  const { bookingId, userId } = params;
  const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

  return sequelize.transaction(async (t) => {
    const booking = await Booking.findByPk(bookingId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) throw new Error('Booking not found');
    if (booking.get('user_id') !== userId) throw new Error('Unauthorized');
    if (booking.get('status') !== 'cancelled') throw new Error('Booking is not cancelled');

    const cancelledAt = booking.get('cancelled_at') as Date;
    if (!cancelledAt) throw new Error('Cannot restore this booking');

    const now = new Date();
    const timeSinceCancellation = now.getTime() - new Date(cancelledAt).getTime();

    if (timeSinceCancellation > GRACE_PERIOD_MS) {
      throw new Error('Undo period expired (24 hours). Cannot restore this booking.');
    }

    const slotId = Number(booking.get('slot_id'));
    const spots = Number(booking.get('spots'));

    const slot = await Slot.findByPk(slotId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!slot) throw new Error('Slot not found');

    const [result]: any = await sequelize.query(
      'SELECT COALESCE(SUM(spots),0) AS taken FROM bookings WHERE slot_id = :slotId AND status = :status',
      { replacements: { slotId, status: 'booked' }, transaction: t }
    );

    const taken = Number(result[0]?.taken ?? 0);
    const capacity = Number(slot.get('capacity'));
    const remaining = capacity - taken;

    if (remaining < spots) {
      throw new Error(
        `Not enough spots available. Required: ${spots}, Available: ${remaining}. Your booking is still pending recovery.`
      );
    }

    await booking.update({ status: 'booked', cancelled_at: null, updated_at: new Date() }, { transaction: t });

    return { message: 'Booking restored successfully!' };
  });
}

async function promoteFromWaitlist(slotId: number, spotsFreed: number, transaction: any) {
  const slot = await Slot.findByPk(slotId, { transaction });
  if (!slot) return;

  const capacity = Number(slot.get('capacity'));

  const [result]: any = await sequelize.query(
    'SELECT COALESCE(SUM(spots),0) AS taken FROM bookings WHERE slot_id = :slotId AND status = :status',
    { replacements: { slotId, status: 'booked' }, transaction }
  );
  const taken = Number(result[0]?.taken ?? 0);
  let available = capacity - taken;

  const waitlist = await Booking.findAll({
    where: { slot_id: slotId, status: 'waitlist' },
    order: [['created_at', 'ASC']],
    transaction,
  });

  for (const waitlistBooking of waitlist) {
    const spotsNeeded = Number(waitlistBooking.get('spots'));
    if (available >= spotsNeeded) {
      await waitlistBooking.update({ status: 'booked', updated_at: new Date() }, { transaction });
      try {
        const Notification = require('../models').Notification;
        await Notification.create({
          user_id: Number(waitlistBooking.get('user_id')),
          type: 'waitlist_promoted',
          payload: { slot_id: slotId, spots: spotsNeeded },
          read: false,
        }, { transaction });
      } catch (err) {}
      available -= spotsNeeded;
    }
  }
}
