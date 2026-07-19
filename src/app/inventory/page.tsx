import { PageShell } from '@/components/page-shell';
import { InventoryClient } from '@/features/items/inventory-client';

export default function InventoryPage() {
  return <PageShell eyebrow="ADVENTURER BAG" title="On-chain equipment" description="Boss drops owned by your connected wallet. Equipped NFTs are marked and must be unequipped before marketplace listing."><InventoryClient /></PageShell>;
}
