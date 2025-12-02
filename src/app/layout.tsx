import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from '@vercel/speed-insights/next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: 'syns6 - Karaoke, Redefined',
    template: '%s | syns6',
  },
  description: 'Transform your home into a neon-soaked karaoke club. Live 3D visualizations, AI-powered custom visuals, lyrics for all genres, Hue integration, and viewer mode.',
  keywords: [
    'karaoke',
    'karaoke app',
    'music visualization',
    '3D visualizations',
    'AI karaoke',
    'lyrics',
    'karaoke machine',
    'smart lights',
    'Hue integration',
    'music player',
    'live visuals',
    'karaoke party',
    'viewer mode',
    'karaoke sharing',
  ],
  authors: [{ name: 'syns6' }],
  creator: 'syns6',
  publisher: 'syns6',
  metadataBase: new URL('https://syns6.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://syns6.com',
    siteName: 'syns6',
    title: 'syns6 - Karaoke, Redefined',
    description: 'Transform your home into a neon-soaked karaoke club. Live 3D visualizations, AI-powered custom visuals, lyrics for all genres.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'syns6 - Karaoke, Redefined. Transform your home into a neon-soaked karaoke club.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@_syns6_',
    creator: '@_syns6_',
    title: 'syns6 - Karaoke, Redefined',
    description: 'Transform your home into a neon-soaked karaoke club. Live 3D visualizations, AI-powered custom visuals, lyrics for all genres.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  themeColor: '#00ff00',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'syns6',
  },
  category: 'entertainment',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${spaceMono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
