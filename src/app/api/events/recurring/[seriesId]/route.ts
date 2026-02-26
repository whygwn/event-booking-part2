import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '../../../../../lib/jwt';
import { toUserError } from '../../../../../lib/api-errors';
import { deleteSeries, editSeriesForward } from '../../../../../services/recurring';

export async function PATCH(req: NextRequest, { params }: { params: { seriesId: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can edit recurring events.' }, { status: 403 });
    }

    const body = await req.json();
    const result = await editSeriesForward({
      userId: Number(decoded.sub),
      seriesId: Number(params.seriesId),
      effectiveDate: body?.effectiveDate,
      title: body?.title,
      description: body?.description,
      location: body?.location,
      category: body?.category,
      frequency: body?.frequency,
      intervalCount: body?.intervalCount !== undefined ? Number(body.intervalCount) : undefined,
      weekdays: Array.isArray(body?.weekdays) ? body.weekdays.map(Number) : undefined,
      untilDate: body?.untilDate,
      startTime: body?.startTime,
      endTime: body?.endTime,
      capacity: body?.capacity !== undefined ? Number(body.capacity) : undefined,
      timezone: body?.timezone,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to update recurring series right now.') }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { seriesId: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete recurring events.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('fromDate') || undefined;
    const result = await deleteSeries({
      userId: Number(decoded.sub),
      seriesId: Number(params.seriesId),
      fromDate,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to delete recurring series right now.') }, { status: 400 });
  }
}
