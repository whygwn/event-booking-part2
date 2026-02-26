import { NextRequest, NextResponse } from 'next/server';
import { sequelize } from '../../../../models';
import { QueryTypes } from 'sequelize';
import { toUserError } from '../../../../lib/api-errors';
import { ensureSchemaUpgrades } from '../../../../lib/schema';

export async function GET(req: NextRequest) {
  try {
    await ensureSchemaUpgrades();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10', 10), 50);
    const offset = (page - 1) * pageSize;
    const search = searchParams.get('search') || '';
    const userId = Number(searchParams.get('userId') || 0) || null;

    const filters = ["e.date >= CURRENT_DATE", "COALESCE(e.occurrence_status, 'active') = 'active'"];
    if (search) {
      filters.push('(e.title ILIKE :search OR e.description ILIKE :search)');
    }
    const whereSql = `WHERE ${filters.join(' AND ')}`;
    const replacements: any = { pageSize, offset, search: `%${search}%`, userId };

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
  } catch (error: unknown) {
    return NextResponse.json({ error: toUserError(error, 'Unable to load smart-sorted events right now.') }, { status: 500 });
  }
}
