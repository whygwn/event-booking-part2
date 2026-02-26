import { Op } from 'sequelize';
import { Event, RecurrenceSeries, Slot, Booking, sequelize } from '../models';
import { ensureSchemaUpgrades } from '../lib/schema';

type Frequency = 'daily' | 'weekly' | 'monthly';

type CreateRecurringSeriesParams = {
  userId: number;
  title: string;
  description?: string;
  location?: string;
  category?: string;
  frequency: Frequency;
  intervalCount?: number;
  weekdays?: number[];
  startDate: string;
  untilDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  timezone?: string;
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function normalizeTime(time: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`;
  throw new Error('Invalid time format. Use HH:mm or HH:mm:ss.');
}

function combineDateAndTimeUtc(dateOnly: string, time: string): Date {
  const safeTime = normalizeTime(time);
  return new Date(`${dateOnly}T${safeTime}.000Z`);
}

function normalizeWeekdays(weekdays?: number[]): number[] {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return [];
  const mapped = weekdays
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v))
    .map((v) => (v === 7 ? 0 : v))
    .filter((v) => v >= 0 && v <= 6);
  return Array.from(new Set(mapped)).sort((a, b) => a - b);
}

function monthDiff(start: Date, current: Date): number {
  return (current.getUTCFullYear() - start.getUTCFullYear()) * 12 + (current.getUTCMonth() - start.getUTCMonth());
}

function generateOccurrenceDates(input: {
  startDate: string;
  untilDate: string;
  frequency: Frequency;
  intervalCount: number;
  weekdays?: number[];
}): string[] {
  const start = parseDateOnly(input.startDate);
  const end = parseDateOnly(input.untilDate);
  const intervalCount = Math.max(1, Number(input.intervalCount || 1));
  const weekdays = normalizeWeekdays(input.weekdays);
  const maxOccurrences = 2000;

  if (start > end) throw new Error('Start date must be before or equal to until date.');

  const out: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (input.frequency === 'daily') {
      const daysFromStart = Math.floor((cursor.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      if (daysFromStart % intervalCount !== 0) continue;
      out.push(toDateOnly(cursor));
    } else if (input.frequency === 'weekly') {
      const weekday = cursor.getUTCDay();
      const activeDays = weekdays.length > 0 ? weekdays : [start.getUTCDay()];
      if (!activeDays.includes(weekday)) continue;
      const weeksFromStart = Math.floor((cursor.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksFromStart % intervalCount !== 0) continue;
      out.push(toDateOnly(cursor));
    } else if (input.frequency === 'monthly') {
      if (cursor.getUTCDate() !== start.getUTCDate()) continue;
      const months = monthDiff(start, cursor);
      if (months % intervalCount !== 0) continue;
      out.push(toDateOnly(cursor));
    }

    if (out.length > maxOccurrences) {
      throw new Error(`Too many occurrences generated (${out.length}). Please reduce date range or increase interval.`);
    }
  }
  return out;
}

async function cancelOccurrence(eventId: number, transaction: any) {
  const event = await Event.findByPk(eventId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!event) return;

  const slots = await Slot.findAll({
    where: { event_id: eventId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const slotIds = slots.map((s) => Number(s.id));

  if (slotIds.length > 0) {
    await Booking.update(
      { status: 'cancelled', cancelled_at: new Date(), updated_at: new Date() },
      {
        where: {
          slot_id: { [Op.in]: slotIds },
          status: { [Op.in]: ['booked', 'waitlist'] },
        },
        transaction,
      }
    );
  }

  await event.update({ occurrence_status: 'cancelled', modified_from_series: true }, { transaction });
}

export async function createRecurringSeries(params: CreateRecurringSeriesParams) {
  await ensureSchemaUpgrades();

  const intervalCount = Math.max(1, Number(params.intervalCount || 1));
  const capacity = Number(params.capacity);
  if (capacity < 1) throw new Error('Capacity must be at least 1.');
  if (!params.title?.trim()) throw new Error('Title is required.');

  const startTime = normalizeTime(params.startTime);
  const endTime = normalizeTime(params.endTime);
  if (combineDateAndTimeUtc('2000-01-01', startTime) >= combineDateAndTimeUtc('2000-01-01', endTime)) {
    throw new Error('Start time must be earlier than end time.');
  }

  const dates = generateOccurrenceDates({
    startDate: params.startDate,
    untilDate: params.untilDate,
    frequency: params.frequency,
    intervalCount,
    weekdays: params.weekdays,
  });
  if (dates.length === 0) throw new Error('No occurrences generated for the provided recurrence settings.');

  return sequelize.transaction(async (t) => {
    const series = await RecurrenceSeries.create(
      {
        title: params.title,
        description: params.description || null,
        location: params.location || null,
        category: params.category || null,
        created_by: params.userId,
        frequency: params.frequency,
        interval_count: intervalCount,
        weekdays: normalizeWeekdays(params.weekdays),
        start_date: params.startDate,
        until_date: params.untilDate,
        start_time: startTime,
        end_time: endTime,
        capacity,
        timezone: params.timezone || 'UTC',
      },
      { transaction: t }
    );

    const createdEvents: any[] = [];
    for (const dateOnly of dates) {
      const event = await Event.create(
        {
          title: params.title,
          description: params.description || null,
          date: dateOnly,
          occurrence_date: dateOnly,
          location: params.location || null,
          category: params.category || null,
          created_by: params.userId,
          recurrence_series_id: Number(series.get('id')),
          occurrence_status: 'active',
          modified_from_series: false,
        },
        { transaction: t }
      );

      await Slot.create(
        {
          event_id: Number(event.get('id')),
          start_time: combineDateAndTimeUtc(dateOnly, startTime),
          end_time: combineDateAndTimeUtc(dateOnly, endTime),
          capacity,
        },
        { transaction: t }
      );
      createdEvents.push(event);
    }

    return {
      seriesId: Number(series.get('id')),
      occurrenceCount: createdEvents.length,
      firstOccurrenceDate: dates[0],
      lastOccurrenceDate: dates[dates.length - 1],
    };
  });
}

export async function editOccurrence(params: {
  userId: number;
  seriesId: number;
  eventId: number;
  action?: 'cancel' | 'update';
  title?: string;
  description?: string;
  location?: string;
  category?: string;
  occurrenceDate?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
}) {
  await ensureSchemaUpgrades();

  return sequelize.transaction(async (t) => {
    const event = await Event.findByPk(params.eventId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!event) throw new Error('Occurrence not found.');
    if (Number(event.get('recurrence_series_id')) !== params.seriesId) {
      throw new Error('Occurrence does not belong to the requested series.');
    }
    if (Number(event.get('created_by')) !== params.userId) {
      throw new Error('Only the series creator can modify this occurrence.');
    }

    if (params.action === 'cancel') {
      await cancelOccurrence(params.eventId, t);
      return { message: 'Occurrence cancelled successfully.' };
    }

    const slot = await Slot.findOne({
      where: { event_id: Number(event.get('id')) },
      order: [['start_time', 'ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!slot) throw new Error('Slot not found for this occurrence.');

    const updates: any = { modified_from_series: true };
    if (params.title !== undefined) updates.title = params.title;
    if (params.description !== undefined) updates.description = params.description;
    if (params.location !== undefined) updates.location = params.location;
    if (params.category !== undefined) updates.category = params.category;

    const targetDate = params.occurrenceDate || String(event.get('occurrence_date') || event.get('date'));
    if (params.occurrenceDate) {
      updates.date = params.occurrenceDate;
      updates.occurrence_date = params.occurrenceDate;
    }

    await event.update(updates, { transaction: t });

    const currentStart = new Date(String(slot.get('start_time'))).toISOString().slice(11, 19);
    const currentEnd = new Date(String(slot.get('end_time'))).toISOString().slice(11, 19);
    const nextStart = params.startTime ? normalizeTime(params.startTime) : currentStart;
    const nextEnd = params.endTime ? normalizeTime(params.endTime) : currentEnd;
    if (combineDateAndTimeUtc('2000-01-01', nextStart) >= combineDateAndTimeUtc('2000-01-01', nextEnd)) {
      throw new Error('Start time must be earlier than end time.');
    }

    let nextCapacity = Number(slot.capacity);
    if (params.capacity !== undefined) {
      const minBooked = Number(
        (await Booking.sum('spots', {
          where: { slot_id: Number(slot.get('id')), status: 'booked' },
          transaction: t,
        })) || 0
      );
      if (params.capacity < minBooked) {
        throw new Error(`Capacity cannot be lower than currently booked spots (${minBooked}).`);
      }
      nextCapacity = params.capacity;
    }

    await slot.update(
      {
        start_time: combineDateAndTimeUtc(targetDate, nextStart),
        end_time: combineDateAndTimeUtc(targetDate, nextEnd),
        capacity: nextCapacity,
      },
      { transaction: t }
    );

    return { message: 'Occurrence updated successfully.' };
  });
}

export async function editSeriesForward(params: {
  userId: number;
  seriesId: number;
  effectiveDate: string;
  title?: string;
  description?: string;
  location?: string;
  category?: string;
  frequency?: Frequency;
  intervalCount?: number;
  weekdays?: number[];
  untilDate?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  timezone?: string;
}) {
  await ensureSchemaUpgrades();

  return sequelize.transaction(async (t) => {
    const series = await RecurrenceSeries.findByPk(params.seriesId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!series) throw new Error('Recurring series not found.');
    if (Number(series.get('created_by')) !== params.userId) {
      throw new Error('Only the series creator can edit this series.');
    }

    const nextState = {
      title: params.title ?? String(series.get('title')),
      description: params.description ?? (series.get('description') as string | null),
      location: params.location ?? (series.get('location') as string | null),
      category: params.category ?? (series.get('category') as string | null),
      frequency: (params.frequency ?? series.get('frequency')) as Frequency,
      intervalCount: Number(params.intervalCount ?? series.get('interval_count')),
      weekdays: normalizeWeekdays((params.weekdays ?? series.get('weekdays')) as number[]),
      startDate: params.effectiveDate,
      untilDate: params.untilDate ?? String(series.get('until_date')),
      startTime: normalizeTime(params.startTime ?? String(series.get('start_time')).slice(0, 8)),
      endTime: normalizeTime(params.endTime ?? String(series.get('end_time')).slice(0, 8)),
      capacity: Number(params.capacity ?? series.get('capacity')),
      timezone: params.timezone ?? String(series.get('timezone')),
    };

    if (combineDateAndTimeUtc('2000-01-01', nextState.startTime) >= combineDateAndTimeUtc('2000-01-01', nextState.endTime)) {
      throw new Error('Start time must be earlier than end time.');
    }
    if (nextState.capacity < 1) throw new Error('Capacity must be at least 1.');

    const generatedDates = generateOccurrenceDates({
      startDate: nextState.startDate,
      untilDate: nextState.untilDate,
      frequency: nextState.frequency,
      intervalCount: nextState.intervalCount,
      weekdays: nextState.weekdays,
    });

    const futureOccurrences = await Event.findAll({
      where: {
        recurrence_series_id: params.seriesId,
        occurrence_status: 'active',
        occurrence_date: { [Op.gte]: params.effectiveDate },
      },
      order: [['occurrence_date', 'ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    let applied = 0;
    let preservedWithBookings = 0;
    const mutableOccurrences: Event[] = [];
    for (const event of futureOccurrences) {
      const slots = await Slot.findAll({
        where: { event_id: Number(event.get('id')) },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      let hasActiveBookings = false;
      for (const slot of slots) {
        const activeCount = await Booking.count({
          where: {
            slot_id: Number(slot.get('id')),
            status: { [Op.in]: ['booked', 'waitlist'] },
          },
          transaction: t,
        });
        if (activeCount > 0) {
          hasActiveBookings = true;
          break;
        }
      }

      if (hasActiveBookings) {
        preservedWithBookings += 1;
      } else {
        mutableOccurrences.push(event);
      }
    }

    for (let i = 0; i < mutableOccurrences.length; i++) {
      const event = mutableOccurrences[i];
      const dateOnly = generatedDates[i];
      if (!dateOnly) {
        await cancelOccurrence(Number(event.get('id')), t);
        applied += 1;
        continue;
      }

      const slot = await Slot.findOne({
        where: { event_id: Number(event.get('id')) },
        order: [['start_time', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!slot) continue;

      await event.update(
        {
          title: nextState.title,
          description: nextState.description,
          location: nextState.location,
          category: nextState.category,
          date: dateOnly,
          occurrence_date: dateOnly,
        },
        { transaction: t }
      );

      await slot.update(
        {
          start_time: combineDateAndTimeUtc(dateOnly, nextState.startTime),
          end_time: combineDateAndTimeUtc(dateOnly, nextState.endTime),
          capacity: nextState.capacity,
        },
        { transaction: t }
      );
      applied += 1;
    }

    if (generatedDates.length > mutableOccurrences.length) {
      for (let i = mutableOccurrences.length; i < generatedDates.length; i++) {
        const dateOnly = generatedDates[i];
        const event = await Event.create(
          {
            title: nextState.title,
            description: nextState.description,
            date: dateOnly,
            occurrence_date: dateOnly,
            location: nextState.location,
            category: nextState.category,
            created_by: params.userId,
            recurrence_series_id: params.seriesId,
            occurrence_status: 'active',
            modified_from_series: false,
          },
          { transaction: t }
        );

        await Slot.create(
          {
            event_id: Number(event.get('id')),
            start_time: combineDateAndTimeUtc(dateOnly, nextState.startTime),
            end_time: combineDateAndTimeUtc(dateOnly, nextState.endTime),
            capacity: nextState.capacity,
          },
          { transaction: t }
        );
        applied += 1;
      }
    }

    await series.update(
      {
        title: nextState.title,
        description: nextState.description,
        location: nextState.location,
        category: nextState.category,
        frequency: nextState.frequency,
        interval_count: nextState.intervalCount,
        weekdays: nextState.weekdays,
        start_date: String(series.get('start_date')),
        until_date: nextState.untilDate,
        start_time: nextState.startTime,
        end_time: nextState.endTime,
        capacity: nextState.capacity,
        timezone: nextState.timezone,
        series_version: Number(series.get('series_version')) + 1,
      },
      { transaction: t }
    );

    return {
      message: 'Series updated for future occurrences.',
      appliedChanges: applied,
      preservedOccurrencesWithBookings: preservedWithBookings,
    };
  });
}

export async function deleteOccurrence(params: { userId: number; seriesId: number; eventId: number }) {
  return editOccurrence({ ...params, action: 'cancel' });
}

export async function deleteSeries(params: { userId: number; seriesId: number; fromDate?: string }) {
  await ensureSchemaUpgrades();

  return sequelize.transaction(async (t) => {
    const series = await RecurrenceSeries.findByPk(params.seriesId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!series) throw new Error('Recurring series not found.');
    if (Number(series.get('created_by')) !== params.userId) {
      throw new Error('Only the series creator can delete this series.');
    }

    const fromDate = params.fromDate || new Date().toISOString().slice(0, 10);
    const events = await Event.findAll({
      where: {
        recurrence_series_id: params.seriesId,
        occurrence_status: 'active',
        occurrence_date: { [Op.gte]: fromDate },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    for (const event of events) {
      await cancelOccurrence(Number(event.get('id')), t);
    }

    return {
      message: 'Future occurrences cancelled successfully.',
      cancelledOccurrences: events.length,
    };
  });
}
