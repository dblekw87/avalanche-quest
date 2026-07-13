import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Web3Provider } from '@/features/web3/web3-provider';

import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://avalanche-quest.vercel.app'),
  title: 'Avalanche Quest — Play. Own. Trade.',
  description: 'A side-scrolling Web3 RPG built for Avalanche Fuji.',
  openGraph: {
    title: 'Avalanche Quest — Play. Own. Trade.',
    description: 'Defeat bosses, earn AQT and equipment, and own your legend on Avalanche Fuji.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Avalanche Quest expedition heroes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Avalanche Quest — Play. Own. Trade.',
    description: 'Defeat bosses, earn AQT and equipment, and own your legend on Avalanche Fuji.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${display.variable} ${mono.variable}`}>
        <Web3Provider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </Web3Provider>
      </body>
    </html>
  );
}
