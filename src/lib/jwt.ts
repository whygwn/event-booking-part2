import * as jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signJwt(payload: object, opts?: jwt.SignOptions) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d', ...opts });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, SECRET) as any;
}
