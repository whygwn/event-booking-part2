import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Event Booking',
  description: 'Simple event booking app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 font-sans text-gray-900 antialiased">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.15),_transparent_55%)]" />
        <div className="relative mx-auto min-h-screen w-full max-w-6xl bg-white/95 shadow-sm backdrop-blur sm:my-4 sm:rounded-2xl sm:border sm:shadow-lg">
          <Navbar />
          <main className="p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
