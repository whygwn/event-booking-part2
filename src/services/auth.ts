import { User } from '../models';
import { hashPassword, verifyPassword } from '../lib/hash';
import { signJwt } from '../lib/jwt';

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  timezone?: string;
  preferences?: string[];
}) {
  const { name, email, password, timezone, preferences } = params;
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new Error('Email already registered');
  }
  const password_hash = await hashPassword(password);
  const user = await User.create({
    name,
    email,
    password_hash,
    timezone: timezone || 'UTC',
    preferences: Array.isArray(preferences) ? preferences : [],
  });
  return { id: user.get('id') as number, name, email, role: user.get('role') as string };
}

export async function loginUser(params: { email: string; password: string }) {
  const { email, password } = params;
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error('Invalid credentials');
  const ok = await verifyPassword(password, user.get('password_hash') as string);
  if (!ok) throw new Error('Invalid credentials');
  const token = signJwt({ sub: user.get('id'), role: user.get('role') });
  return {
    token,
    user: {
      id: user.get('id') as number,
      name: user.get('name') as string,
      email,
      role: user.get('role') as string,
      timezone: user.get('timezone') as string,
    },
  };
}
