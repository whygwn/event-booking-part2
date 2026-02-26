"use client";
 
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, Clock, ExternalLink, LogOut, RotateCcw, Trash2, Waves } from 'lucide-react';
import { formatEventDate, formatEventTime, getClientTimezone } from '@/lib/timezone';
 
export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [undoingId, setUndoingId] = useState<number | null>(null);
  const router = useRouter();
  const timezone =
    (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('user') || '{}')?.timezone) ||
    getClientTimezone();
 
  const fetchBookings = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
 
    try {
      const res = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
 
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError('Unable to load your bookings right now.');
      }
    } catch (err) {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setNotifications((data || []).slice(0, 10));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchBookings();
    fetchNotifications();

    const interval = setInterval(fetchBookings, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const [notifications, setNotifications] = useState<any[]>([]);

  const handleCancel = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    const token = localStorage.getItem('token');
    setCancellingId(bookingId);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Booking cancelled. You have 24 hours to undo this action.' });
        fetchBookings();
      } else {
        setMessage({ type: 'error', text: data.error || 'Unable to cancel this booking right now.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
    } finally {
      setCancellingId(null);
    }
  };

  const handleUndo = async (bookingId: number) => {
    const token = localStorage.getItem('token');
    setUndoingId(bookingId);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'undo' })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Booking restored successfully!' });
        fetchBookings();
      } else {
        setMessage({ type: 'error', text: data.error || 'Unable to restore this booking right now.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
    } finally {
      setUndoingId(null);
    }
  };
 
  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
    router.refresh();
  };

  const isWithinGracePeriod = (booking: any) => {
    if (booking.status !== 'cancelled') return false;
    const cancelledAt = new Date(booking.cancelled_at);
    const now = new Date();
    const hoursSinceCancellation = (now.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCancellation < 24;
  };

  const upcomingBookings = bookings.filter(b => new Date(b.slot?.event?.date) > new Date() && b.status !== 'cancelled');
  const pastBookings = bookings.filter(b => new Date(b.slot?.event?.date) <= new Date());
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
 
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium animate-pulse">Loading your bookings...</p>
    </div>
  );
 
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-sky-100 bg-gradient-to-r from-sky-600 to-cyan-600 text-white">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/80">Reservation Center</p>
            <h1 className="text-2xl font-extrabold tracking-tight">My Bookings</h1>
            <p className="mt-1 text-sm text-white/90">Manage active, cancelled, and past reservations.</p>
          </div>
          <Waves className="h-8 w-8 text-white/80" />
        </CardContent>
      </Card>

      <div className="flex justify-end items-center">
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
 
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {notifications.length > 0 && (
        <div className="mb-3">
          <h3 className="text-sm font-bold">Notifications</h3>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="p-2 bg-blue-50 rounded text-xs text-blue-800">
                {n.type === 'waitlist_promoted' ? (
                  <div>A waitlisted booking has been confirmed for you.</div>
                ) : (
                  <div>You have a new account notification.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
 
      <div className="space-y-6">
        {upcomingBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-primary">Upcoming Bookings</h2>
            {upcomingBookings.map((b) => (
              <Card key={b.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">{b.slot?.event?.title}</CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground font-medium">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatEventDate(new Date(b.slot?.event?.date), timezone)}
                      </div>
                    </div>
                    <Badge 
                      variant={b.status === 'booked' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {b.status}
                    </Badge>
                  </div>
                </CardHeader>
         
                <CardContent className="pb-3 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Time Slot</span>
                      <div className="flex items-center text-sm font-semibold">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-primary" />
                        {formatEventTime(new Date(b.slot?.start_time), timezone)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Reservation</span>
                      <div className="text-sm font-semibold">
                        {b.spots} {b.spots === 1 ? 'Spot' : 'Spots'}
                      </div>
                    </div>
                  </div>
                  {b.status === 'waitlist' && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs text-yellow-700 dark:text-yellow-200">
                      You are on the waitlist. You will be notified when a spot opens up.
                    </div>
                  )}
                </CardContent>
         
                <CardFooter className="bg-muted/30 pt-3 pb-3 flex justify-between border-t gap-2">
                  <Button variant="link" size="sm" asChild className="h-auto p-0 text-primary font-bold">
                    <Link href={`/events/${b.slot?.event_id}`}>
                      View Event
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleCancel(b.id)}
                    disabled={cancellingId === b.id}
                  >
                    {cancellingId === b.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                    Cancel
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {pastBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-muted-foreground">Past Events</h2>
            {pastBookings.map((b) => (
              <Card key={b.id} className="overflow-hidden opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">{b.slot?.event?.title}</CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground font-medium">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatEventDate(new Date(b.slot?.event?.date), timezone)}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">Completed</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {cancelledBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-destructive">Cancelled Bookings</h2>
            {cancelledBookings.map((b) => (
              <Card key={b.id} className="overflow-hidden border-destructive/30">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">{b.slot?.event?.title}</CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground font-medium">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatEventDate(new Date(b.slot?.event?.date), timezone)}
                      </div>
                    </div>
                    <Badge variant="destructive" className="capitalize">Cancelled</Badge>
                  </div>
                </CardHeader>

                {isWithinGracePeriod(b) && (
                  <CardFooter className="bg-destructive/10 pt-3 pb-3 flex justify-end border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleUndo(b.id)}
                      disabled={undoingId === b.id}
                    >
                      {undoingId === b.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                      Undo (24h)
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
 
        {bookings.length === 0 && !error && (
          <Card className="border-dashed shadow-none py-16">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-4 bg-muted rounded-full">
                <Calendar className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold">No bookings yet</p>
                <p className="text-muted-foreground max-w-[250px]">You haven't reserved any spots for upcoming events.</p>
              </div>
              <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20">
                <Link href="/">Browse Events</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
