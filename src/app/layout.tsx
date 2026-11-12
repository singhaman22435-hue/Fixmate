import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SystemStatusBar } from '@/components/layout/SystemStatusBar';

export const metadata: Metadata = {
  title: 'FixMate — Privacy-First Everyday Problem Solver',
  description:
    'Give FixMate a problem. FixMate tells you what it means, what to do, and what action to take with 100% local privacy.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased">
        <SystemStatusBar />
        <Header />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

