import { PageShell } from '@/components/page-shell';
import { MarketplaceClient } from '@/features/marketplace/marketplace-client';

export default function MarketplacePage() {
  return <PageShell eyebrow="TRADING POST" title="AQT equipment marketplace" description="Buy and sell escrowed boss-drop NFTs with Avalanche Quest Token."><MarketplaceClient /></PageShell>;
}
