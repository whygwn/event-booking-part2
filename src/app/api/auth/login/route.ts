import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '../../../../services/auth';
import { toUserError } from '../../../../lib/api-errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json({ error: 'Please enter both email and password.' }, { status: 400 });
    }
    const res = await loginUser({ email, password });
    return NextResponse.json(res, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to sign you in right now.') }, { status: 400 });
  }
}
