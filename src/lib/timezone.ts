import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export function formatEventDateTime(date: Date, timezone: string = 'UTC'): string {
  try {
    const zonedDate = toZonedTime(new Date(date), timezone);
    return formatInTimeZone(zonedDate, timezone, 'MMM dd, yyyy h:mm a');
  } catch {
    return new Date(date).toLocaleString();
  }
}

export function formatEventDate(date: Date, timezone: string = 'UTC'): string {
  try {
    const zonedDate = toZonedTime(new Date(date), timezone);
    return formatInTimeZone(zonedDate, timezone, 'MMM dd, yyyy');
  } catch {
    return new Date(date).toLocaleDateString();
  }
}

export function formatEventTime(date: Date, timezone: string = 'UTC'): string {
  try {
    const zonedDate = toZonedTime(new Date(date), timezone);
    return formatInTimeZone(zonedDate, timezone, 'h:mm a');
  } catch {
    return new Date(date).toLocaleTimeString();
  }
}

export function getClientTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
