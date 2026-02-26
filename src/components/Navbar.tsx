"use client";
 
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { CalendarDays, Settings, Ticket, UserCircle2 } from 'lucide-react';
 
export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
 
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, [pathname]);
 
  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
      <Link href="/" className="inline-flex items-center gap-2 font-extrabold tracking-tight text-sky-700">
        <span className="rounded-lg bg-sky-100 p-1.5 text-sky-700">
          <Ticket className="h-4 w-4" />
        </span>
        <span className="text-base sm:text-lg">SeaEvent Booking</span>
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href="/"
            className={pathname === '/' ? 'text-sky-700' : 'text-slate-600'}
          >
            <CalendarDays className="mr-1 h-4 w-4" />
            Events
          </Link>
        </Button>
        {user ? (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link 
                href="/my-bookings" 
                className={pathname === '/my-bookings' ? 'text-sky-700' : 'text-slate-600'}
              >
                <Ticket className="mr-1 h-4 w-4" />
                My Bookings
              </Link>
            </Button>
            {user.role === 'admin' && (
              <Button variant="ghost" size="sm" asChild className="text-amber-600 hover:text-amber-700">
                <Link 
                  href="/admin/events" 
                  className={pathname === '/admin/events' ? 'text-amber-600' : ''}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Admin
                </Link>
              </Button>
            )}
            <div className="hidden rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase text-sky-700 sm:flex sm:items-center sm:gap-1">
              <UserCircle2 className="h-3.5 w-3.5" />
              {user.name?.substring(0, 2)}
            </div>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link 
                href="/login" 
                className={pathname === '/login' ? 'text-sky-700' : 'text-slate-600'}
              >
                Login
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-sky-700 hover:bg-sky-800">
              <Link href="/register">Join</Link>
            </Button>
          </>
        )}
      </nav>
      </div>
    </header>
  );
}
