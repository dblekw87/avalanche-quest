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
  title: 'Avalanche Quest — Play. Own. Trade.',
  description: 'A side-scrolling Web3 RPG built for Avalanche Fuji.',
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
