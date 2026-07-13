import { PageShell } from '@/components/page-shell';
import { MarketplaceClient } from '@/features/marketplace/marketplace-client';
import { AssetTycoonMarket } from '@/features/asset-tycoon/asset-tycoon-market';

export default function MarketplacePage() {
  return <PageShell eyebrow="TRADING POST" title="AQT NFT marketplace" description="Buy and sell escrowed boss equipment and transferable class licenses with Avalanche Quest Token."><MarketplaceClient /><AssetTycoonMarket /></PageShell>;
}
