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
  title: "syns6",
  description: "Neon-soaked bass-pounding karaoke machine",
  metadataBase: new URL('https://syns6.com'),
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
    title: 'syns6',
    description: 'Neon-soaked bass-pounding karaoke machine',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'syns6 - Neon-soaked bass-pounding karaoke machine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@_syns6_',
    creator: '@_syns6_',
    title: 'syns6',
    description: 'Neon-soaked bass-pounding karaoke machine',
    images: ['/opengraph-image'],
  },
  manifest: '/manifest.webmanifest',
  themeColor: '#00ff00',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'syns6',
  },
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
