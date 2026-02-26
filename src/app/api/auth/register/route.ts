import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '../../../../services/auth';
import { toUserError } from '../../../../lib/api-errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, timezone, preferences } = body || {};
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
    }
    const res = await registerUser({ name, email, password, timezone, preferences });
    return NextResponse.json(res, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: toUserError(e, 'Unable to create your account right now.') }, { status: 400 });
  }
}
