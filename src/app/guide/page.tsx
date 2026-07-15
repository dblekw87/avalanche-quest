import type { Metadata } from 'next';

import { PageShell } from '@/components/page-shell';
import { FujiGuide } from '@/features/web3/fuji-guide';

export const metadata: Metadata = {
  title: 'Player Guide — Avalanche Quest',
  description: 'Learn wallet setup, Fuji Testnet preparation, combat controls, upgrades, and rewards.',
};

export default function GuidePage() {
  return <PageShell eyebrow="BEFORE YOUR FIRST EXPEDITION" title="Player Guide" description="Follow the complete journey from wallet and Fuji Testnet setup to combat, skill and character upgrades, and reward claims."><FujiGuide /></PageShell>;
}
