import { NextRequest, NextResponse } from 'next/server';
import { bookSlot } from '../../../../../services/bookings';
import { verifyJwt } from '../../../../../lib/jwt';
import { toUserError } from '../../../../../lib/api-errors';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to book a slot.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    const body = await req.json();
    const spots = Number(body?.spots || 1);

    const res = await bookSlot({ userId: Number(decoded.sub), slotId: Number(params.id), spots });
    return NextResponse.json(res, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to complete your booking right now.') }, { status: 400 });
  }
}
