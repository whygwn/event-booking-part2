"use client";
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Compass, Users } from 'lucide-react';
 
export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferences, setPreferences] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
 
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: preferences
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
 
      const data = await res.json();
 
      if (res.ok) {
        router.push('/login?registered=true');
      } else {
        setError(data.error || 'Registration failed. Please review your details and try again.');
      }
    } catch (err) {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="max-w-md mx-auto pt-10 space-y-6">
      <Card className="overflow-hidden border-none bg-transparent shadow-none">
        <div className="relative h-32 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600">
          <Image src="/images/sea-hero.svg" alt="Sea background" fill className="rounded-2xl object-cover opacity-70" />
          <div className="absolute inset-0 flex items-center justify-between px-4 text-white">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/80">Create Profile</p>
              <p className="text-sm font-semibold">Start exploring sea tourism events</p>
            </div>
            <Compass className="h-6 w-6" />
          </div>
        </div>
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-extrabold tracking-tight">Create Account</CardTitle>
          <CardDescription>Join EventBooking today and explore amazing events</CardDescription>
        </CardHeader>
      </Card>
 
      <Card className="border-slate-200 shadow-lg shadow-slate-100">
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                required
              />
            </div>
 
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
 
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferences">Interests (comma-separated)</Label>
              <Input
                id="preferences"
                type="text"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Sea Tourism Events"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-700 hover:bg-teal-800"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Register'}
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-cyan-700" />
              Add your interests to get smarter event recommendations.
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline underline-offset-4">
                Login instead
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
