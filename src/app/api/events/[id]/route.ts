import { NextRequest, NextResponse } from 'next/server';
import { Event, Slot, Booking } from '../../../../models';
import { verifyJwt } from '../../../../lib/jwt';
import { toUserError } from '../../../../lib/api-errors';
import { ensureSchemaUpgrades } from '../../../../lib/schema';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchemaUpgrades();
    const event = await Event.findByPk(Number(params.id), {
      include: [
        {
          model: Slot,
          as: 'slots',
          include: [
            {
              model: Booking,
              as: 'bookings',
            },
          ],
        },
      ],
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to load event details right now.') }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchemaUpgrades();
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    const eventId = Number(params.id);
    const event = await Event.findByPk(eventId);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.get('created_by') !== Number(decoded.sub) && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only the event creator or an admin can edit this event.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, date, location, category, start_time, end_time, capacity, total_capacity } = body || {};
    const normalizedCapacity =
      capacity !== undefined || total_capacity !== undefined
        ? Number(capacity ?? total_capacity)
        : undefined;
    const hasSlotPayload =
      start_time !== undefined || end_time !== undefined || normalizedCapacity !== undefined;

    if (!title && !description && !date && !location && !category && !hasSlotPayload) {
      return NextResponse.json({ error: 'At least one field must be provided' }, { status: 400 });
    }

    if (hasSlotPayload) {
      if (!start_time || !end_time || !normalizedCapacity) {
        return NextResponse.json(
          { error: 'To update slot details, provide start_time, end_time, and capacity' },
          { status: 400 }
        );
      }
      if (new Date(start_time) >= new Date(end_time)) {
        return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
      }
      if (normalizedCapacity < 1) {
        return NextResponse.json({ error: 'Capacity must be at least 1' }, { status: 400 });
      }
    }

    const updates: any = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (date) updates.date = date;
    if (location) updates.location = location;
    if (category) updates.category = category;

    const updatedEvent = await Event.sequelize!.transaction(async (t) => {
      if (Object.keys(updates).length > 0) {
        await event.update(updates, { transaction: t });
      }

      if (hasSlotPayload) {
        const existingSlot = await Slot.findOne({
          where: { event_id: eventId },
          order: [['start_time', 'ASC']],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (existingSlot) {
          const bookedSpots = await Booking.sum('spots', {
            where: {
              slot_id: Number(existingSlot.get('id')),
              status: 'booked',
            },
            transaction: t,
          });
          const minRequiredCapacity = Number(bookedSpots || 0);
          if (normalizedCapacity < minRequiredCapacity) {
            throw new Error(
              `Capacity cannot be lower than currently booked spots (${minRequiredCapacity}).`
            );
          }

          await existingSlot.update(
            {
              start_time: new Date(start_time),
              end_time: new Date(end_time),
              capacity: normalizedCapacity,
            },
            { transaction: t }
          );
        } else {
          await Slot.create(
            {
              event_id: eventId,
              start_time: new Date(start_time),
              end_time: new Date(end_time),
              capacity: normalizedCapacity,
            },
            { transaction: t }
          );
        }
      }

      return Event.findByPk(eventId, {
        transaction: t,
        include: [{ model: Slot, as: 'slots' }],
      });
    });

    return NextResponse.json(updatedEvent);
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to update this event right now.') }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchemaUpgrades();
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    const eventId = Number(params.id);
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: Slot,
          as: 'slots',
          include: [
            {
              model: Booking,
              as: 'bookings',
            },
          ],
        },
      ],
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.get('created_by') !== Number(decoded.sub) && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only the event creator or an admin can delete this event.' }, { status: 403 });
    }

    const slots = event.get('slots') as any[];
    const hasActiveBookings = slots.some((slot: any) => {
      const bookings = slot.bookings || [];
      return bookings.some((b: any) => b.status === 'booked' || b.status === 'waitlist');
    });

    if (hasActiveBookings) {
      return NextResponse.json(
        { error: 'Cannot delete event with active bookings. Cancel all bookings first.' },
        { status: 400 }
      );
    }

    await Slot.destroy({ where: { event_id: eventId } });
    await event.destroy();

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to delete this event right now.') }, { status: 400 });
  }
}
