"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Sparkles, Waves } from 'lucide-react';
import LocalDateText from '@/components/LocalDateText';
 
type EventItem = {
  id: number;
  title: string;
  description?: string;
  date: string;
  location?: string;
};

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userIdParam = user?.id ? `&userId=${user.id}` : '';
        const res = await fetch(`/api/events?sort=smart&page=1&pageSize=20${userIdParam}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        setEvents(data?.data || []);
      } catch {}
    };
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-sky-100 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 text-white shadow-xl">
        <CardContent className="relative p-5 sm:p-6">
          <div className="absolute inset-0 opacity-25">
            <Image src="/images/sea-hero.svg" alt="Sea illustration" fill className="object-cover" />
          </div>
          <div className="relative space-y-3">
            <Badge className="w-fit border-white/40 bg-white/20 text-white hover:bg-white/20">
              <Sparkles className="mr-1 h-3 w-3" />
              Event Wisata Laut
            </Badge>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              Find Your Next Sea Adventure
            </h1>
            <p className="max-w-xl text-sm text-white/90">
              Browse curated sea tourism events, pick your preferred time slot, and reserve your spots instantly.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Upcoming Events</h2>
          <p className="text-sm text-slate-600">Discover and book your next experience</p>
        </div>
        <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
          <Waves className="mr-1 h-3 w-3" />
          {events.length} listed
        </Badge>
      </div>
 
      <div className="grid gap-4">
        {events.map((e: EventItem) => (
          <Link 
            key={e.id} 
            href={`/events/${e.id}`}
            className="block"
          >
            <Card className="overflow-hidden border-slate-200 transition-all hover:border-sky-300 hover:shadow-lg active:scale-[0.99]">
              <div className="relative h-24 w-full bg-gradient-to-r from-sky-100 via-cyan-100 to-teal-100">
                <Image src="/images/sea-hero.svg" alt="Sea event visual" fill className="object-cover opacity-60" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-xl line-clamp-1">{e.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0 bg-slate-100 text-slate-700">
                    <Calendar className="w-3 h-3 mr-1" />
                    <LocalDateText date={new Date(e.date)} mode="date" />
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {e.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-sky-700" />
                <span>{e.location}</span>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
      
      {events.length === 0 && (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No events found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
