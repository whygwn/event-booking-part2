"use client";

import { useEffect, useMemo, useState } from 'react';
import BookingForm from './BookingForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Clock, Users } from 'lucide-react';
import { formatEventTime, getClientTimezone } from '@/lib/timezone';

type SlotBooking = {
  status: string;
  spots: number;
};

type SlotItem = {
  id: number;
  start_time: string;
  end_time: string;
  capacity: number;
  bookings?: SlotBooking[];
};

function mapSlots(rawSlots: any[]): SlotItem[] {
  return (rawSlots || []).map((slot: any) => ({
    id: Number(slot.id),
    start_time: String(slot.start_time),
    end_time: String(slot.end_time),
    capacity: Number(slot.capacity),
    bookings: Array.isArray(slot.bookings)
      ? slot.bookings.map((b: any) => ({
          status: String(b.status),
          spots: Number(b.spots),
        }))
      : [],
  }));
}

function computeRemaining(slot: SlotItem): number {
  const taken = (slot.bookings || [])
    .filter((b) => b.status === 'booked')
    .reduce((sum, b) => sum + b.spots, 0);
  return Math.max(0, slot.capacity - taken);
}

export default function EventSlotsRealtime({
  eventId,
  initialSlots,
}: {
  eventId: number;
  initialSlots: any[];
}) {
  const [slots, setSlots] = useState<SlotItem[]>(mapSlots(initialSlots));
  const timezone = getClientTimezone();

  useEffect(() => {
    let active = true;

    const refreshSlots = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setSlots(mapSlots(data?.slots || []));
      } catch {}
    };

    const interval = setInterval(refreshSlots, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [eventId]);

  const totalRemaining = useMemo(
    () => slots.reduce((sum, slot) => sum + computeRemaining(slot), 0),
    [slots]
  );

  return (
    <div className="space-y-4" id="slots-container">
      <div className="text-xs text-muted-foreground">
        Remaining spots across all slots: <span className="font-semibold text-foreground">{totalRemaining}</span>
      </div>
      {slots.map((slot) => {
        const remaining = computeRemaining(slot);
        const isFull = remaining === 0;

        return (
          <Card key={slot.id} className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 font-semibold text-sky-700">
                  <Clock className="w-4 h-4" />
                  <span>
                    {formatEventTime(new Date(slot.start_time), timezone)} -{' '}
                    {formatEventTime(new Date(slot.end_time), timezone)}
                  </span>
                </div>
                <Badge variant={isFull ? 'destructive' : 'secondary'} className="flex items-center gap-1 font-mono">
                  <Users className="w-3 h-3" />
                  {remaining} LEFT
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <BookingForm slotId={slot.id} />
              {isFull && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Slot is currently full. New bookings will be placed on waitlist automatically.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {slots.length === 0 && (
        <Card className="border-dashed shadow-none py-10">
          <CardContent className="text-center text-muted-foreground italic">
            No slots available for this event.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
