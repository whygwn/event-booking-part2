import { NextRequest, NextResponse } from 'next/server';
import { Event, Slot, sequelize } from '../../../models';
import { verifyJwt } from '../../../lib/jwt';
import { Op, QueryTypes } from 'sequelize';
import { toUserError } from '../../../lib/api-errors';
import { ensureSchemaUpgrades } from '../../../lib/schema';

export async function GET(req: NextRequest) {
  await ensureSchemaUpgrades();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10', 10), 50);
  const offset = (page - 1) * pageSize;
  const search = searchParams.get('search') || '';
  const userId = Number(searchParams.get('userId') || 0) || null;

  const whereClause: any = {};
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const sort = searchParams.get('sort') || 'date';

  if (sort === 'smart') {
    const replacements: any = { pageSize, offset, search: `%${search}%`, userId };
    const filters = ["e.date >= CURRENT_DATE", "COALESCE(e.occurrence_status, 'active') = 'active'"];
    if (search) {
      filters.push('(e.title ILIKE :search OR e.description ILIKE :search)');
    }
    const whereSql = `WHERE ${filters.join(' AND ')}`;

    const sql = `
      SELECT
        e.*,
        COALESCE(SUM(s.capacity) - SUM(COALESCE(b.taken, 0)), 0) AS available,
        CASE
          WHEN :userId IS NULL THEN 0
          WHEN EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(COALESCE(u.preferences, '[]'::jsonb)) AS pref(value)
            WHERE LOWER(pref.value) = LOWER(COALESCE(e.category, ''))
          ) THEN 1
          ELSE 0
        END AS preference_score
      FROM events e
      JOIN slots s ON s.event_id = e.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(spots),0) AS taken FROM bookings WHERE slot_id = s.id AND status = 'booked'
      ) b ON true
      LEFT JOIN users u ON u.id = :userId
      ${whereSql}
      GROUP BY e.id, u.preferences
      ORDER BY preference_score DESC, e.date ASC, available DESC
      LIMIT :pageSize OFFSET :offset
    `;

    const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
    const countSql = `
      SELECT COUNT(DISTINCT e.id) AS count
      FROM events e
      ${whereSql}
    `;
    const countRes: any = await sequelize.query(countSql, { replacements, type: QueryTypes.SELECT });
    const total = Number(countRes[0]?.count || 0);

    return NextResponse.json({ data: rows, page, pageSize, total });
  }

  whereClause.date = { [Op.gte]: new Date().toISOString().slice(0, 10) };
  whereClause.occurrence_status = 'active';

  const { rows, count } = await Event.findAndCountAll({
    where: whereClause,
    limit: pageSize,
    offset,
    order: [['date', 'ASC']],
  });

  return NextResponse.json({ data: rows, page, pageSize, total: count });
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchemaUpgrades();
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create events.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, date, location, category, start_time, end_time, capacity, total_capacity } = body || {};
    const normalizedCapacity = Number(capacity ?? total_capacity);

    if (!title || !date || !start_time || !end_time || !normalizedCapacity) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date, start_time, end_time, capacity' },
        { status: 400 }
      );
    }

    if (new Date(start_time) >= new Date(end_time)) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }
    if (normalizedCapacity < 1) {
      return NextResponse.json({ error: 'Capacity must be at least 1' }, { status: 400 });
    }

    const created = await sequelize.transaction(async (t) => {
      const event = await Event.create(
        { title, description, date, location, category, created_by: Number(decoded.sub) },
        { transaction: t }
      );

      await Slot.create(
        {
          event_id: Number(event.get('id')),
          start_time: new Date(start_time),
          end_time: new Date(end_time),
          capacity: normalizedCapacity,
        },
        { transaction: t }
      );

      return event;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to create the event right now.') }, { status: 400 });
  }
}
