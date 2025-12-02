import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions | syns6',
  description: 'Find answers to common questions about syns6, the karaoke platform with live 3D visualizations, AI-powered visuals, and smart home integration.',
  keywords: [
    'syns6 faq',
    'karaoke help',
    'syns6 questions',
    'karaoke support',
    'how to use syns6',
    'syns6 troubleshooting',
    'karaoke FAQ',
    'music visualization help',
  ],
  openGraph: {
    title: 'FAQ - Frequently Asked Questions | syns6',
    description: 'Find answers to common questions about syns6, the karaoke platform with live 3D visualizations, AI-powered visuals, and smart home integration.',
    url: 'https://syns6.com/faq',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ - Frequently Asked Questions | syns6',
    description: 'Find answers to common questions about syns6, the karaoke platform with live 3D visualizations, AI-powered visuals, and smart home integration.',
  },
  alternates: {
    canonical: '/faq',
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

