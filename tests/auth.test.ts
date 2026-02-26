import { sequelize } from '../src/models';
import { registerUser, loginUser } from '../src/services/auth';
import { verifyJwt } from '../src/lib/jwt';

describe('Auth Service', () => {
  const email = `testuser_${Date.now()}@example.com`;
  const name = 'Test User';
  const password = 'P@ssw0rd123';
  let userId: number;

  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.query('DELETE FROM users WHERE email = :email', { replacements: { email } });
    await sequelize.close();
  });

  test('registerUser creates a new user', async () => {
    const res = await registerUser({ name, email, password });
    userId = res.id;
    expect(res).toMatchObject({ name, email, role: 'user' });
    expect(typeof userId).toBe('number');
  });

  test('loginUser returns JWT token', async () => {
    const res = await loginUser({ email, password });
    expect(res.token).toBeTruthy();
    const decoded: any = verifyJwt(res.token);
    expect(Number(decoded.sub)).toBe(userId);
  });

  test('registerUser with same email fails', async () => {
    await expect(registerUser({ name, email, password }))
      .rejects
      .toThrow('Email already registered');
  });

  test('loginUser with wrong password fails', async () => {
    await expect(loginUser({ email, password: 'wrong' }))
      .rejects
      .toThrow('Invalid credentials');
  });
});
