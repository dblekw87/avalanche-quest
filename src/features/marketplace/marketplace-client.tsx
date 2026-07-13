'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { formatEther, getAddress, isAddress, type Address, type Hex } from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';

import { gameTokenAbi } from '@/features/skills/skill-contract';
import { gameItemAbi } from '@/features/items/item-contract';
import { decodeMetadata, marketplaceAbi, type ItemMetadata } from '@/features/marketplace/marketplace-contract';
import { transactionErrorMessage } from '@/features/web3/transaction-feedback';

type Listing = { id: bigint; seller: Address; tokenId: bigint; price: bigint; metadata: ItemMetadata };
type TxState = 'idle' | 'pending' | 'success' | 'error';

function MarketplaceLoadingSkeleton() {
  return (
    <div className="contract-skeleton-pulse border-t border-[#d1d5db]" aria-label="Loading marketplace listings from contract">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid gap-3 border-b border-[#d1d5db] py-5 md:grid-cols-[80px_72px_1fr_150px_130px] md:items-center">
          <div data-skeleton-block className="h-3 w-14" />
          <div data-skeleton-block className="size-[72px]" />
          <div>
            <div data-skeleton-block className="h-4 w-36" />
            <div data-skeleton-block className="mt-3 h-3 w-24" />
          </div>
          <div data-skeleton-block className="h-4 w-24" />
          <div data-skeleton-block className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function MarketplaceClient() {
  const { address } = useAccount(); const publicClient = usePublicClient(); const { writeContractAsync } = useWriteContract();
  const [listings, setListings] = useState<readonly Listing[]>([]); const [state, setState] = useState<TxState>('idle');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null); const [hash, setHash] = useState<Hex | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const marketValue = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS; const itemValue = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS;
    if (!publicClient || !marketValue || !itemValue || !isAddress(marketValue) || !isAddress(itemValue)) { setListings([]); setLoading(false); return; }
    const market = getAddress(marketValue); const item = getAddress(itemValue);
    const nextId = await publicClient.readContract({ address: market, abi: marketplaceAbi, functionName: 'nextListingId' });
    const raw = await Promise.all(Array.from({ length: Math.max(0, Number(nextId - 1n)) }, (_, index) => publicClient.readContract({ address: market, abi: marketplaceAbi, functionName: 'listings', args: [BigInt(index + 1)] })));
    const active = raw.map((entry, index) => ({ id: BigInt(index + 1), seller: entry[0], tokenId: entry[1], price: entry[2], active: entry[3] })).filter((entry) => entry.active);
    const uris = await Promise.all(active.map((entry) => publicClient.readContract({ address: item, abi: gameItemAbi, functionName: 'tokenURI', args: [entry.tokenId] })));
    setListings(active.map((entry, index) => ({ ...entry, metadata: decodeMetadata(uris[index] ?? '') })));
    setLoading(false);
  }, [publicClient]);
  useEffect(() => { const timeout = window.setTimeout(() => void load().catch(() => { setLoading(false); setMessage('Could not load marketplace listings.'); }), 0); return () => window.clearTimeout(timeout); }, [load]);

  const buy = async (listing: Listing) => {
    const marketValue = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS; const tokenValue = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS;
    if (!address || !publicClient || !marketValue || !tokenValue || !isAddress(marketValue) || !isAddress(tokenValue)) { setState('error'); setMessage('Connect a wallet and check marketplace configuration.'); return; }
    setState('pending');
    try {
      const market = getAddress(marketValue); const token = getAddress(tokenValue);
      const allowance = await publicClient.readContract({ address: token, abi: gameTokenAbi, functionName: 'allowance', args: [address, market] });
      if (allowance < listing.price) { setMessage('AQT 사용 승인을 지갑에서 확인해 주세요.'); const approvalHash = await writeContractAsync({ address: token, abi: gameTokenAbi, functionName: 'approve', args: [market, listing.price], chainId: avalancheFuji.id }); setHash(approvalHash); await publicClient.waitForTransactionReceipt({ hash: approvalHash }); }
      setMessage('NFT 구매 거래를 지갑에서 확인해 주세요.'); const nonce = await publicClient.getTransactionCount({ address, blockTag: 'pending' });
      const buyHash = await writeContractAsync({ address: market, abi: marketplaceAbi, functionName: 'buy', args: [listing.id], chainId: avalancheFuji.id, nonce }); setHash(buyHash); await publicClient.waitForTransactionReceipt({ hash: buyHash }); setState('success'); setMessage('NFT 구매에 성공하였습니다.'); await load();
    } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
  };
  const cancel = async (listingId: bigint) => {
    const marketValue = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS; if (!publicClient || !marketValue || !isAddress(marketValue)) return;
    setState('pending'); setMessage('등록 취소를 지갑에서 확인해 주세요.'); try { const cancelHash = await writeContractAsync({ address: getAddress(marketValue), abi: marketplaceAbi, functionName: 'cancel', args: [listingId], chainId: avalancheFuji.id }); setHash(cancelHash); await publicClient.waitForTransactionReceipt({ hash: cancelHash }); setState('success'); setMessage('등록 취소에 성공하였습니다.'); await load(); } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
  };
  if (loading) return <MarketplaceLoadingSkeleton />;
  return <div><div className="border-t border-[#6a5942]">{listings.map((listing) => <article key={listing.id.toString()} className="grid gap-3 border-b border-[#4f4333] py-5 md:grid-cols-[80px_72px_1fr_150px_130px] md:items-center"><span className="font-mono text-xs text-[#8e826f]">AQI #{listing.tokenId.toString()}</span>{listing.metadata.image ? <Image src={listing.metadata.image} alt={listing.metadata.name} width={72} height={72} unoptimized className="aspect-square border border-[#554735]"/> : <div className="h-[72px] w-[72px] border border-[#554735]"/>}<div><strong className="text-[#e5d6b9]">{listing.metadata.name}</strong><p className="mt-1 text-xs text-[#8f8575]">Seller {listing.seller.slice(0, 6)}…{listing.seller.slice(-4)}</p></div><span className="font-mono text-[#d0a55f]">{formatEther(listing.price)} AQT</span>{address?.toLowerCase() === listing.seller.toLowerCase() ? <button disabled={state === 'pending'} onClick={() => void cancel(listing.id)} className="border border-[#7d5555] py-2 text-xs text-[#e0b0a0]">CANCEL</button> : <button disabled={state === 'pending'} onClick={() => void buy(listing)} className="border border-[#796749] py-2 text-xs text-[#d8c6a5]">BUY NFT</button>}</article>)}</div>{listings.length === 0 ? <p className="border border-[#665844] p-5 text-sm text-[#aaa08e]">No active listings yet.</p> : null}{message ? <p className={`mt-4 text-sm ${state === 'error' ? 'text-[#e7aaaa]' : 'text-[#c9d6aa]'}`}>{message}</p> : null}{hash ? <a className="mt-2 block text-xs text-[#c49a5a] underline" href={`https://testnet.snowtrace.io/tx/${hash}`} target="_blank" rel="noreferrer">View latest transaction</a> : null}</div>;
}
