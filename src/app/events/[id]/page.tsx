import { Event, Slot, Booking } from '../../../models';
import Link from 'next/link';
import Image from 'next/image';
import EventSlotsRealtime from '../../../components/EventSlotsRealtime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Calendar, MapPin, Waves } from 'lucide-react';
import LocalDateText from '@/components/LocalDateText';
 
export default async function EventDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const event = await Event.findByPk(id);
  
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold">Event not found</h2>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }
 
  const slots = await Slot.findAll({
    where: { event_id: id },
    order: [['start_time', 'ASC']],
    include: [
      {
        model: Booking,
        as: 'bookings',
      },
    ],
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-primary">
        <Link href="/">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to events
        </Link>
      </Button>
 
      <Card className="overflow-hidden border-slate-200">
        <div className="relative h-44 w-full bg-gradient-to-r from-sky-100 via-cyan-100 to-teal-100">
          <Image src="/images/sea-hero.svg" alt="Sea event visual" fill className="object-cover opacity-80" />
          <div className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-sky-700">
            <Waves className="h-4 w-4" />
          </div>
        </div>
        <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{String(event.get('title'))}</h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-700" />
              <LocalDateText date={new Date(String(event.get('date')))} mode="date" />
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-700" />
              {String(event.get('location'))}
            </span>
          </div>
        </div>
 
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
          <p>{String(event.get('description') || 'No description provided.')}</p>
        </div>
        {slots[0] && (
          <div className="text-sm text-muted-foreground">
            Default event slot:{' '}
            <span className="font-semibold text-foreground">
              <LocalDateText date={new Date((slots[0] as any).start_time)} mode="time" /> -{' '}
              <LocalDateText date={new Date((slots[0] as any).end_time)} mode="time" />
            </span>
          </div>
        )}
        </CardContent>
      </Card>
 
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Available Slots</h2>
          <Badge variant="outline" className="font-mono">
            {slots.length} {slots.length === 1 ? 'SLOT' : 'SLOTS'}
          </Badge>
        </div>
        
        <EventSlotsRealtime
          eventId={id}
          initialSlots={slots.map((slot: any) => slot.toJSON())}
        />
      </div>
    </div>
  );
}
