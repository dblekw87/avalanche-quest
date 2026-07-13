'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { formatEther, getAddress, isAddress, type Hex } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';

import { aegisArmor, archerSkills, armorEnhancementAbi, brawlerSkills, dragonknightSkills, dualbladeSkills, gameTokenAbi, gunslingerSkills, mageSkills, skillEnhancementAbi, skillShopAbi, skills, spellbladeSkills, warriorSkills } from '@/features/skills/skill-contract';
import { transactionErrorMessage } from '@/features/web3/transaction-feedback';
import type { GeneralCharacterId } from '@/game/characters';

type PurchaseState = 'idle' | 'pending' | 'success' | 'error';
type Purchasable = { id: Hex; slug: string; name: string; price: bigint; key?: string };
type SkillShopProps = {
  onOwnershipChange: (ownedSkillIds: readonly string[]) => void;
  onArmorOwnershipChange: (owned: boolean) => void;
  refreshKey: string;
  characterId: GeneralCharacterId;
  onSkillLevelsChange: (levels: Readonly<Record<string, number>>) => void;
  onArmorLevelChange: (level: number) => void;
  onBalanceChange: (balance: bigint) => void;
};

const SKILL_ENHANCEMENT_BASE_PRICE_AQT = 20;
const SKILL_ENHANCEMENT_MAX_LEVEL = 7;
const PURPLE_ARMOR_FRAME_CLASSES = [
  'border-[#6f617d] shadow-[0_0_12px_rgba(126,92,166,.18)]',
  'border-[#8062a4] shadow-[0_0_16px_rgba(139,92,246,.25)]',
  'border-[#915bd0] shadow-[0_0_20px_rgba(147,51,234,.34)]',
  'border-[#a855f7] shadow-[0_0_24px_rgba(168,85,247,.43)]',
  'border-[#c084fc] shadow-[0_0_28px_rgba(192,132,252,.52)]',
  'border-[#e9d5ff] shadow-[0_0_34px_rgba(192,132,252,.68)]',
] as const;

function skillEnhancementPriceAqt(currentLevel: number): number {
  return SKILL_ENHANCEMENT_BASE_PRICE_AQT * 2 ** currentLevel;
}

export function SkillShop({ onOwnershipChange, onArmorOwnershipChange, onSkillLevelsChange, onArmorLevelChange, onBalanceChange, refreshKey, characterId }: SkillShopProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [ownedIds, setOwnedIds] = useState<readonly string[]>([]);
  const [balance, setBalance] = useState<bigint>(0n);
  const [armorOwned, setArmorOwned] = useState(false);
  const [armorLevel, setArmorLevel] = useState(0);
  const [skillLevels, setSkillLevels] = useState<Readonly<Record<string, number>>>({});
  const [state, setState] = useState<PurchaseState>('idle');
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const activeSkills = characterId === 'warrior' ? warriorSkills
    : characterId === 'mage' ? mageSkills
      : characterId === 'spellblade' ? spellbladeSkills
        : characterId === 'archer' ? archerSkills
          : characterId === 'dualblade' ? dualbladeSkills
            : characterId === 'brawler' ? brawlerSkills
              : characterId === 'dragonknight' ? dragonknightSkills
                : gunslingerSkills;
  const classLabel = characterId === 'warrior' ? 'Warrior Skills'
    : characterId === 'mage' ? 'Mage Skills'
      : characterId === 'spellblade' ? 'Spellblade Skills'
        : characterId === 'archer' ? 'Archer Skills'
          : characterId === 'dualblade' ? 'Dualblade Skills'
            : characterId === 'brawler' ? 'Brawler Skills'
              : characterId === 'dragonknight' ? 'Dragon Knight Skills'
                : 'Gunslinger Skills';

  const skillCardFrame = characterId === 'spellblade'
    ? 'border-[#9d67e8] shadow-[inset_0_0_18px_rgba(126,68,196,.12),0_0_12px_rgba(126,68,196,.18)]'
    : characterId === 'archer'
      ? 'border-[#72c96a] shadow-[inset_0_0_18px_rgba(75,170,86,.12),0_0_12px_rgba(75,170,86,.18)]'
      : characterId === 'dualblade'
        ? 'border-[#62dff4] shadow-[inset_0_0_16px_rgba(98,223,244,.12),0_0_12px_rgba(98,223,244,.18)]'
        : characterId === 'brawler'
          ? 'border-[#f2a640] shadow-[inset_0_0_16px_rgba(242,166,64,.12),0_0_12px_rgba(242,166,64,.18)]'
          : characterId === 'dragonknight'
            ? 'border-[#ff6847] shadow-[inset_0_0_16px_rgba(255,90,54,.13),0_0_12px_rgba(255,90,54,.2)]'
            : characterId === 'gunslinger'
              ? 'border-[#65e7ff] shadow-[inset_0_0_16px_rgba(101,231,255,.12),0_0_12px_rgba(101,231,255,.2)]'
              : 'border-[#455238]';
  const skillAreaFrame = characterId === 'warrior'
    ? 'border-[#9b5e35] shadow-[inset_0_0_24px_rgba(155,94,53,.12)]'
    : characterId === 'mage'
      ? 'border-[#527ec7] shadow-[inset_0_0_24px_rgba(82,126,199,.12)]'
      : characterId === 'spellblade'
        ? 'border-[#8f5bd0] shadow-[inset_0_0_26px_rgba(143,91,208,.16)]'
        : characterId === 'archer'
          ? 'border-[#62ad5c] shadow-[inset_0_0_26px_rgba(98,173,92,.16)]'
          : characterId === 'dualblade'
            ? 'border-[#3aaec9] shadow-[inset_0_0_28px_rgba(58,174,201,.16)]'
            : characterId === 'brawler'
              ? 'border-[#c5792c] shadow-[inset_0_0_28px_rgba(197,121,44,.16)]'
              : characterId === 'dragonknight'
                ? 'border-[#b83c27] shadow-[inset_0_0_28px_rgba(255,90,54,.18)]'
                : 'border-[#318da1] shadow-[inset_0_0_28px_rgba(101,231,255,.17)]';
  const skillIconFrame = characterId === 'spellblade'
    ? 'border-[#ad7af0] shadow-[0_0_16px_rgba(157,103,232,.32)]'
    : characterId === 'archer'
      ? 'border-[#82dc77] shadow-[0_0_16px_rgba(114,201,106,.30)]'
      : characterId === 'dualblade'
        ? 'border-[#62dff4] shadow-[0_0_16px_rgba(98,223,244,.30)]'
        : characterId === 'brawler'
          ? 'border-[#f2a640] shadow-[0_0_16px_rgba(242,166,64,.30)]'
          : characterId === 'dragonknight'
            ? 'border-[#ff6847] shadow-[0_0_16px_rgba(255,90,54,.32)]'
            : characterId === 'gunslinger'
              ? 'border-[#65e7ff] shadow-[0_0_16px_rgba(101,231,255,.3)]'
              : 'border-[#665844] shadow-[0_0_14px_rgba(120,170,255,.14)]';
  const skillImageFrame = characterId === 'spellblade'
    ? 'rounded border-2 border-[#c08cff] shadow-[inset_0_0_10px_rgba(90,36,145,.65),0_0_10px_rgba(192,140,255,.38)]'
    : characterId === 'archer'
      ? 'rounded border-2 border-[#8ee784] shadow-[inset_0_0_10px_rgba(30,96,43,.65),0_0_10px_rgba(142,231,132,.36)]'
      : characterId === 'dualblade'
        ? 'rounded border-2 border-[#75e7f7] shadow-[inset_0_0_10px_rgba(20,96,120,.65),0_0_10px_rgba(117,231,247,.36)]'
        : characterId === 'brawler'
          ? 'rounded border-2 border-[#ffb74d] shadow-[inset_0_0_10px_rgba(110,58,12,.65),0_0_10px_rgba(255,183,77,.36)]'
          : characterId === 'dragonknight'
            ? 'rounded border-2 border-[#ff7252] shadow-[inset_0_0_10px_rgba(105,24,15,.65),0_0_10px_rgba(255,114,82,.38)]'
            : characterId === 'gunslinger'
              ? 'rounded border-2 border-[#78edff] shadow-[inset_0_0_10px_rgba(15,75,90,.65),0_0_10px_rgba(120,237,255,.38)]'
              : 'rounded border border-[#78694f]';
  const usesPurpleArmorFrame = characterId === 'spellblade' || characterId === 'archer';
  const armorFrameClass = usesPurpleArmorFrame
    ? PURPLE_ARMOR_FRAME_CLASSES[Math.min(armorLevel, PURPLE_ARMOR_FRAME_CLASSES.length - 1)]
    : 'border-[#d0b47a] shadow-[0_0_22px_rgba(239,189,88,.25)]';

  const refresh = useCallback(async () => {
    const tokenValue = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS;
    const shopValue = process.env.NEXT_PUBLIC_SKILL_SHOP_ADDRESS;
    const enhancementValue = process.env.NEXT_PUBLIC_SKILL_ENHANCEMENT_ADDRESS;
    const armorEnhancementValue = process.env.NEXT_PUBLIC_ARMOR_ENHANCEMENT_ADDRESS;
    if (!address || !publicClient || !tokenValue || !shopValue || !isAddress(tokenValue) || !isAddress(shopValue)) {
      setOwnedIds([]); setBalance(0n); setArmorOwned(false); setArmorLevel(0); setSkillLevels({}); onOwnershipChange([]); onArmorOwnershipChange(false); onSkillLevelsChange({}); onArmorLevelChange(0); onBalanceChange(0n); return;
    }
    const [nextBalance, ...ownership] = await Promise.all([
      publicClient.readContract({ address: getAddress(tokenValue), abi: gameTokenAbi, functionName: 'balanceOf', args: [address] }),
      ...skills.map((entry) => publicClient.readContract({ address: getAddress(shopValue), abi: skillShopAbi, functionName: 'hasSkill', args: [address, entry.id] })),
      publicClient.readContract({ address: getAddress(shopValue), abi: skillShopAbi, functionName: 'hasSkill', args: [address, aegisArmor.id] }),
    ]);
    const nextOwned = skills.filter((_, index) => ownership[index]).map((entry) => entry.slug);
    const nextArmorOwned = ownership[skills.length] ?? false;
    let nextSkillLevels: Readonly<Record<string, number>> = {};
    if (enhancementValue && isAddress(enhancementValue)) {
      const values = await Promise.all(skills.map((entry) => publicClient.readContract({ address: getAddress(enhancementValue), abi: skillEnhancementAbi, functionName: 'levels', args: [address, entry.id] })));
      nextSkillLevels = Object.fromEntries(skills.map((entry, index) => [entry.slug, Number(values[index] ?? 0)]));
    }
    const nextArmorLevel = armorEnhancementValue && isAddress(armorEnhancementValue)
      ? Number(await publicClient.readContract({ address: getAddress(armorEnhancementValue), abi: armorEnhancementAbi, functionName: 'levels', args: [address] }))
      : 0;
    setBalance(nextBalance); setOwnedIds(nextOwned); setArmorOwned(nextArmorOwned); setArmorLevel(nextArmorLevel); setSkillLevels(nextSkillLevels); onOwnershipChange(nextOwned); onArmorOwnershipChange(nextArmorOwned); onSkillLevelsChange(nextSkillLevels); onArmorLevelChange(nextArmorLevel); onBalanceChange(nextBalance);
  }, [address, onArmorLevelChange, onArmorOwnershipChange, onBalanceChange, onOwnershipChange, onSkillLevelsChange, publicClient]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh().catch(() => setMessage('Could not load skill ownership.')), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh, refreshKey]);

  const purchase = async (entry: Purchasable) => {
    const tokenValue = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS;
    const shopValue = process.env.NEXT_PUBLIC_SKILL_SHOP_ADDRESS;
    if (!address || !publicClient || !tokenValue || !shopValue || !isAddress(tokenValue) || !isAddress(shopValue)) {
      setState('error'); setMessage('Skill shop contract configuration is missing.'); return;
    }
    if (chainId !== avalancheFuji.id) { setState('error'); setMessage('Switch to Avalanche Fuji before purchasing.'); return; }
    if (balance < entry.price) { setState('error'); setMessage(`You need ${formatEther(entry.price)} AQT for ${entry.name}.`); return; }

    setState('pending'); setActiveSkill(entry.slug); setMessage(null);
    try {
      const shopAddress = getAddress(shopValue);
      const tokenAddress = getAddress(tokenValue);
      const allowance = await publicClient.readContract({ address: tokenAddress, abi: gameTokenAbi, functionName: 'allowance', args: [address, shopAddress] });
      if (allowance < entry.price) {
        setMessage(`Confirm permission to use ${formatEther(entry.price)} AQT in your wallet.`);
        const approvalHash = await writeContractAsync({ address: tokenAddress, abi: gameTokenAbi, functionName: 'approve', args: [shopAddress, entry.price], chainId: avalancheFuji.id });
        setHash(approvalHash); await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }
      setMessage(`Confirm the ${entry.name} purchase in your wallet.`);
      const nonce = await publicClient.getTransactionCount({ address, blockTag: 'pending' });
      const purchaseHash = await writeContractAsync({ address: shopAddress, abi: skillShopAbi, functionName: 'purchaseSkill', args: [entry.id], chainId: avalancheFuji.id, nonce });
      setHash(purchaseHash); await publicClient.waitForTransactionReceipt({ hash: purchaseHash });
      setState('success'); setMessage(entry.key ? `${entry.name} purchased. Use the ${entry.key} key during a stage.` : `${entry.name} purchased and equipped.`); await refresh();
    } catch (error) {
      setState('error'); setMessage(transactionErrorMessage(error));
    } finally { setActiveSkill(null); }
  };

  const enhanceSkill = async (entry: Purchasable) => {
    const tokenValue = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS;
    const enhancementValue = process.env.NEXT_PUBLIC_SKILL_ENHANCEMENT_ADDRESS;
    if (!address || !publicClient || !tokenValue || !enhancementValue || !isAddress(tokenValue) || !isAddress(enhancementValue)) { setState('error'); setMessage('Skill enhancement contract configuration is missing.'); return; }
    if (chainId !== avalancheFuji.id) { setState('error'); setMessage('Switch to Avalanche Fuji before enhancing.'); return; }
    const level = skillLevels[entry.slug] ?? 0;
    if (level >= SKILL_ENHANCEMENT_MAX_LEVEL) return;
    const enhancement = getAddress(enhancementValue); const token = getAddress(tokenValue);
    const price = await publicClient.readContract({ address: enhancement, abi: skillEnhancementAbi, functionName: 'priceFor', args: [level] });
    if (balance < price) { setState('error'); setMessage(`You need ${formatEther(price)} AQT.`); return; }
    setState('pending'); setActiveSkill(`enhance:${entry.slug}`); setMessage(`Preparing the ${entry.name} +${level + 1} enhancement.`);
    try {
      const allowance = await publicClient.readContract({ address: token, abi: gameTokenAbi, functionName: 'allowance', args: [address, enhancement] });
      if (allowance < price) { const approvalHash = await writeContractAsync({ address: token, abi: gameTokenAbi, functionName: 'approve', args: [enhancement, price], chainId: avalancheFuji.id }); await publicClient.waitForTransactionReceipt({ hash: approvalHash }); }
      const nonce = await publicClient.getTransactionCount({ address, blockTag: 'pending' });
      const enhancementHash = await writeContractAsync({ address: enhancement, abi: skillEnhancementAbi, functionName: 'enhanceSkill', args: [entry.id], chainId: avalancheFuji.id, nonce });
      setHash(enhancementHash); await publicClient.waitForTransactionReceipt({ hash: enhancementHash });
      setState('success'); setMessage(`${entry.name} successfully enhanced to +${level + 1}.`); await refresh();
    } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
    finally { setActiveSkill(null); }
  };

  const enhanceArmor = async () => {
    const enhancementValue = process.env.NEXT_PUBLIC_ARMOR_ENHANCEMENT_ADDRESS;
    const tokenValue = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS;
    if (!armorOwned) { setState('error'); setMessage('Purchase the armor first.'); return; }
    if (!address || !publicClient || !enhancementValue || !tokenValue || !isAddress(enhancementValue) || !isAddress(tokenValue)) { setState('error'); setMessage('Armor enhancement contract configuration is missing.'); return; }
    if (chainId !== avalancheFuji.id) { setState('error'); setMessage('Switch to the Avalanche Fuji network.'); return; }
    if (armorLevel >= 5) return;
    const enhancement = getAddress(enhancementValue); const token = getAddress(tokenValue);
    setState('pending'); setActiveSkill('armor-enhance'); setMessage('Checking the armor enhancement cost.');
    try {
      const price = await publicClient.readContract({ address: enhancement, abi: armorEnhancementAbi, functionName: 'priceFor', args: [armorLevel] });
      if (balance < price) throw new Error(`Armor +${armorLevel + 1} requires ${formatEther(price)} AQT.`);
      const allowance = await publicClient.readContract({ address: token, abi: gameTokenAbi, functionName: 'allowance', args: [address, enhancement] });
      if (allowance < price) {
        setMessage(`Confirm permission to use ${formatEther(price)} AQT.`);
        const approvalHash = await writeContractAsync({ address: token, abi: gameTokenAbi, functionName: 'approve', args: [enhancement, price], chainId: avalancheFuji.id });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }
      setMessage(`Confirm the Armor +${armorLevel + 1} enhancement in your wallet.`);
      const nonce = await publicClient.getTransactionCount({ address, blockTag: 'pending' });
      const upgradeHash = await writeContractAsync({ address: enhancement, abi: armorEnhancementAbi, functionName: 'enhanceArmor', chainId: avalancheFuji.id, nonce });
      setHash(upgradeHash); await publicClient.waitForTransactionReceipt({ hash: upgradeHash });
      setState('success'); setMessage(`Armor enhancement +${armorLevel + 1} completed.`); await refresh();
    } catch (error) { setState('error'); setMessage(transactionErrorMessage(error)); }
    finally { setActiveSkill(null); }
  };

  return (
    <section className="mb-4 border border-[#5d684d] bg-[#171c14] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] tracking-[.2em] text-[#9dbb63]">SKILL ALTAR · {formatEther(balance)} AQT</p>
        <strong className={`rounded-full px-3 py-1 text-xs ${characterId === 'warrior' ? 'bg-[#71301f] text-[#ffd08a]' : 'bg-[#263b73] text-[#bfe8ff]'}`}>
          {classLabel}
        </strong>
      </div>
      <div className={`mt-3 grid gap-2 border-2 bg-[#0d120c]/70 p-2 lg:grid-cols-5 ${skillAreaFrame}`}>
        {activeSkills.map((entry) => {
          const owned = ownedIds.includes(entry.slug);
          const iconSource = characterId === 'spellblade'
            ? `/assets/skill-effects-new/${entry.slug}-v2.png`
            : characterId === 'archer'
              ? `/assets/skill-effects-new/${entry.slug}.png`
              : characterId === 'dualblade' || characterId === 'brawler' || characterId === 'dragonknight' || characterId === 'gunslinger'
                ? `/assets/new-class-skills/${entry.slug}.png`
                : `/assets/skills-v2/${entry.slug}.png`;
          return <article key={entry.slug} className={`flex flex-col border-2 bg-[#11160f] p-3 transition-shadow ${skillCardFrame} ${owned ? 'ring-1 ring-inset ring-white/20' : ''}`}>
            <div className="mb-3 flex flex-col items-center gap-2 text-center">
              <div className={`flex size-14 shrink-0 items-center justify-center rounded-md border-2 bg-black ${skillIconFrame}`}>
                <Image
                  src={iconSource}
                  alt={`${entry.name} skill icon`}
                  width={48}
                  height={48}
                  className={`size-12 object-contain ${skillImageFrame} ${characterId === 'archer' ? 'brightness-125 saturate-150 hue-rotate-[8deg]' : ''}`}
                  unoptimized
                />
              </div>
              <span className="text-[10px] text-[#9dbb63]">{entry.key} · {formatEther(entry.price)} AQT</span>
            </div>
            <strong className="mt-2 text-[#e6d7ba]">{entry.name}</strong>
            <p className="mt-1 flex-1 text-xs leading-5 text-[#9f9583]">{entry.description}</p>
            <button type="button" onClick={() => void purchase(entry)} disabled={owned || state === 'pending'} className="mt-3 border border-[#a7c465] bg-[#52682f] px-3 py-2 text-xs font-bold text-[#f1f7de] disabled:opacity-50">
              {owned ? 'OWNED' : activeSkill === entry.slug ? 'PURCHASING…' : 'BUY'}
            </button>
            <button type="button" onClick={() => void enhanceSkill(entry)} disabled={!owned || state === 'pending' || (skillLevels[entry.slug] ?? 0) >= SKILL_ENHANCEMENT_MAX_LEVEL} className="mt-2 rounded border border-[#d0a55f] bg-[#3a2711] px-3 py-2 text-xs font-bold text-[#ffe2a1] shadow-[0_0_12px_rgba(208,165,95,.16)] disabled:opacity-40">
              {(skillLevels[entry.slug] ?? 0) >= SKILL_ENHANCEMENT_MAX_LEVEL ? 'MAX ENHANCEMENT' : activeSkill === `enhance:${entry.slug}` ? 'ENHANCING…' : `ENHANCE +${(skillLevels[entry.slug] ?? 0)}/${SKILL_ENHANCEMENT_MAX_LEVEL} · ${skillEnhancementPriceAqt(skillLevels[entry.slug] ?? 0)} AQT`}
            </button>
          </article>;
        })}
      </div>
      <div className={`mt-3 flex flex-col items-center justify-between gap-5 border-2 bg-[#211b12] p-4 text-center sm:flex-row sm:text-left ${usesPurpleArmorFrame ? 'border-[#9b63d4] shadow-[inset_0_0_24px_rgba(139,92,246,.14),0_0_14px_rgba(139,92,246,.16)]' : 'border-[#9a7b45] shadow-[inset_0_0_22px_rgba(208,180,122,.10)]'}`}>
        <div className="flex flex-col items-center gap-4 sm:flex-row"><div className={`relative size-20 shrink-0 overflow-hidden rounded-xl border-2 bg-black transition-all duration-300 ${armorFrameClass}`}><Image src={`/assets/armor-tiers/armor-${armorLevel}.png`} alt={`Aegis Armor enhancement level ${armorLevel}`} width={80} height={80} unoptimized className={`size-full rounded-lg border-2 object-contain ${armorFrameClass}`}/></div><div><span className="text-[10px] font-bold tracking-[.18em] text-[#d0b47a]">SEPARATE ARMOR FORGE · +{armorLevel}/5</span><strong className="mt-2 block font-extrabold text-[#f0dfbd]">{aegisArmor.name}</strong><p className="mt-1 text-xs font-medium text-[#a99c87]">Evolves separately from character upgrades. Each level improves armor power and its exclusive particles.</p></div></div>
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:mx-0 sm:w-auto sm:min-w-64"><button type="button" onClick={() => void purchase(aegisArmor)} disabled={armorOwned || state === 'pending'} className="w-full border border-[#d0b47a] bg-[#6b512e] px-7 py-3.5 text-xs font-bold text-[#fff0d1] disabled:opacity-50">{armorOwned ? 'OWNED · EQUIPPED' : activeSkill === aegisArmor.slug ? 'PURCHASING…' : 'BUY ARMOR'}</button><button type="button" onClick={() => void enhanceArmor()} disabled={!armorOwned || state === 'pending' || armorLevel >= 5} className="w-full border border-[#efbd58] bg-gradient-to-r from-[#6e3f12] to-[#9a6728] px-7 py-3.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(239,189,88,.22)] disabled:opacity-40">{activeSkill === 'armor-enhance' ? 'ENHANCING ARMOR…' : armorLevel >= 5 ? 'ARMOR MAX' : `ENHANCE ARMOR +${armorLevel + 1} · ${200 + armorLevel * 200} AQT`}</button></div>
      </div>
      {message ? <p className={`mt-3 text-xs ${state === 'error' ? 'text-[#e7aaaa]' : 'text-[#c9d6aa]'}`}>{message}</p> : null}
      {hash ? <a className="mt-2 block text-xs text-[#c49a5a] underline" href={`https://testnet.snowtrace.io/tx/${hash}`} target="_blank" rel="noreferrer">View latest transaction on Snowtrace</a> : null}
    </section>
  );
}
