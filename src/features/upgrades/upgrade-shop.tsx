'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { formatEther, getAddress, isAddress, type Hex } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';

import { gameTokenAbi } from '@/features/skills/skill-contract';
import { characterUpgradeAbi, upgradeDefinitions, type UpgradeLevels } from '@/features/upgrades/upgrade-contract';
import { transactionErrorMessage } from '@/features/web3/transaction-feedback';

type TxState = 'idle' | 'pending' | 'success' | 'error';
type Props = { onLevelsChange: (levels: UpgradeLevels) => void; disabled?: boolean; refreshKey?: number };
const emptyLevels: UpgradeLevels = { attack: 0, vitality: 0, defense: 0 };
const CHARACTER_UPGRADE_MAX_LEVEL = 20;

export function UpgradeShop({ onLevelsChange, disabled = false, refreshKey = 0 }: Props) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [levels, setLevels] = useState<UpgradeLevels>(emptyLevels);
  const [prices, setPrices] = useState<readonly bigint[]>([0n, 0n, 0n]);
  const [state, setState] = useState<TxState>('idle');
  const [active, setActive] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const value = process.env.NEXT_PUBLIC_CHARACTER_UPGRADE_ADDRESS;
    if (!address || !publicClient || !value || !isAddress(value)) { setLevels(emptyLevels); onLevelsChange(emptyLevels); return; }
    const contract = getAddress(value);
    const next = await Promise.all(upgradeDefinitions.map((entry) => publicClient.readContract({ address: contract, abi: characterUpgradeAbi, functionName: 'levels', args: [address, entry.id] })));
    const nextLevels: UpgradeLevels = { attack: Number(next[0] ?? 0), vitality: Number(next[1] ?? 0), defense: Number(next[2] ?? 0) };
    const nextPrices = await Promise.all(upgradeDefinitions.map((entry) => publicClient.readContract({ address: contract, abi: characterUpgradeAbi, functionName: 'priceFor', args: [entry.id, next[entry.id] ?? 0] })));
    setLevels(nextLevels); setPrices(nextPrices); onLevelsChange(nextLevels);
  }, [address, onLevelsChange, publicClient]);

  useEffect(() => { const timeout = window.setTimeout(() => void refresh().catch(() => setMessage('Could not load upgrade information.')), 0); return () => window.clearTimeout(timeout); }, [refresh, refreshKey]);

  const purchase = async (index: 0 | 1 | 2) => {
    const upgradeValue = process.env.NEXT_PUBLIC_CHARACTER_UPGRADE_ADDRESS;
    const tokenValue = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS;
    if (!address || !publicClient || !upgradeValue || !tokenValue || !isAddress(upgradeValue) || !isAddress(tokenValue)) { setState('error'); setMessage('Upgrade contract configuration is missing.'); return; }
    if (chainId !== avalancheFuji.id) { setState('error'); setMessage('Switch to the Avalanche Fuji network.'); return; }
    const price = prices[index] ?? 0n;
    if (price === 0n) return;
    setState('pending'); setActive(upgradeDefinitions[index].key); setMessage('Checking AQT spending approval.');
    try {
      const upgrade = getAddress(upgradeValue); const token = getAddress(tokenValue);
      const allowance = await publicClient.readContract({ address: token, abi: gameTokenAbi, functionName: 'allowance', args: [address, upgrade] });
      if (allowance < price) {
        const approvalHash = await writeContractAsync({ address: token, abi: gameTokenAbi, functionName: 'approve', args: [upgrade, price], chainId: avalancheFuji.id });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }
      setMessage('Confirm the upgrade transaction in your wallet.');
      const nonce = await publicClient.getTransactionCount({ address, blockTag: 'pending' });
      const hash: Hex = await writeContractAsync({ address: upgrade, abi: characterUpgradeAbi, functionName: 'purchaseUpgrade', args: [index], chainId: avalancheFuji.id, nonce });
      await publicClient.waitForTransactionReceipt({ hash });
      setState('success'); setMessage('Upgrade complete. It will apply from the next stage.'); await refresh();
    } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
    finally { setActive(null); }
  };

  return (
    <section className="mb-4 border border-[#756747] bg-[#211b15] p-4">
      <div className="flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <div><p className="text-[10px] font-bold tracking-[.2em] text-[#c49a5a]">AQT CHARACTER FORGE</p><h2 className="mt-2 text-lg font-extrabold text-[#eadcc0]">Character Upgrades</h2></div>
        <span className="text-xs font-semibold text-[#9f9583]">Maximum Level {CHARACTER_UPGRADE_MAX_LEVEL}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {upgradeDefinitions.map((entry) => {
          const level = levels[entry.key]; const price = prices[entry.id] ?? 0n;
          return <article key={entry.key} className="upgrade-card group relative overflow-hidden rounded-xl border border-[#6f5a38] bg-gradient-to-br from-[#282015] via-[#17130f] to-[#0d0b08] p-4 shadow-[inset_0_1px_0_rgba(255,224,161,.12),0_12px_30px_rgba(31,20,7,.22)] transition duration-300 hover:-translate-y-1 hover:border-[#d0a55f] hover:shadow-[inset_0_1px_0_rgba(255,233,184,.22),0_16px_38px_rgba(154,103,40,.28)] sm:p-5">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[#d0a55f]/10 blur-3xl transition duration-500 group-hover:bg-[#d0a55f]/20" />
            <div aria-hidden className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
            <span aria-hidden className="absolute right-5 top-4 text-lg text-[#f2c66d]/35 transition group-hover:text-[#f2c66d]">✦</span>
            <span aria-hidden className="absolute bottom-16 right-9 text-[10px] text-[#f2c66d]/20 transition delay-100 group-hover:text-[#f2c66d]/80">◆</span>
            <div className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="relative shrink-0 rounded-lg border border-[#80683f] bg-[#0b0907] p-1 shadow-[0_0_20px_rgba(208,165,95,.14)] transition group-hover:shadow-[0_0_26px_rgba(208,165,95,.35)]"><Image src={`/assets/upgrades/${entry.key}.png`} alt={entry.name} width={72} height={72} className="size-[72px] rounded-md object-cover" unoptimized /><span className="absolute inset-1 rounded-md ring-1 ring-inset ring-white/10" /></div>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><strong className="min-w-0 text-base font-extrabold !text-[#fff4dc] [text-shadow:0_2px_3px_rgba(0,0,0,.95)] sm:text-lg">{entry.name}</strong><span className="inline-flex min-w-11 shrink-0 items-center justify-center rounded-md border border-[#c99a48] bg-gradient-to-b from-[#8a581b] to-[#4d2e0d] px-2.5 py-1 font-mono text-base font-bold text-[#fff2b8] shadow-[inset_0_1px_0_rgba(255,241,188,.25),0_0_14px_rgba(208,165,95,.3)] sm:min-w-12 sm:px-3 sm:text-lg">+{level}</span></div><div className="mt-4 grid grid-cols-10 gap-1">{Array.from({ length: CHARACTER_UPGRADE_MAX_LEVEL }, (_, index) => <span key={index} className={`h-2 rounded-full border ${index < level ? 'border-[#f2c66d] bg-gradient-to-r from-[#a66b20] to-[#f2c66d] shadow-[0_0_9px_rgba(242,198,109,.6)]' : 'border-[#4a4032] bg-[#29231b]'}`}/>)}</div></div>
            </div>
            <p className="relative z-10 mt-4 min-h-10 text-xs leading-5 text-white">{entry.description}</p>
            <button type="button" disabled={disabled || state === 'pending' || level >= CHARACTER_UPGRADE_MAX_LEVEL} onClick={() => void purchase(entry.id)} className="relative z-10 mt-4 w-full rounded-md border border-[#8c7146] bg-[#211a11] py-2.5 text-xs font-bold text-[#ead4ad] transition hover:border-[#d0a55f] hover:bg-[#342718] hover:text-white disabled:opacity-50">{level >= CHARACTER_UPGRADE_MAX_LEVEL ? 'MAX LEVEL' : active === entry.key ? 'UPGRADING...' : `UPGRADE FOR ${formatEther(price)} AQT`}</button>
          </article>;
        })}
      </div>
      {message ? <p className={`mt-3 text-xs ${state === 'error' ? 'text-[#e7aaaa]' : 'text-[#c9d6aa]'}`}>{message}</p> : null}
    </section>
  );
}
