'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { getAddress, isAddress, parseEther, type Hex } from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';

import { gameItemAbi } from '@/features/items/item-contract';
import {
  equipmentLoadoutStorageKey,
  isTokenEquipped,
  loadEquipmentSelection,
} from '@/features/items/equipment-loadout-storage';
import { decodeMetadata, marketplaceAbi, type ItemMetadata } from '@/features/marketplace/marketplace-contract';
import { transactionErrorMessage } from '@/features/web3/transaction-feedback';
import type { EquipmentTokenSelection } from '@/game/types/equipment';

type OwnedItem = { tokenId: bigint; metadata: ItemMetadata };
type TxState = 'idle' | 'pending' | 'success' | 'error';

function InventoryLoadingSkeleton() {
  return (
    <div className="contract-skeleton-pulse grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading inventory from contract">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="border border-[#d1d5db] bg-[#f3f4f6] p-4">
          <div data-skeleton-block className="mx-auto aspect-square w-32" />
          <div data-skeleton-block className="mt-5 h-3 w-20" />
          <div data-skeleton-block className="mt-4 h-6 w-2/3" />
          <div data-skeleton-block className="mt-4 h-3 w-full" />
          <div data-skeleton-block className="mt-6 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function InventoryClient() {
  const { address } = useAccount(); const publicClient = usePublicClient(); const { writeContractAsync } = useWriteContract();
  const [items, setItems] = useState<readonly OwnedItem[]>([]);
  const [prices, setPrices] = useState<Readonly<Record<string, string>>>({});
  const [equipmentSelection, setEquipmentSelection] = useState<EquipmentTokenSelection>({});
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<TxState>('idle'); const [message, setMessage] = useState<string | null>(null); const [hash, setHash] = useState<Hex | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const itemValue = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS;
    if (!address || !publicClient || !itemValue || !isAddress(itemValue)) { setItems([]); setLoading(false); return; }
    const itemAddress = getAddress(itemValue);
    const count = await publicClient.readContract({ address: itemAddress, abi: gameItemAbi, functionName: 'balanceOf', args: [address] });
    const tokenIds = await Promise.all(Array.from({ length: Number(count) }, (_, index) => publicClient.readContract({ address: itemAddress, abi: gameItemAbi, functionName: 'tokenOfOwnerByIndex', args: [address, BigInt(index)] })));
    const uris = await Promise.all(tokenIds.map((tokenId) => publicClient.readContract({ address: itemAddress, abi: gameItemAbi, functionName: 'tokenURI', args: [tokenId] })));
    setItems(tokenIds.map((tokenId, index) => ({ tokenId, metadata: decodeMetadata(uris[index] ?? '') })));
    setLoading(false);
  }, [address, publicClient]);
  useEffect(() => { const timeout = window.setTimeout(() => void load().catch(() => { setLoading(false); setMessage('Could not load inventory.'); }), 0); return () => window.clearTimeout(timeout); }, [load]);
  const refreshEquipmentSelection = useCallback(() => {
    const itemValue = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS;
    if (!address || !itemValue || !isAddress(itemValue)) {
      setEquipmentSelection({});
      return;
    }
    setEquipmentSelection(loadEquipmentSelection(
      window.localStorage,
      equipmentLoadoutStorageKey(avalancheFuji.id, getAddress(itemValue), address),
    ));
  }, [address]);
  useEffect(() => {
    const timeout = window.setTimeout(refreshEquipmentSelection, 0);
    window.addEventListener('focus', refreshEquipmentSelection);
    window.addEventListener('storage', refreshEquipmentSelection);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('focus', refreshEquipmentSelection);
      window.removeEventListener('storage', refreshEquipmentSelection);
    };
  }, [refreshEquipmentSelection]);

  const listItem = async (tokenId: bigint) => {
    const itemValue = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS; const marketValue = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
    if (!address || !publicClient || !itemValue || !marketValue || !isAddress(itemValue) || !isAddress(marketValue)) { setState('error'); setMessage('Marketplace configuration is missing.'); return; }
    const itemAddress = getAddress(itemValue);
    const equipmentSelection = loadEquipmentSelection(
      window.localStorage,
      equipmentLoadoutStorageKey(avalancheFuji.id, itemAddress, address),
    );
    if (isTokenEquipped(equipmentSelection, tokenId.toString())) {
      setState('error');
      setMessage('Unequip this NFT on the Game page before listing it.');
      return;
    }
    const price = prices[tokenId.toString()] ?? '';
    let parsedPrice: bigint; try { parsedPrice = parseEther(price); } catch { setState('error'); setMessage('Enter a valid AQT price for this item.'); return; }
    if (parsedPrice <= 0n) { setState('error'); setMessage('Price must be greater than zero.'); return; }
    setState('pending'); setMessage('Confirm NFT listing approval in your wallet.');
    try {
      const market = getAddress(marketValue);
      const approvalHash = await writeContractAsync({ address: itemAddress, abi: gameItemAbi, functionName: 'setApprovalForAll', args: [market, true], chainId: avalancheFuji.id });
      setHash(approvalHash); await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      setMessage('Confirm the NFT listing transaction in your wallet.');
      const nonce = await publicClient.getTransactionCount({ address, blockTag: 'pending' });
      const listingHash = await writeContractAsync({ address: market, abi: marketplaceAbi, functionName: 'createListing', args: [tokenId, parsedPrice], chainId: avalancheFuji.id, nonce });
      setHash(listingHash); await publicClient.waitForTransactionReceipt({ hash: listingHash }); setState('success'); setMessage('NFT listed successfully.'); await load();
    } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
  };
  if (loading) return <InventoryLoadingSkeleton />;
  return (
    <div>
      {!address ? <p className="border border-[#665844] p-5 text-sm font-medium text-[#aaa08e]">Connect a wallet to view owned items.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const tokenKey = item.tokenId.toString();
          const itemPrice = prices[tokenKey] ?? '';
          const equipped = isTokenEquipped(equipmentSelection, tokenKey);
          return (
            <article
              key={tokenKey}
              className={`inventory-item-card relative overflow-hidden border p-4 ${equipped ? 'inventory-item-equipped border-[#e2b857] ring-2 ring-[#e2b857]/45' : 'border-[#665844] bg-[#211b15]'}`}
            >
              {equipped ? (
                <div className="inventory-equipped-ribbon -mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 border-b px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-black tracking-[.12em]">
                    <span className="inventory-equipped-check grid size-6 place-items-center rounded-full">✓</span>
                    현재 착용 중
                  </span>
                  <span className="text-[10px] font-extrabold tracking-[.08em]">거래소 등록 잠금</span>
                </div>
              ) : null}
              {item.metadata.image ? (
                <Image
                  src={item.metadata.image}
                  alt={item.metadata.name}
                  width={160}
                  height={160}
                  unoptimized
                  className={`mx-auto mb-4 aspect-square w-28 object-contain border bg-[#17130f] p-2 sm:w-32 ${equipped ? 'border-[#e2b857]' : 'border-[#554735]'}`}
                />
              ) : null}
              <span className="inventory-token-id font-mono text-[10px] font-semibold text-[#8e826f]">AQI #{tokenKey}</span>
              <h2 className="inventory-item-title mt-3 text-lg font-extrabold text-[#e5d6b9]">{item.metadata.name}</h2>
              <p className="inventory-item-description mt-2 text-xs font-medium text-[#9f9583]">{item.metadata.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.metadata.attributes?.map((attribute) => <span key={attribute.trait_type} className="inventory-item-attribute border border-[#554735] px-2 py-1 text-[10px] font-semibold text-[#bda77f]">{attribute.trait_type}: {attribute.value}</span>)}
              </div>
              <label className={`inventory-listing-label mt-4 block text-[10px] font-bold tracking-[.14em] ${equipped ? 'text-[#8f8067]' : 'text-[#c49a5a]'}`}>MY LISTING PRICE</label>
              <div className={`inventory-price-control mt-2 flex items-center border ${equipped ? 'inventory-price-control-locked border-[#4d463a]' : 'border-[#665844] bg-[#18140f]'}`}>
                <input
                  inputMode="decimal"
                  disabled={equipped}
                  placeholder={equipped ? '착용 해제 후 등록 가능' : 'Enter price'}
                  value={itemPrice}
                  onChange={(event) => setPrices((current) => ({ ...current, [tokenKey]: event.target.value }))}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold text-[#eadcc0] outline-none disabled:cursor-not-allowed disabled:text-[#756d60]"
                />
                <span className={`pr-3 text-xs font-bold ${equipped ? 'text-[#756d60]' : 'text-[#c49a5a]'}`}>AQT</span>
              </div>
              <button
                type="button"
                disabled={equipped || state === 'pending' || !itemPrice}
                onClick={() => void listItem(item.tokenId)}
                className="inventory-list-button mt-3 w-full border border-[#796749] py-3 text-xs font-bold text-[#d8c6a5] disabled:cursor-not-allowed disabled:border-[#4d463a] disabled:text-[#756d60]"
              >
                {equipped ? '착용 중 · 거래소 등록 불가' : `LIST FOR ${itemPrice || '—'} AQT`}
              </button>
            </article>
          );
        })}
      </div>
      {items.length === 0 && address ? <p className="border border-[#665844] p-5 text-sm font-medium text-[#aaa08e]">No boss-drop NFTs yet. Clear a stage and mint the drop.</p> : null}
      {message ? <p className={`mt-4 text-sm font-semibold ${state === 'error' ? 'text-[#e7aaaa]' : 'text-[#c9d6aa]'}`}>{message}</p> : null}
      {hash ? <a className="mt-2 block text-xs font-semibold text-[#c49a5a] underline" href={`https://testnet.snowtrace.io/tx/${hash}`} target="_blank" rel="noreferrer">View latest transaction on Snowtrace</a> : null}
    </div>
  );
}
