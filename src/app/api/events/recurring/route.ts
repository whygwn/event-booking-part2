import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '../../../../lib/jwt';
import { toUserError } from '../../../../lib/api-errors';
import { createRecurringSeries } from '../../../../services/recurring';
import { RecurrenceSeries } from '../../../../models';
import { ensureSchemaUpgrades } from '../../../../lib/schema';

export async function GET(req: NextRequest) {
  try {
    await ensureSchemaUpgrades();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || 10)));
    const offset = (page - 1) * pageSize;

    const { rows, count } = await RecurrenceSeries.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset,
    });
    return NextResponse.json({ data: rows, page, pageSize, total: count });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to load recurring series right now.') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create recurring events.' }, { status: 403 });
    }

    const body = await req.json();
    const result = await createRecurringSeries({
      userId: Number(decoded.sub),
      title: body?.title,
      description: body?.description,
      location: body?.location,
      category: body?.category,
      frequency: body?.frequency,
      intervalCount: Number(body?.intervalCount || 1),
      weekdays: Array.isArray(body?.weekdays) ? body.weekdays.map(Number) : [],
      startDate: body?.startDate,
      untilDate: body?.untilDate,
      startTime: body?.startTime,
      endTime: body?.endTime,
      capacity: Number(body?.capacity),
      timezone: body?.timezone || 'UTC',
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to create recurring series right now.') }, { status: 400 });
  }
}
