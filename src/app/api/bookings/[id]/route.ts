import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '../../../../lib/jwt';
import { Booking } from '../../../../models';
import { cancelBooking, undoCancellation } from '../../../../services/bookings';
import { toUserError } from '../../../../lib/api-errors';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to manage your booking.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    const bookingId = Number(params.id);
    const userId = Number(decoded.sub);

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.get('user_id') !== userId) {
      return NextResponse.json({ error: 'You can only manage your own bookings.' }, { status: 403 });
    }

    await cancelBooking({ bookingId, userId });

    return NextResponse.json({ message: 'Booking cancelled successfully' });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to cancel this booking right now.') }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to manage your booking.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    const bookingId = Number(params.id);
    const userId = Number(decoded.sub);
    const body = await req.json();
    const spotsToCancel = Number(body.spotsToCancel);

    if (!spotsToCancel || spotsToCancel < 1) {
      return NextResponse.json({ error: 'Please enter a valid number of spots to cancel.' }, { status: 400 });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.get('user_id') !== userId) {
      return NextResponse.json({ error: 'You can only manage your own bookings.' }, { status: 403 });
    }

    await cancelBooking({ bookingId, userId, spotsToCancel });

    return NextResponse.json({ message: 'Partial cancellation successful' });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to update this booking right now.') }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to manage your booking.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    const bookingId = Number(params.id);
    const userId = Number(decoded.sub);
    const body = await req.json();
    const action = body.action;

    if (action === 'undo') {
      const result = await undoCancellation({ bookingId, userId });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unsupported booking action.' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to restore this booking right now.') }, { status: 400 });
  }
}
