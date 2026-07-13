'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatEther, getAddress, isAddress, parseEther, type Address, type Hex } from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';

import { assetTycoonLicenseAbi, assetTycoonMarketplaceAbi } from '@/features/asset-tycoon/asset-tycoon-contract';
import { gameTokenAbi } from '@/features/skills/skill-contract';
import { transactionErrorMessage } from '@/features/web3/transaction-feedback';

type Listing = { id: bigint; seller: Address; tokenId: bigint; price: bigint };
type TxState = 'idle' | 'pending' | 'success' | 'error';

export function AssetTycoonMarket() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [listings, setListings] = useState<readonly Listing[]>([]);
  const [ownedTokens, setOwnedTokens] = useState<readonly bigint[]>([]);
  const [price, setPrice] = useState('1000');
  const [state, setState] = useState<TxState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);

  const load = useCallback(async () => {
    const licenseValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_LICENSE_ADDRESS;
    const marketValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_MARKETPLACE_ADDRESS;
    if (!publicClient || !licenseValue || !marketValue || !isAddress(licenseValue) || !isAddress(marketValue)) {
      setListings([]); setOwnedTokens([]); return;
    }
    const license = getAddress(licenseValue); const market = getAddress(marketValue);
    const nextId = await publicClient.readContract({ address: market, abi: assetTycoonMarketplaceAbi, functionName: 'nextListingId' });
    const raw = await Promise.all(Array.from({ length: Math.max(0, Number(nextId - 1n)) }, (_, index) => publicClient.readContract({ address: market, abi: assetTycoonMarketplaceAbi, functionName: 'listings', args: [BigInt(index + 1)] })));
    setListings(raw.map((entry, index) => ({ id: BigInt(index + 1), seller: entry[0], tokenId: entry[1], price: entry[2], active: entry[3] })).filter((entry) => entry.active));
    if (!address) { setOwnedTokens([]); return; }
    const balance = await publicClient.readContract({ address: license, abi: assetTycoonLicenseAbi, functionName: 'balanceOf', args: [address] });
    setOwnedTokens(await Promise.all(Array.from({ length: Number(balance) }, (_, index) => publicClient.readContract({ address: license, abi: assetTycoonLicenseAbi, functionName: 'tokenOfOwnerByIndex', args: [address, BigInt(index)] }))));
  }, [address, publicClient]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch(() => setMessage('Could not load Asset Tycoon listings.')), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const list = async (tokenId: bigint) => {
    const licenseValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_LICENSE_ADDRESS; const marketValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_MARKETPLACE_ADDRESS;
    if (!address || !publicClient || !licenseValue || !marketValue || !isAddress(licenseValue) || !isAddress(marketValue)) return;
    let listingPrice: bigint;
    try { listingPrice = parseEther(price); } catch { setState('error'); setMessage('Enter a valid AQT price.'); return; }
    if (listingPrice <= 0n) { setState('error'); setMessage('Price must be greater than zero.'); return; }
    setState('pending');
    try {
      const license = getAddress(licenseValue); const market = getAddress(marketValue);
      const approved = await publicClient.readContract({ address: license, abi: assetTycoonLicenseAbi, functionName: 'isApprovedForAll', args: [address, market] });
      if (!approved) {
        setMessage('Approve license escrow in your wallet.');
        const approval = await writeContractAsync({ address: license, abi: assetTycoonLicenseAbi, functionName: 'setApprovalForAll', args: [market, true], chainId: avalancheFuji.id });
        await publicClient.waitForTransactionReceipt({ hash: approval });
      }
      setMessage('Confirm listing. Class access ends while the NFT is in escrow.');
      const tx = await writeContractAsync({ address: market, abi: assetTycoonMarketplaceAbi, functionName: 'createListing', args: [tokenId, listingPrice], chainId: avalancheFuji.id });
      setHash(tx); await publicClient.waitForTransactionReceipt({ hash: tx }); setState('success'); setMessage('License listed. The seller no longer has class access.'); await load();
    } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
  };

  const buy = async (listing: Listing) => {
    const marketValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_MARKETPLACE_ADDRESS; const tokenValue = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS;
    if (!address || !publicClient || !marketValue || !tokenValue || !isAddress(marketValue) || !isAddress(tokenValue)) return;
    setState('pending');
    try {
      const market = getAddress(marketValue); const token = getAddress(tokenValue);
      const allowance = await publicClient.readContract({ address: token, abi: gameTokenAbi, functionName: 'allowance', args: [address, market] });
      if (allowance < listing.price) {
        const approval = await writeContractAsync({ address: token, abi: gameTokenAbi, functionName: 'approve', args: [market, listing.price], chainId: avalancheFuji.id });
        await publicClient.waitForTransactionReceipt({ hash: approval });
      }
      const tx = await writeContractAsync({ address: market, abi: assetTycoonMarketplaceAbi, functionName: 'buy', args: [listing.id], chainId: avalancheFuji.id });
      setHash(tx); await publicClient.waitForTransactionReceipt({ hash: tx }); setState('success'); setMessage('License purchased. Asset Tycoon is now active for this wallet.'); await load();
    } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
  };

  const cancel = async (listingId: bigint) => {
    const marketValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_MARKETPLACE_ADDRESS;
    if (!publicClient || !marketValue || !isAddress(marketValue)) return;
    setState('pending');
    try {
      const tx = await writeContractAsync({ address: getAddress(marketValue), abi: assetTycoonMarketplaceAbi, functionName: 'cancel', args: [listingId], chainId: avalancheFuji.id });
      setHash(tx); await publicClient.waitForTransactionReceipt({ hash: tx }); setState('success'); setMessage('Listing cancelled. Class access returned to your wallet.'); await load();
    } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
  };

  return (
    <section className="mt-10 rounded-2xl border-2 border-[#cda842] bg-gradient-to-r from-[#302307] via-[#15120b] to-[#302307] p-5">
      <p className="text-[10px] font-black tracking-[.22em] text-[#f2c94c]">APEX CLASS LICENSE MARKET</p>
      <h2 className="mt-2 text-2xl font-black text-[#fff0ad]">Asset Tycoon NFT</h2>
      <p className="mt-2 text-xs font-semibold leading-5 text-[#bbaa81]">The NFT is the class license. Escrow removes the seller&apos;s access; purchase transfers access to the buyer.</p>
      {ownedTokens.map((tokenId) => <div key={tokenId.toString()} className="mt-4 flex flex-col gap-3 rounded-xl border border-[#806d35] bg-black/20 p-4 sm:flex-row sm:items-center"><strong className="text-[#ffe482]">Owned AQTYCOON #{tokenId.toString()}</strong><input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" aria-label="Listing price in AQT" className="min-w-0 flex-1 rounded border border-[#6d6040] bg-[#100e09] px-3 py-2 text-sm text-white"/><button disabled={state === 'pending'} onClick={() => void list(tokenId)} className="rounded border border-[#f2c94c] bg-[#735713] px-5 py-2 text-xs font-black text-white disabled:opacity-50">LIST FOR AQT</button></div>)}
      <div className="mt-5 grid gap-3">{listings.map((listing) => <article key={listing.id.toString()} className="flex flex-col justify-between gap-3 rounded-xl border border-[#665936] bg-[#100e09]/80 p-4 sm:flex-row sm:items-center"><div><strong className="text-[#fff0ad]">Asset Tycoon #{listing.tokenId.toString()}</strong><p className="mt-1 text-xs text-[#9f9478]">Seller {listing.seller.slice(0, 6)}…{listing.seller.slice(-4)}</p></div><span className="font-mono font-bold text-[#f2c94c]">{formatEther(listing.price)} AQT</span>{address?.toLowerCase() === listing.seller.toLowerCase() ? <button disabled={state === 'pending'} onClick={() => void cancel(listing.id)} className="rounded border border-[#9c6666] px-5 py-2 text-xs font-bold text-[#efb0a5]">CANCEL</button> : <button disabled={!address || state === 'pending'} onClick={() => void buy(listing)} className="rounded border border-[#f2c94c] bg-[#735713] px-5 py-2 text-xs font-black text-white disabled:opacity-50">BUY LICENSE</button>}</article>)}</div>
      {listings.length === 0 ? <p className="mt-4 text-xs font-semibold text-[#8f8466]">No Asset Tycoon licenses are currently listed.</p> : null}
      {message ? <p className={`mt-4 text-xs font-semibold ${state === 'error' ? 'text-[#efaaa2]' : 'text-[#d7c99f]'}`}>{message}</p> : null}
      {hash ? <a className="mt-2 block text-xs text-[#ffe482] underline" href={`https://testnet.snowtrace.io/tx/${hash}`} target="_blank" rel="noreferrer">View transaction</a> : null}
    </section>
  );
}
