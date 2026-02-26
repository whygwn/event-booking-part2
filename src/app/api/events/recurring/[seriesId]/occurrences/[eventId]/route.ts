import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '../../../../../../../lib/jwt';
import { toUserError } from '../../../../../../../lib/api-errors';
import { deleteOccurrence, editOccurrence } from '../../../../../../../services/recurring';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { seriesId: string; eventId: string } }
) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can edit recurring events.' }, { status: 403 });
    }

    const body = await req.json();
    const action = body?.action === 'cancel' ? 'cancel' : 'update';
    const result = await editOccurrence({
      userId: Number(decoded.sub),
      seriesId: Number(params.seriesId),
      eventId: Number(params.eventId),
      action,
      title: body?.title,
      description: body?.description,
      location: body?.location,
      category: body?.category,
      occurrenceDate: body?.occurrenceDate,
      startTime: body?.startTime,
      endTime: body?.endTime,
      capacity: body?.capacity !== undefined ? Number(body.capacity) : undefined,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to update this occurrence right now.') }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { seriesId: string; eventId: string } }
) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete recurring events.' }, { status: 403 });
    }

    const result = await deleteOccurrence({
      userId: Number(decoded.sub),
      seriesId: Number(params.seriesId),
      eventId: Number(params.eventId),
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to delete this occurrence right now.') }, { status: 400 });
  }
}
