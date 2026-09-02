import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SteamPulse | Game analytics platform',
    template: '%s | SteamPulse',
  },
  description:
    'Steam market analytics: review velocity, publisher performance and genre pricing trends across 10,000+ titles.',
};

export const viewport: Viewport = {
  themeColor: '#070b10',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-pulse focus:px-4 focus:py-2 focus:font-medium focus:text-ground"
        >
          Skip to content
        </a>
        <Navbar />
        <div id="content">{children}</div>
      </body>
    </html>
  );
}
