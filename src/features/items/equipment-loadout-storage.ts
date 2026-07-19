import type {
  EquipmentSlot,
  EquipmentTokenSelection,
} from '@/game/types/equipment';
import { equipmentSlots } from '@/game/types/equipment';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function equipmentLoadoutStorageKey(
  chainId: number,
  contract: string,
  wallet: string,
): string {
  return `aqt:nft-loadout:v1:${chainId}:${contract.toLowerCase()}:${wallet.toLowerCase()}`;
}

export function loadEquipmentSelection(
  storage: StorageLike,
  key: string,
): EquipmentTokenSelection {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const record = value as Record<string, unknown>;
    const selection: Partial<Record<EquipmentSlot, string>> = {};
    for (const slot of equipmentSlots) {
      const tokenId = record[slot];
      if (typeof tokenId === 'string' && /^[1-9]\d{0,77}$/.test(tokenId)) {
        selection[slot] = tokenId;
      }
    }
    return selection;
  } catch {
    return {};
  }
}

export function saveEquipmentSelection(
  storage: StorageLike,
  key: string,
  selection: EquipmentTokenSelection,
): void {
  storage.setItem(key, JSON.stringify(selection));
}

export function isTokenEquipped(
  selection: EquipmentTokenSelection,
  tokenId: string,
): boolean {
  return equipmentSlots.some((slot) => selection[slot] === tokenId);
}
