import { NextResponse } from 'next/server';
import { verifyJwt } from '../../../lib/jwt';
import { Booking, Slot, Event } from '../../../models';
import { toUserError } from '../../../lib/api-errors';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Please sign in to view your bookings.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
    }

    const userId = (decoded as any).sub;

    const bookings = await Booking.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Slot,
          as: 'slot',
          include: [
            {
              model: Event,
              as: 'event',
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return NextResponse.json(bookings);
  } catch (error: unknown) {
    return NextResponse.json({ error: toUserError(error, 'Unable to load your bookings right now.') }, { status: 500 });
  }
}
