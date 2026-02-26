import { NextRequest, NextResponse } from 'next/server';
import { Slot, Event } from '../../../../../models';
import { verifyJwt } from '../../../../../lib/jwt';
import { toUserError } from '../../../../../lib/api-errors';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage event slots.' }, { status: 403 });
    }

    const eventId = Number(params.id);
    const event = await Event.findByPk(eventId);
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.get('created_by') !== Number(decoded.sub) && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only the event creator or an admin can add slots.' }, { status: 403 });
    }

    const body = await req.json();
    const { start_time, end_time, capacity } = body || {};

    if (!start_time || !end_time || !capacity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (new Date(start_time) >= new Date(end_time)) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    if (capacity < 1) {
      return NextResponse.json({ error: 'Capacity must be at least 1' }, { status: 400 });
    }

    const slot = await Slot.create({
      event_id: eventId,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      capacity: Number(capacity),
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to create the slot right now.') }, { status: 400 });
  }
}
