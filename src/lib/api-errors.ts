export function toUserError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const raw = (error as any)?.message ? String((error as any).message) : '';
  const message = raw.toLowerCase();

  if (!raw) return fallback;

  if (message.includes('violates foreign key constraint') || message.includes('booking_user_id_fkey')) {
    return 'Your session is no longer valid. Please sign in again.';
  }
  if (message.includes('jwt') || message.includes('token') || message.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (message.includes('duplicate key') || message.includes('already registered')) {
    return 'That email is already registered. Please use a different email.';
  }
  if (message.includes('validation')) {
    return 'Some information is invalid. Please check your input and try again.';
  }
  if (message.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('slot not found')) {
    return 'This time slot is no longer available.';
  }
  if (message.includes('booking not found')) {
    return 'Booking not found.';
  }
  if (message.includes('time slot conflict')) {
    return 'This booking overlaps with another booking in your schedule.';
  }
  if (message.includes('connection') || message.includes('econn') || message.includes('timeout')) {
    return 'Unable to connect to the server right now. Please try again.';
  }

  return raw;
}
