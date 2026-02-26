import { NextRequest, NextResponse } from 'next/server';
import { Notification } from '../../../models';
import { verifyJwt } from '../../../lib/jwt';
import { toUserError } from '../../../lib/api-errors';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Please sign in to view notifications.' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const decoded: any = verifyJwt(token);

    const notes = await Notification.findAll({ where: { user_id: Number(decoded.sub) }, order: [['created_at', 'DESC']], limit: 50 });
    return NextResponse.json(notes);
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to load notifications right now.') }, { status: 400 });
  }
}
