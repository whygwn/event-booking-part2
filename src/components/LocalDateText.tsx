"use client";

import { formatEventDate, formatEventTime, getClientTimezone } from '@/lib/timezone';

export default function LocalDateText({
  date,
  mode = 'date',
}: {
  date: Date | string;
  mode?: 'date' | 'time';
}) {
  const timezone = getClientTimezone();
  const parsed = new Date(date);
  return <>{mode === 'time' ? formatEventTime(parsed, timezone) : formatEventDate(parsed, timezone)}</>;
}
