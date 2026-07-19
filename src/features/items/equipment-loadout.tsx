'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getAddress, isAddress } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';

import {
  equipmentLoadoutStorageKey,
  loadEquipmentSelection,
  saveEquipmentSelection,
} from '@/features/items/equipment-loadout-storage';
import { gameItemAbi } from '@/features/items/item-contract';
import {
  itemTypeToEquipmentSlot,
  resolveEquipmentModifiers,
} from '@/game/systems/equipment-modifiers';
import {
  EMPTY_EQUIPMENT_MODIFIERS,
  equipmentSlots,
  type EquipmentSlot,
  type EquipmentTokenSelection,
} from '@/game/types/equipment';

type OwnedEquipment = Readonly<{
  tokenId: string;
  slot: EquipmentSlot;
  rarity: number;
  power: number;
  name: string;
  image: string | null;
}>;

type EquipmentLoadoutProps = {
  disabled: boolean;
  onReadyChange: (ready: boolean) => void;
  onSelectionChange: (selection: EquipmentTokenSelection) => void;
};

const INVENTORY_READ_LIMIT = 100;
const rarityNames = ['Common', 'Rare', 'Legendary', 'Relic'] as const;
const rarityBadgeClasses = [
  'nft-rarity-common',
  'nft-rarity-rare',
  'nft-rarity-legendary',
  'nft-rarity-relic',
] as const;
const rarityGradeClasses = [
  'nft-grade-common',
  'nft-grade-rare',
  'nft-grade-legendary',
  'nft-grade-relic',
] as const;
const slotLabels: Record<EquipmentSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};
const premiumIconPaths: Record<EquipmentSlot, string> = {
  weapon: '/assets/nft-icons/weapon-v2.webp',
  armor: '/assets/nft-icons/armor-v2.webp',
  accessory: '/assets/nft-icons/accessory-v2.webp',
};

export function EquipmentLoadout({
  disabled,
  onReadyChange,
  onSelectionChange,
}: EquipmentLoadoutProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [items, setItems] = useState<readonly OwnedEquipment[]>([]);
  const [selection, setSelection] = useState<EquipmentTokenSelection>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const contractValue = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS;
  const contract = contractValue && isAddress(contractValue)
    ? getAddress(contractValue)
    : null;
  const storageKey = address && contract
    ? equipmentLoadoutStorageKey(avalancheFuji.id, contract, address)
    : null;

  const publishSelection = useCallback((next: EquipmentTokenSelection) => {
    setSelection(next);
    onSelectionChange(next);
    if (storageKey) saveEquipmentSelection(window.localStorage, storageKey, next);
  }, [onSelectionChange, storageKey]);

  useEffect(() => {
    let cancelled = false;
    onReadyChange(false);
    const timer = window.setTimeout(() => {
      if (!address || !publicClient || !contract || !storageKey) {
        setItems([]);
        setSelection({});
        onSelectionChange({});
        setLoading(false);
        onReadyChange(true);
        return;
      }
      setLoading(true);
      setMessage(null);
      void publicClient.readContract({
        address: contract,
        abi: gameItemAbi,
        functionName: 'balanceOf',
        args: [address],
      }).then(async (balance) => {
        const count = Math.min(Number(balance), INVENTORY_READ_LIMIT);
        const tokenIds = await Promise.all(Array.from({ length: count }, (_, index) => (
          publicClient.readContract({
            address: contract,
            abi: gameItemAbi,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, BigInt(index)],
          })
        )));
        const owned = await Promise.all(tokenIds.map(async (tokenId) => {
          const [itemType, rarity, power, tokenURI] = await Promise.all([
            publicClient.readContract({ address: contract, abi: gameItemAbi, functionName: 'itemTypes', args: [tokenId] }),
            publicClient.readContract({ address: contract, abi: gameItemAbi, functionName: 'rarities', args: [tokenId] }),
            publicClient.readContract({ address: contract, abi: gameItemAbi, functionName: 'powers', args: [tokenId] }),
            publicClient.readContract({ address: contract, abi: gameItemAbi, functionName: 'tokenURI', args: [tokenId] }),
          ]);
          const slot = itemTypeToEquipmentSlot(Number(itemType));
          if (!slot) return null;
          const metadata = readMetadata(tokenURI, `${slotLabels[slot]} #${tokenId}`);
          return {
            tokenId: tokenId.toString(),
            slot,
            rarity: Number(rarity),
            power: Number(power),
            name: metadata.name,
            image: metadata.image,
          } satisfies OwnedEquipment;
        }));
        if (cancelled) return;
        const supported = owned.filter((item): item is OwnedEquipment => item !== null);
        const stored = loadEquipmentSelection(window.localStorage, storageKey);
        const sanitized: Partial<Record<EquipmentSlot, string>> = {};
        for (const slot of equipmentSlots) {
          const tokenId = stored[slot];
          if (tokenId && supported.some((item) => item.tokenId === tokenId && item.slot === slot)) {
            sanitized[slot] = tokenId;
          }
        }
        setItems(supported);
        setSelection(sanitized);
        saveEquipmentSelection(window.localStorage, storageKey, sanitized);
        onSelectionChange(sanitized);
        if (Number(balance) > INVENTORY_READ_LIMIT) {
          setMessage(`Only the first ${INVENTORY_READ_LIMIT} NFTs are shown.`);
        }
        setLoading(false);
        onReadyChange(true);
      }).catch(() => {
        if (cancelled) return;
        setItems([]);
        setSelection({});
        onSelectionChange({});
        setMessage('Could not read equipment NFTs. Start is available without equipment.');
        setLoading(false);
        onReadyChange(true);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, contract, onReadyChange, onSelectionChange, publicClient, storageKey]);

  const selectedItems = useMemo(() => equipmentSlots.flatMap((slot) => {
    const tokenId = selection[slot];
    const item = items.find((candidate) => candidate.tokenId === tokenId);
    return item ? [item] : [];
  }), [items, selection]);
  const modifiers = selectedItems.length > 0
    ? resolveEquipmentModifiers(selectedItems)
    : EMPTY_EQUIPMENT_MODIFIERS;

  const equip = (item: OwnedEquipment) => {
    if (disabled) return;
    const next = { ...selection, [item.slot]: item.tokenId };
    publishSelection(next);
  };
  const unequip = (slot: EquipmentSlot) => {
    if (disabled) return;
    const next = { ...selection };
    delete next[slot];
    publishSelection(next);
  };

  return (
    <div className="nft-equipment-loadout">
      <div className="grid gap-3 md:grid-cols-3">
        {equipmentSlots.map((slot) => {
          const item = selectedItems.find((candidate) => candidate.slot === slot);
          return (
            <article key={slot} className={`relative overflow-hidden rounded-xl border p-4 ${item ? 'nft-dark-card border-2 border-[#e1b85f] bg-gradient-to-br from-[#49351a] to-[#17120d] shadow-[0_0_24px_rgba(225,184,95,.18)]' : 'border-[#665844] bg-[#15120e]'}`}>
              {item ? (
                <span className="nft-active-badge absolute right-0 top-0 rounded-bl-lg border-b border-l border-[#ffe09a] bg-[#a97425] px-3 py-1 text-[9px] font-black tracking-[.12em] text-white shadow-lg">
                  ACTIVE LOADOUT
                </span>
              ) : null}
              <div className="flex min-w-0 items-center gap-3">
                <NftThumbnail image={premiumIconPaths[slot]} slot={slot} label={item?.name ?? slotLabels[slot]} equipped={Boolean(item)} rarity={item?.rarity ?? null} />
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold tracking-[.18em] text-[#c49a5a]">{slotLabels[slot].toUpperCase()}</p>
                  <strong className="mt-1 block truncate text-sm text-[#f1e2c6]">{item?.name ?? 'Empty slot'}</strong>
                  <p className="mt-1 text-xs text-[#9f9583]">
                    {item ? `${rarityNames[item.rarity] ?? 'Legacy'} · Power ${item.power} · #${item.tokenId}` : 'No bonus applied'}
                  </p>
                </div>
              </div>
              {item ? (
                <button type="button" disabled={disabled} onClick={() => unequip(slot)} className="nft-unequip-button mt-3 w-full rounded-lg border border-[#806b4e] px-3 py-2 text-xs font-bold text-[#e2cfaa] disabled:opacity-40">
                  UNEQUIP
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Attack" value={`+${modifiers.attackPower}`} />
        <Stat label="Max HP" value={`+${modifiers.maxHealth}`} />
        <Stat label="Defense" value={`${(modifiers.damageReductionBps / 100).toFixed(1)}%`} />
        <Stat label="Skill cooldown" value={`-${(modifiers.cooldownReductionBps / 100).toFixed(1)}%`} />
        <Stat label="Move speed" value={`+${(modifiers.movementSpeedBps / 100).toFixed(1)}%`} />
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-extrabold tracking-[.18em] text-[#a88350]">OWNED EQUIPMENT NFTS</p>
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs font-bold">
            <span className="rounded-full border border-[#c89a4a] bg-[#3c2b16] px-3 py-1 text-[#ffe0a0]">
              Equipped {selectedItems.length} / 3
            </span>
            <Link href="/inventory" className="text-[#d0b47a] underline">Inventory</Link>
            <Link href="/marketplace" className="text-[#d0b47a] underline">Marketplace</Link>
          </div>
        </div>
        {loading ? <p className="mt-3 text-xs text-[#aaa08e]">Reading owned NFTs…</p> : null}
        {!loading && items.length === 0 ? <p className="mt-3 rounded-lg border border-[#554735] p-4 text-xs text-[#aaa08e]">No compatible equipment NFTs. Existing weapon and armor NFTs remain compatible; accessories can drop from future stage clears.</p> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const equipped = selection[item.slot] === item.tokenId;
            return (
              <button
                key={item.tokenId}
                type="button"
                disabled={disabled || equipped}
                onClick={() => equip(item)}
                className={`relative overflow-hidden rounded-xl border p-3 text-left disabled:cursor-not-allowed ${equipped ? 'nft-owned-equipped border-2 border-[#ffd36f] bg-gradient-to-br from-[#6a491d] via-[#3f2b16] to-[#21160d] ring-2 ring-[#ffd36f]/70 shadow-[0_0_28px_rgba(255,211,111,.32)]' : 'border-[#554735] bg-[#17130f] hover:border-[#9b805a]'}`}
              >
                {equipped ? (
                  <span className="nft-equipped-ribbon -mx-3 -mt-3 mb-3 flex items-center justify-center gap-2 border-b border-[#ffe29b] bg-[#b77d25] px-3 py-2 text-[11px] font-black tracking-[.12em] text-white shadow-md">
                    <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-white text-[#8b5c18]">✓</span>
                    CURRENTLY EQUIPPED
                  </span>
                ) : null}
                <span className="flex min-w-0 items-center gap-3">
                  <NftThumbnail image={premiumIconPaths[item.slot]} slot={item.slot} label={item.name} equipped={equipped} rarity={item.rarity} compact />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold text-[#c49a5a]">{slotLabels[item.slot]} · #{item.tokenId}</span>
                    <strong className="mt-1 block truncate text-sm text-[#eadcc0]">{item.name}</strong>
                    <span className="mt-1 block text-xs text-[#9f9583]">Power {item.power}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`nft-status-pill inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black tracking-[.08em] ${equipped ? 'border-[#d0b47a] bg-[#6b4b1e] text-[#fff0c9]' : 'border-[#5f6b53] bg-[#1c281b] text-[#c9d6aa]'}`}>
                        <span aria-hidden="true">{equipped ? '✓' : '+'}</span>
                        {equipped ? 'EQUIPPED' : 'EQUIP'}
                      </span>
                      <span className={`nft-grade-pill inline-flex rounded-full border px-2 py-1 text-[9px] font-black tracking-[.08em] ${rarityGradeClasses[item.rarity] ?? rarityGradeClasses[0]}`}>
                        {rarityNames[item.rarity] ?? 'Legacy'}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold leading-5 text-[#9f9583]">
        Bonuses do not accumulate again on each stage. The server locks an ownership-verified snapshot when the attempt starts. Unequip an NFT before listing it for sale; changes apply from the next attempt.
      </p>
      {disabled ? <p className="mt-2 text-xs font-bold text-[#d0b47a]">Loadout is locked during the current attempt.</p> : null}
      {message ? <p className="mt-2 text-xs font-semibold text-[#d3b987]">{message}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg border border-[#554735] bg-[#0f0d0a] px-3 py-2 text-center">
      <span className="block text-[9px] font-bold uppercase tracking-[.1em] text-[#8f8371]">{label}</span>
      <strong className="mt-1 block text-xs text-[#e5d6b9]">{value}</strong>
    </span>
  );
}

function NftThumbnail({
  image,
  slot,
  label,
  equipped,
  rarity,
  compact = false,
}: {
  image: string | null;
  slot: EquipmentSlot;
  label: string;
  equipped: boolean;
  rarity: number | null;
  compact?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const sizeClass = compact ? 'size-16' : 'size-20';
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border ${sizeClass} ${equipped ? 'border-[#d0b47a] bg-[#382a18] shadow-[0_0_18px_rgba(208,180,122,.2)]' : 'border-[#554735] bg-[#0f0d0a]'}`}>
      {image && image !== failedImage ? (
        <Image
          src={image}
          alt={label}
          width={80}
          height={80}
          onError={() => setFailedImage(image)}
          className="size-full object-contain p-1.5"
        />
      ) : (
        <SlotIcon slot={slot} />
      )}
      {rarity !== null ? (
        <span
          className={`nft-rarity-badge absolute right-1 top-1 size-4 rounded-full border-2 ${rarityBadgeClasses[rarity] ?? rarityBadgeClasses[0]}`}
          aria-label={`Rarity ${rarityNames[rarity] ?? rarityNames[0]}`}
        />
      ) : null}
    </span>
  );
}

function SlotIcon({ slot }: { slot: EquipmentSlot }) {
  if (slot === 'weapon') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64" className="size-10 text-[#d9c18e]" fill="none">
        <path d="M47 8 25 30l9 9L56 17V8h-9Z" fill="currentColor" opacity=".9" />
        <path d="m22 33 9 9M16 38l10 10M13 45l6 6-7 7-6-6 7-7Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (slot === 'armor') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64" className="size-10 text-[#8fc1d8]" fill="none">
        <path d="M32 6 53 14v17c0 14-9 23-21 28C20 54 11 45 11 31V14l21-8Z" fill="currentColor" opacity=".28" stroke="currentColor" strokeWidth="4" />
        <path d="M32 15v34M20 28h24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="size-10 text-[#c99af2]" fill="none">
      <path d="m32 6 9 16 18 4-12 14 2 18-17-7-17 7 2-18L5 26l18-4 9-16Z" fill="currentColor" opacity=".35" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="8" fill="currentColor" />
    </svg>
  );
}

function readMetadata(
  tokenURI: string,
  fallback: string,
): { name: string; image: string | null } {
  try {
    const prefix = 'data:application/json;base64,';
    if (!tokenURI.startsWith(prefix)) return { name: fallback, image: null };
    const parsed: unknown = JSON.parse(window.atob(tokenURI.slice(prefix.length)));
    if (!parsed || typeof parsed !== 'object') return { name: fallback, image: null };
    const name = 'name' in parsed && typeof parsed.name === 'string' ? parsed.name : fallback;
    const image = 'image' in parsed && typeof parsed.image === 'string' ? parsed.image : null;
    return { name, image };
  } catch {
    return { name: fallback, image: null };
  }
}
