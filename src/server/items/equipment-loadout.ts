import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  keccak256,
  toBytes,
  type Address,
} from 'viem';
import { avalancheFuji } from 'viem/chains';

import { gameItemAbi } from '@/features/items/item-contract';
import {
  itemTypeToEquipmentSlot,
  resolveEquipmentModifiers,
} from '@/game/systems/equipment-modifiers';
import {
  EMPTY_EQUIPMENT_MODIFIERS,
  equipmentSlots,
  type EquipmentLoadoutSnapshot,
  type EquipmentSnapshotItem,
  type EquipmentTokenSelection,
} from '@/game/types/equipment';

export class EquipmentLoadoutError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function parseEquipmentTokenSelection(
  value: unknown,
): EquipmentTokenSelection {
  if (value === undefined || value === null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new EquipmentLoadoutError('Invalid equipment loadout', 400);
  }

  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !equipmentSlots.includes(key as never))) {
    throw new EquipmentLoadoutError('Invalid equipment slot', 400);
  }

  const selection: Partial<Record<(typeof equipmentSlots)[number], string>> = {};
  const tokenIds = new Set<string>();
  for (const slot of equipmentSlots) {
    const tokenId = record[slot];
    if (tokenId === undefined || tokenId === null || tokenId === '') continue;
    if (typeof tokenId !== 'string' || !/^[1-9]\d{0,77}$/.test(tokenId)) {
      throw new EquipmentLoadoutError('Invalid equipment token ID', 400);
    }
    if (tokenIds.has(tokenId)) {
      throw new EquipmentLoadoutError('The same NFT cannot fill multiple slots', 400);
    }
    tokenIds.add(tokenId);
    selection[slot] = tokenId;
  }
  return selection;
}

export async function validateEquipmentLoadout(
  player: Address,
  selection: EquipmentTokenSelection,
): Promise<EquipmentLoadoutSnapshot> {
  const selectedEntries = equipmentSlots.flatMap((slot) => {
    const tokenId = selection[slot];
    return tokenId ? [{ slot, tokenId }] : [];
  });
  const contractValue = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS;

  if (selectedEntries.length === 0) {
    return createEquipmentSnapshot(null, []);
  }

  const rpcUrl = process.env.FUJI_RPC_URL ?? process.env.NEXT_PUBLIC_FUJI_RPC_URL;
  if (!contractValue || !isAddress(contractValue) || !rpcUrl) {
    throw new EquipmentLoadoutError('Equipment service is not configured', 503);
  }
  const contract = getAddress(contractValue);
  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http(rpcUrl),
  });

  try {
    const items = await Promise.all(selectedEntries.map(async ({ slot, tokenId }) => {
      const id = BigInt(tokenId);
      const [owner, itemType, rarity, power] = await Promise.all([
        publicClient.readContract({
          address: contract,
          abi: gameItemAbi,
          functionName: 'ownerOf',
          args: [id],
        }),
        publicClient.readContract({
          address: contract,
          abi: gameItemAbi,
          functionName: 'itemTypes',
          args: [id],
        }),
        publicClient.readContract({
          address: contract,
          abi: gameItemAbi,
          functionName: 'rarities',
          args: [id],
        }),
        publicClient.readContract({
          address: contract,
          abi: gameItemAbi,
          functionName: 'powers',
          args: [id],
        }),
      ]);
      if (getAddress(owner) !== player) {
        throw new EquipmentLoadoutError(`You no longer own NFT #${tokenId}`, 403);
      }
      if (itemTypeToEquipmentSlot(Number(itemType)) !== slot) {
        throw new EquipmentLoadoutError(`NFT #${tokenId} does not fit the ${slot} slot`, 409);
      }
      return {
        tokenId,
        slot,
        rarity: Number(rarity),
        power: Number(power),
      } satisfies EquipmentSnapshotItem;
    }));
    return createEquipmentSnapshot(contract, items);
  } catch (error) {
    if (error instanceof EquipmentLoadoutError) throw error;
    throw new EquipmentLoadoutError('Could not validate the selected NFTs', 502);
  }
}

function createEquipmentSnapshot(
  contract: Address | null,
  items: readonly EquipmentSnapshotItem[],
): EquipmentLoadoutSnapshot {
  const modifiers = items.length === 0
    ? EMPTY_EQUIPMENT_MODIFIERS
    : resolveEquipmentModifiers(items);
  const canonical = {
    version: 1,
    chainId: avalancheFuji.id,
    contract,
    items: [...items].sort((left, right) => left.slot.localeCompare(right.slot)),
    modifiers,
  } as const;
  return {
    ...canonical,
    hash: keccak256(toBytes(JSON.stringify(canonical))),
  };
}
