"use client";
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2 } from 'lucide-react';
 
export default function BookingForm({ slotId }: { slotId: number }) {
  const [spots, setSpots] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();
 
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
 
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
 
    try {
      const res = await fetch(`/api/slots/${slotId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ spots: Number(spots) })
      });
 
      const data = await res.json();
 
      if (res.ok) {
        setMessage({ type: 'success', text: `Successfully booked ${spots} spot(s)! Status: ${data.status}` });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: data.error || 'We could not complete your booking. Please try again.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="space-y-4">
      <form onSubmit={handleBook} className="flex gap-3 items-end">
        <div className="grid gap-2 flex-1">
          <Label htmlFor={`spots-${slotId}`} className="text-xs font-bold uppercase text-muted-foreground">
            Spots
          </Label>
          <select 
            id={`spots-${slotId}`}
            value={spots}
            onChange={(e) => setSpots(Number(e.target.value))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'Person' : 'People'}</option>
            ))}
          </select>
        </div>
        <Button 
          type="submit"
          disabled={loading}
          className="bg-sky-700 px-8 hover:bg-sky-800"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Book Now'}
        </Button>
      </form>
 
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : ''}>
          <AlertDescription>
            {message.text}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
