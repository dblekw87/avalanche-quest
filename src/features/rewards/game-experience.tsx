'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, getAddress, isAddress, isHex, type Hex } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';

import { rewardDistributorAbi } from '@/features/rewards/reward-contract';
import { assetTycoonSkills } from '@/game/asset-tycoon';
import { assetTycoonLicenseAbi } from '@/features/asset-tycoon/asset-tycoon-contract';

// Local gameplay/VFX test switch only. Contract ownership, minting and marketplace
// authorization continue to use the on-chain license checks below.
const ASSET_TYCOON_LOCAL_TEST_UNLOCK = process.env.NODE_ENV === 'development';
import { gameItemAbi } from '@/features/items/item-contract';
import { SkillShop } from '@/features/skills/skill-shop';
import { UpgradeShop } from '@/features/upgrades/upgrade-shop';
import type { UpgradeLevels } from '@/features/upgrades/upgrade-contract';
import { transactionErrorMessage } from '@/features/web3/transaction-feedback';
import type { StageFailure, StageResult } from '@/game/bridge/events';
import { isGeneralCharacter, isPoliticalCharacter, isSecretCharacter, type CharacterGroup, type CharacterId } from '@/game/characters';
import { stageIds, stages, type StageId } from '@/game/config/stages';
import { GameCanvas } from '@/game/game-canvas';
import { PoliticalDuelCanvas } from '@/game/political-duel/political-duel-canvas';
import { politicalFighters, type PoliticalFaction } from '@/game/political-duel/definitions';

type TransactionState = 'idle' | 'pending' | 'success' | 'error';

type AuthorizedReward = {
  claim: {
    claimId: Hex;
    attemptId: Hex;
    player: Hex;
    tokenAmount: string;
    nonce: string;
    deadline: string;
  };
  signature: Hex;
  loot: AuthorizedLoot | null;
  assetTycoon: AuthorizedAssetTycoon | null;
};

type AuthorizedAssetTycoon = {
  claim: { claimId: Hex; attemptId: Hex; player: Hex; nonce: string; deadline: string };
  signature: Hex;
};

type AuthorizedLoot = {
  claim: { claimId: Hex; attemptId: Hex; player: Hex; itemType: number; rarity: number; power: number; metadataHash: Hex; nonce: string; deadline: string };
  metadataURI: string; signature: Hex; name: string; rarityName: string; typeName: string;
};

type AttemptAuthorization = {
  attemptId: Hex;
  player: Hex;
  stageId: StageId;
  expiresAt: number;
  signature: Hex;
};

type CreatedAttempt = {
  attemptId: string;
  authorization: AttemptAuthorization;
};

type PendingSelection =
  | { kind: 'class'; characterId: CharacterId; characterGroup: CharacterGroup }
  | { kind: 'stage'; stageId: StageId };

export function GameExperience() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [stageId, setStageId] = useState<StageId>('verdant-pass');
  const [characterId, setCharacterId] = useState<CharacterId>('warrior');
  const [characterGroup, setCharacterGroup] = useState<CharacterGroup>('general');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptAuthorization, setAttemptAuthorization] = useState<AttemptAuthorization | null>(null);
  const [result, setResult] = useState<StageResult | null>(null);
  const [failure, setFailure] = useState<StageFailure | null>(null);
  const [starting, setStarting] = useState(false);
  const [transactionState, setTransactionState] = useState<TransactionState>('idle');
  const [transactionHash, setTransactionHash] = useState<Hex | null>(null);
  const [loot, setLoot] = useState<AuthorizedLoot | null>(null);
  const [lootTransactionState, setLootTransactionState] = useState<TransactionState>('idle');
  const [lootHash, setLootHash] = useState<Hex | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ownedSkillIds, setOwnedSkillIds] = useState<readonly string[]>([]);
  const [armorOwned, setArmorOwned] = useState(false);
  const [armorLevel, setArmorLevel] = useState(0);
  const [aqtBalance, setAqtBalance] = useState<bigint>(0n);
  const [showAdvancePrompt, setShowAdvancePrompt] = useState(false);
  const [upgradeLevels, setUpgradeLevels] = useState<UpgradeLevels>({ attack: 0, vitality: 0, defense: 0 });
  const [skillUpgradeLevels, setSkillUpgradeLevels] = useState<Readonly<Record<string, number>>>({});
  const [duelFaction, setDuelFaction] = useState<PoliticalFaction | null>(null);
  const [ownsAssetTycoon, setOwnsAssetTycoon] = useState(false);
  const [assetTycoonDrop, setAssetTycoonDrop] = useState<AuthorizedAssetTycoon | null>(null);
  const [assetTycoonMintState, setAssetTycoonMintState] = useState<TransactionState>('idle');
  const [assetTycoonHash, setAssetTycoonHash] = useState<Hex | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const handleUpgradeLevelsChange = useCallback((nextLevels: UpgradeLevels) => {
    setUpgradeLevels((current) => current.attack === nextLevels.attack && current.vitality === nextLevels.vitality && current.defense === nextLevels.defense ? current : nextLevels);
  }, []);
  const handleSkillOwnershipChange = useCallback((nextSkillIds: readonly string[]) => {
    setOwnedSkillIds((current) => current.join('|') === nextSkillIds.join('|') ? current : nextSkillIds);
  }, []);
  const handleSkillLevelsChange = useCallback((nextLevels: Readonly<Record<string, number>>) => {
    setSkillUpgradeLevels((current) => JSON.stringify(current) === JSON.stringify(nextLevels) ? current : nextLevels);
  }, []);
  const stage = stages[stageId];
  const selectionHasUnclaimedRewards = result !== null && (
    transactionState !== 'success'
    || (loot !== null && lootTransactionState !== 'success')
    || (assetTycoonDrop !== null && assetTycoonMintState !== 'success')
  );
  const activeOwnedSkillIds = isPoliticalCharacter(characterId)
    ? politicalFighters[characterId].skills.map((skill) => `${characterId}-${skill.key.toLowerCase()}`)
    : isSecretCharacter(characterId) ? assetTycoonSkills.map((skill) => skill.id)
    : ownedSkillIds;

  useEffect(() => {
    const licenseValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_LICENSE_ADDRESS;
    if (!address || !publicClient || !licenseValue || !isAddress(licenseValue)) {
      const timer = window.setTimeout(() => {
        setOwnsAssetTycoon(false);
        if (!ASSET_TYCOON_LOCAL_TEST_UNLOCK && characterId === 'assettycoon') setCharacterId('warrior');
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    void publicClient.readContract({ address: getAddress(licenseValue), abi: assetTycoonLicenseAbi, functionName: 'balanceOf', args: [address] })
      .then((balance) => { if (!cancelled) setOwnsAssetTycoon(balance > 0n); })
      .catch(() => { if (!cancelled) setOwnsAssetTycoon(false); });
    return () => { cancelled = true; };
  }, [address, assetTycoonHash, characterId, publicClient]);
  const handleStageComplete = useCallback((nextResult: StageResult) => { setResult(nextResult); setShowAdvancePrompt(true); }, []);

  const resetRun = useCallback(() => {
    setAttemptId(null);
    setAttemptAuthorization(null);
    setResult(null);
    setFailure(null);
    setShowAdvancePrompt(false);
    setTransactionState('idle');
    setTransactionHash(null);
    setLoot(null); setLootTransactionState('idle'); setLootHash(null);
    setAssetTycoonDrop(null); setAssetTycoonMintState('idle'); setAssetTycoonHash(null);
    setMessage(null);
    setPendingSelection(null);
  }, []);

  const applySelection = useCallback((selection: PendingSelection) => {
    if (selection.kind === 'class') {
      setCharacterGroup(selection.characterGroup);
      setCharacterId(selection.characterId);
      return;
    }
    setStageId(selection.stageId);
  }, []);

  const requestSelection = useCallback((selection: PendingSelection) => {
    if (starting || transactionState === 'pending' || lootTransactionState === 'pending' || assetTycoonMintState === 'pending') return;
    if (attemptId !== null) {
      setPendingSelection(selection);
      return;
    }
    applySelection(selection);
  }, [
    applySelection,
    assetTycoonMintState,
    attemptId,
    lootTransactionState,
    starting,
    transactionState,
  ]);

  const confirmSelection = useCallback(() => {
    if (!pendingSelection) return;
    const selection = pendingSelection;
    resetRun();
    applySelection(selection);
  }, [applySelection, pendingSelection, resetRun]);

  const selectCharacter = useCallback((nextCharacterId: CharacterId, nextGroup: CharacterGroup = characterGroup) => {
    if (nextCharacterId === characterId && nextGroup === characterGroup) return;
    requestSelection({ kind: 'class', characterId: nextCharacterId, characterGroup: nextGroup });
  }, [characterGroup, characterId, requestSelection]);

  const selectStage = useCallback((nextStageId: StageId) => {
    if (nextStageId === stageId) return;
    requestSelection({ kind: 'stage', stageId: nextStageId });
  }, [requestSelection, stageId]);

  const requestAttempt = async (targetStageId: StageId): Promise<CreatedAttempt> => {
    if (!address) throw new Error('Connect a wallet before starting a reward-eligible stage.');
    if (chainId !== avalancheFuji.id) throw new Error('Switch your wallet to Avalanche Fuji before starting.');
    const response = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player: address, stageId: targetStageId }),
    });
    const data: unknown = await response.json();
    if (
      !response.ok
      || !data
      || typeof data !== 'object'
      || !('attemptId' in data)
      || typeof data.attemptId !== 'string'
      || !('attemptAuthorization' in data)
      || !isAttemptAuthorization(data.attemptAuthorization)
    ) {
      throw new Error(readError(data, 'Could not create a stage attempt.'));
    }
    return { attemptId: data.attemptId, authorization: data.attemptAuthorization };
  };

  const continueToNextStage = async (preserveAuthorizedLoot = false) => {
    const currentIndex = stageIds.indexOf(stageId);
    const nextStageId = stageIds[currentIndex + 1];
    if (!nextStageId) return;
    setStarting(true);
    setMessage(null);
    try {
      // Keep the completed canvas visible while the next server attempt is
      // prepared, then swap both values in the same React update cycle.
      const nextAttempt = await requestAttempt(nextStageId);
      setResult(null);
      setFailure(null);
      setTransactionState('idle');
      setTransactionHash(null);
      if (!preserveAuthorizedLoot) {
        setLoot(null);
        setLootTransactionState('idle');
        setLootHash(null);
      }
      setStageId(nextStageId);
      setAttemptId(nextAttempt.attemptId);
      setAttemptAuthorization(nextAttempt.authorization);
      setShowAdvancePrompt(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not continue to the next stage.');
    } finally {
      setStarting(false);
    }
  };
  const advanceToNextStage = () => { void continueToNextStage(false); };

  const retryStage = async () => {
    setStarting(true);
    setMessage(null);
    try {
      const nextAttempt = await requestAttempt(stageId);
      setResult(null);
      setFailure(null);
      setTransactionState('idle');
      setTransactionHash(null);
      setLoot(null);
      setLootTransactionState('idle');
      setLootHash(null);
      setAssetTycoonDrop(null);
      setAssetTycoonMintState('idle');
      setAssetTycoonHash(null);
      setAttemptId(nextAttempt.attemptId);
      setAttemptAuthorization(nextAttempt.authorization);
      setShowAdvancePrompt(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not retry the stage.');
    } finally {
      setStarting(false);
    }
  };

  const startStage = async (targetStageId: StageId = stageId) => {
    if (!address) {
      setMessage('Connect a wallet before starting a reward-eligible stage.');
      return;
    }
    if (chainId !== avalancheFuji.id) {
      setMessage('Switch your wallet to Avalanche Fuji before starting.');
      return;
    }
    setStarting(true);
    setMessage(null);
    try {
      const nextAttempt = await requestAttempt(targetStageId);
      setAttemptId(nextAttempt.attemptId);
      setAttemptAuthorization(nextAttempt.authorization);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start the stage.');
    } finally {
      setStarting(false);
    }
  };

  const mintLoot = async () => {
    const itemValue = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS;
    if (!loot || !publicClient || !itemValue || !isAddress(itemValue)) { setLootTransactionState('error'); setMessage('Game item contract configuration is missing.'); return; }
    setLootTransactionState('pending'); setMessage(`Confirm the ${loot.name} NFT mint in your wallet.`);
    try {
      const hash = await writeContractAsync({
        address: getAddress(itemValue), abi: gameItemAbi, functionName: 'mintItem',
        args: [{ ...loot.claim, player: getAddress(loot.claim.player), nonce: BigInt(loot.claim.nonce), deadline: BigInt(loot.claim.deadline) }, loot.metadataURI, loot.signature],
        chainId: avalancheFuji.id,
      });
      setLootHash(hash); await publicClient.waitForTransactionReceipt({ hash });
      setLootTransactionState('success'); setMessage(`Successfully minted the ${loot.rarityName} ${loot.typeName}: ${loot.name}.`);
    } catch (error) { setLootTransactionState('error'); setMessage(transactionErrorMessage(error)); }
  };

  const mintAssetTycoon = async () => {
    const licenseValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_LICENSE_ADDRESS;
    if (!assetTycoonDrop || !publicClient || !licenseValue || !isAddress(licenseValue)) {
      setAssetTycoonMintState('error'); setMessage('Asset Tycoon license contract configuration is missing.'); return;
    }
    setAssetTycoonMintState('pending'); setMessage('Confirm the rare Asset Tycoon class NFT mint in your wallet.');
    try {
      const hash = await writeContractAsync({
        address: getAddress(licenseValue), abi: assetTycoonLicenseAbi, functionName: 'mint',
        args: [{ ...assetTycoonDrop.claim, player: getAddress(assetTycoonDrop.claim.player), nonce: BigInt(assetTycoonDrop.claim.nonce), deadline: BigInt(assetTycoonDrop.claim.deadline) }, assetTycoonDrop.signature],
        chainId: avalancheFuji.id,
      });
      setAssetTycoonHash(hash); await publicClient.waitForTransactionReceipt({ hash });
      setAssetTycoonMintState('success'); setOwnsAssetTycoon(true);
      setMessage('Asset Tycoon NFT minted. The class is active while this wallet owns the NFT. Selling it transfers class access to the buyer.');
    } catch (error) { setAssetTycoonMintState('error'); setMessage(transactionErrorMessage(error)); }
  };

  const claimReward = async () => {
    const distributorValue = process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS;
    if (!address || !result || !publicClient || !distributorValue || !isAddress(distributorValue)) {
      setTransactionState('error');
      setMessage('Reward contract configuration is missing.');
      return;
    }
    setTransactionState('pending');
    setMessage('Validating the run and preparing your reward…');
    try {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ player: address, result, attemptAuthorization }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !isAuthorizedReward(data)) {
        throw new Error(readError(data, 'Reward authorization failed.'));
      }
      setLoot(data.loot);
      setAssetTycoonDrop(data.assetTycoon);
      if (!data.loot) setMessage('Your AQT reward is available, but this boss did not drop rare equipment.');
      setMessage('Confirm the reward claim transaction in your wallet.');
      const claim = {
        ...data.claim,
        player: getAddress(data.claim.player),
        tokenAmount: BigInt(data.claim.tokenAmount),
        nonce: BigInt(data.claim.nonce),
        deadline: BigInt(data.claim.deadline),
      };
      const hash = await writeContractAsync({
        address: getAddress(distributorValue),
        abi: rewardDistributorAbi,
        functionName: 'claimReward',
        args: [claim, data.signature],
        chainId: avalancheFuji.id,
      });
      setTransactionHash(hash);
      setMessage('Transaction submitted. Waiting for Fuji confirmation…');
      await publicClient.waitForTransactionReceipt({ hash });
      setTransactionState('success');
      setMessage(`Successfully claimed ${formatEther(claim.tokenAmount)} AQT.${data.assetTycoon ? ' The ultra-rare Asset Tycoon class NFT dropped!' : data.loot ? ' Rare boss equipment dropped!' : ' No rare class dropped this time.'}`);
    } catch (error) {
      setTransactionState('error');
      setMessage(transactionErrorMessage(error));
    }
  };

  if (duelFaction) {
    return (
      <main className="min-h-screen bg-[#080b12] pt-16">
        <div className="mx-auto max-w-[1400px] px-2 py-4 sm:px-3 sm:py-6 md:px-6">
          <div className="mb-4 rounded-2xl border border-[#514b43] bg-gradient-to-r from-[#26090d] via-[#090d16] to-[#071a2c] p-5 text-center">
            <p className="text-[10px] font-bold tracking-[.28em] text-[#e8dbc6]">SPECIAL 1 VS 1 · HARD MODE</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              <span className="faction-conservative">Conservative Faction</span>
              <span className="mx-3 text-white">VS</span>
              <span className="faction-progressive">Progressive Faction</span>
            </h1>
            <p className="mt-2 text-xs font-medium text-[#aca496]">Play as your selected faction while the opposing faction appears as a hard boss using every skill and 12 combat patterns.</p>
          </div>
          <PoliticalDuelCanvas key={duelFaction} faction={duelFaction} player={address ?? null} onAssetTycoonReward={setAssetTycoonDrop} onExit={() => setDuelFaction(null)} />
          {assetTycoonDrop ? <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-[#f2c94c] bg-[#17130a] p-5 pr-[34%]"><Image src="/assets/class-portraits/assettycoon.png" alt="Asset Tycoon" width={360} height={420} className="pointer-events-none absolute -bottom-20 right-0 h-[170%] w-[38%] object-contain object-bottom" /><div className="relative z-10"><p className="text-[10px] font-black tracking-[.22em] text-[#ffe071]">SPECIAL DUEL VICTORY · GUARANTEED CLASS</p><h2 className="mt-2 text-xl font-black text-white">Asset Tycoon NFT License</h2><p className="mt-2 text-xs font-semibold text-[#d8c9a0]">The server verified your victory. Mint the guaranteed class license to your connected wallet.</p><button type="button" disabled={assetTycoonMintState === 'pending' || assetTycoonMintState === 'success'} onClick={() => void mintAssetTycoon()} className="relative z-20 mt-4 rounded-lg border border-[#ffe482] bg-[#94721a] px-7 py-3 text-xs font-black text-white disabled:opacity-50">{assetTycoonMintState === 'pending' ? 'MINTING…' : assetTycoonMintState === 'success' ? 'CLASS ACTIVATED' : 'MINT GUARANTEED CLASS NFT'}</button></div></div> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0e110d] pt-16">
      <div className="mx-auto max-w-[1400px] px-2 py-3 sm:px-3 sm:py-5 md:px-6">
        <section className="mb-4 overflow-hidden rounded-2xl border border-[#a8793d] bg-gradient-to-br from-[#211a10] via-[#101711] to-[#0b1c18] p-3 shadow-[0_18px_55px_rgba(0,0,0,.32)] sm:p-5">
          <div className="mb-3 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold tracking-[.22em] !text-white">PLAY EXPEDITION</p>
              <h1 className="mt-1 truncate text-xl font-black !text-white sm:text-2xl">Stage {stage.number} · {stage.name}</h1>
              <p className="mt-1 text-xs font-bold !text-white">{stage.subtitle} · {formatCharacterName(characterId)}</p>
            </div>
            {!attemptId ? (
              <button type="button" onClick={() => void startStage()} disabled={starting} className="w-full rounded-xl border border-[#efbd58] bg-gradient-to-r from-[#6e3f12] to-[#9a6728] px-8 py-4 text-sm font-black text-white shadow-[0_0_22px_rgba(239,189,88,.28)] disabled:opacity-40 sm:w-auto sm:min-w-56">
                {starting ? 'PREPARING…' : 'PLAY NOW'}
              </button>
            ) : (
              <button type="button" onClick={resetRun} className="w-full rounded-xl border border-[#81715b] bg-[#17140f] px-8 py-4 text-sm font-extrabold text-[#eadcc0] sm:w-auto sm:min-w-56">NEW ATTEMPT</button>
            )}
          </div>
          {attemptId ? (
            <GameCanvas
              key={attemptId}
              attemptId={attemptId}
              stageId={stageId}
              onComplete={handleStageComplete}
              onFailure={setFailure}
              onRetry={() => void retryStage()}
              retrying={starting}
              ownedSkillIds={activeOwnedSkillIds}
              armorEquipped={armorOwned}
              armorLevel={armorLevel}
              aqtBalance={formatEther(aqtBalance)}
              characterId={characterId}
              upgradeLevels={upgradeLevels}
              skillUpgradeLevels={skillUpgradeLevels}
            />
          ) : (
            <div className="grid min-h-64 place-items-center rounded-xl border border-[#4f604f] bg-[#0d1813] p-5 text-center sm:aspect-[112/52] sm:min-h-0 sm:p-8">
              <div className="flex flex-col items-center">
                <p className="text-sm font-bold text-[#f1e2c6]">Your game screen will appear here.</p>
                <p className="mt-2 max-w-md text-xs font-semibold leading-5 text-[#91a096]">Connect a wallet on Avalanche Fuji, choose a stage and class below, then press Play Now.</p>
                <div className="mt-5"><ConnectButton showBalance={false} /></div>
              </div>
            </div>
          )}
        </section>

        {/* Special duel entry intentionally hidden while the mode is being reworked. */}
        <details open className="group mb-4 overflow-hidden rounded-2xl border border-[#4f4637] bg-[#1c1914]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left marker:hidden sm:px-5">
            <span><span className="block text-[10px] font-extrabold tracking-[.2em] text-[#a88350]">EXPEDITION SETUP</span><strong className="mt-1 block text-base font-black text-[#f1e2c6]">Choose a stage and class</strong></span>
            <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#74634d] bg-[#0d0b08] px-3 py-2 text-xs font-black leading-none text-[#ead6ae] transition group-hover:border-[#d0b47a] group-hover:text-white">
              <span className="group-open:hidden">OPEN</span>
              <span className="hidden group-open:inline">CLOSE</span>
              <span aria-hidden="true" className="block size-2.5 -translate-y-0.5 rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:translate-y-0.5 group-open:rotate-[225deg]" />
            </span>
          </summary>
          <div className="border-t border-[#4f4637] p-3 sm:p-5">
          <div>
            <span className="text-[10px] tracking-[.2em] text-[#a88350]">CHOOSE EXPEDITION</span>
            <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
              {stageIds.filter((id) => !stages[id].special).map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={starting || transactionState === 'pending' || lootTransactionState === 'pending' || assetTycoonMintState === 'pending'}
                  onClick={() => selectStage(id)}
                  style={{ backgroundImage: `url(/assets/maps-hd/stage-${String(stages[id].assetNumber).padStart(2, '0')}.webp)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  className={`relative min-w-0 overflow-hidden border px-3 py-3 text-center text-white transition disabled:cursor-wait disabled:opacity-60 sm:px-4 sm:text-left [text-shadow:0_2px_4px_rgba(0,0,0,.95)] ${stageId === id ? 'z-10 scale-[1.025] border-[#fff3ad] ring-4 ring-[#ffd45f] shadow-[0_0_26px_rgba(255,212,95,.95),inset_0_0_0_2px_rgba(255,255,255,.9)]' : 'border-[#b9aa91] hover:border-[#ead392]'}`}
                >
                  <span className="block text-[9px] tracking-[.16em]">STAGE {String(stages[id].number).padStart(2, '0')}</span>
                  <strong className="mt-1 block text-sm">{stages[id].name}</strong>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-[#9b2947] bg-gradient-to-r from-[#260813] via-[#130b16] to-[#1b0926] p-3 sm:p-4">
              <div className="flex items-end justify-between gap-3">
                <span><span className="block text-[10px] font-black tracking-[.24em] text-white [text-shadow:0_2px_5px_rgba(0,0,0,.95)]">SPECIAL STAGES · 31–40</span><strong className="mt-1 block text-base font-black text-white">Named Raid · Extreme Annihilation</strong></span>
                <span className="rounded-full border border-white/70 px-3 py-1 text-[9px] font-black tracking-[.16em] text-white">4 PHASE FINAL BOSS</span>
              </div>
              <p className="mt-2 text-[10px] font-semibold leading-4 text-white/90">Extended route · two named mid-boss arenas · sealed progression gates · phase-changing final encounter.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {stageIds.filter((id) => stages[id].special).map((id) => (
                  <button
                    key={id}
                    type="button"
                    disabled={starting || transactionState === 'pending' || lootTransactionState === 'pending' || assetTycoonMintState === 'pending'}
                    onClick={() => selectStage(id)}
                    style={{ backgroundImage: `linear-gradient(rgba(25,0,8,.28),rgba(25,0,8,.66)),url(/assets/maps-special/stage-${stages[id].number}-v2.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    className={`relative min-w-0 overflow-hidden border px-3 py-4 text-center text-white disabled:cursor-wait disabled:opacity-60 [text-shadow:0_2px_4px_rgba(0,0,0,.95)] sm:text-left ${stageId === id ? 'border-[#ff668f] ring-2 ring-[#ff3f72]/60' : 'border-[#713044]'}`}
                  >
                    <span className="block text-[9px] tracking-[.16em]">STAGE {String(stages[id].number).padStart(2, '0')}</span>
                    <strong className="mt-1 block text-sm">{stages[id].name}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-4 flex w-full max-w-md justify-center gap-2 rounded-xl border border-[#514838] bg-[#12100d] p-1 sm:mx-0 sm:w-fit sm:max-w-none">
              {([['general', 'General Classes'], ['special', 'Special Classes']] as const).map(([group, label]) => (
                <button key={group} type="button" disabled={starting || transactionState === 'pending' || lootTransactionState === 'pending' || assetTycoonMintState === 'pending'} onClick={() => selectCharacter(group === 'general' ? 'warrior' : 'conservative', group)} className={`flex-1 rounded-lg px-5 py-2.5 text-xs font-bold disabled:cursor-wait disabled:opacity-50 sm:flex-none ${characterGroup === group ? 'bg-[#e9dcc5] text-[#201c17]' : 'text-[#9f9583]'}`}>{label}</button>
              ))}
            </div>
            {attemptId ? <p className="mt-2 text-[10px] font-semibold text-[#b8a98f]">{result || failure ? 'Choose another stage or class to prepare a new attempt.' : 'Changing the stage or class will ask before abandoning the current attempt.'}</p> : null}
            <div className="mt-3 grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {(characterGroup === 'general'
                ? ([['warrior', 'Warrior', 'Sword-based melee combat'], ['mage', 'Mage', 'Magic and ranged effects'], ['spellblade', 'Spellblade', 'Arcane swordplay and teleportation'], ['archer', 'Archer', 'Wind-powered ranged attacks'], ['dualblade', 'Dualblade', 'Twin blades and high-speed flanking'], ['brawler', 'Brawler', 'Heavy punches and shockwaves'], ['dragonknight', 'Dragon Knight', 'Lance combat and draconic fire'], ['gunslinger', 'Gunslinger', 'Twin revolvers and bullet storms'], ['ssaulabi', 'Ssaulabi', 'Male hwando master with disciplined sword arts'], ['kickfighter', 'Kickfighter', 'Female aerial martial artist using only kicks'], ['venomancer', 'Venomancer', 'Female poison mage controlling plague and venom'], ['pyromancer', 'Pyromancer', 'Female fire mage wielding phoenix flames'], ['hammerguard', 'Hammerguard', 'Male armored warrior with a colossal hammer'], ['axereaver', 'Axe Reaver', 'Female predatory warrior with a battle axe'], ['warlock', 'Warlock', 'Male forbidden mage using curses and abyssal magic']] as const)
                : ([
                    ['conservative', 'Conservative Faction', 'Male SD swordsman · 8 exclusive skills'],
                    ['progressive', 'Progressive Faction', 'Female SD mage · 8 exclusive skills'],
                    ['elementalist', 'Elementalist', 'Female special mage · 9 purchasable elemental skills'],
                    ...(ASSET_TYCOON_LOCAL_TEST_UNLOCK ? [['assettycoon', 'Asset Tycoon', 'Local test · nine max-level skills'] as const] : []),
                  ] as const)
              ).map(([id, name, role]) => {
                const special = id === 'conservative' || id === 'progressive' || id === 'elementalist' || id === 'assettycoon';
                return <button key={id} type="button" disabled={starting || transactionState === 'pending' || lootTransactionState === 'pending' || assetTycoonMintState === 'pending'} onClick={() => selectCharacter(id, characterGroup)} className={`relative flex h-full min-h-[112px] min-w-0 flex-col justify-center overflow-hidden rounded-xl border px-3 py-3 pr-[42%] text-left transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait disabled:opacity-60 sm:px-4 sm:pr-[42%] ${characterId === id ? special ? id === 'conservative' ? 'border-[#d94149] bg-[#451117]' : 'border-[#3089df] bg-[#092f56]' : 'border-[#9a6728] bg-[#f3eadc]' : 'border-[#ddd4c7] bg-white'}`}><span className="relative z-10"><strong className={`block text-sm ${id === 'conservative' ? 'faction-conservative' : id === 'progressive' ? 'faction-progressive' : 'text-[#201c17]'}`}>{name}</strong><span className="mt-1 flex min-h-8 items-center text-[10px] leading-4 text-[#6f685e]">{role}</span></span><Image src={`/assets/class-portraits/${id === 'gunslinger' ? 'gunslinger-v2' : id}.png`} alt="" width={180} height={210} className={`pointer-events-none absolute -right-5 h-[125%] w-[52%] object-contain object-bottom ${id === 'elementalist' ? '-bottom-4' : '-bottom-8'}`} /></button>;
              })}
            </div>
            {characterGroup === 'general' && !ASSET_TYCOON_LOCAL_TEST_UNLOCK ? (
              <div className={`relative mt-3 min-h-44 overflow-hidden rounded-xl border p-4 pr-[38%] ${ownsAssetTycoon || ASSET_TYCOON_LOCAL_TEST_UNLOCK ? 'border-[#f2c94c] bg-gradient-to-r from-[#35270b] to-[#151109]' : 'border-[#665a3c] bg-[#16130e]'}`}>
                <Image src="/assets/class-portraits/assettycoon.png" alt="Asset Tycoon" width={360} height={420} className="pointer-events-none absolute -bottom-14 right-0 h-[145%] w-[42%] object-contain object-bottom" />
                <div className="relative z-10 flex min-h-36 flex-col items-start justify-center gap-3 text-left">
                  <div><span className="text-[10px] font-extrabold tracking-[.2em] text-[#f2c94c]">ULTRA-RARE NFT CLASS · 1% ON VERIFIED STAGES 27–30</span><strong className="mt-1 block text-lg font-black text-[#fff0ad]">Asset Tycoon</strong><p className="mt-1 text-xs font-semibold text-[#b9aa83]">Male apex class · nine max-level skills · Attack/Vitality/Defense +20. Ownership and play access transfer with the ERC-721 NFT.</p></div>
                  <button type="button" disabled={(!ownsAssetTycoon && !ASSET_TYCOON_LOCAL_TEST_UNLOCK) || starting || transactionState === 'pending' || lootTransactionState === 'pending' || assetTycoonMintState === 'pending'} onClick={() => selectCharacter('assettycoon', 'general')} className="relative z-20 rounded-lg border border-[#f2c94c] bg-[#6e5311]/95 px-6 py-3 text-xs font-extrabold text-[#fff5c2] disabled:cursor-not-allowed disabled:opacity-40">{ownsAssetTycoon ? 'SELECT ASSET TYCOON' : ASSET_TYCOON_LOCAL_TEST_UNLOCK ? 'SELECT · LOCAL TEST' : 'NFT REQUIRED'}</button>
                </div>
              </div>
            ) : null}
          </div>
          </div>
        </details>

        <div className="mb-4 flex flex-col items-center gap-1 border border-[#4f4637] bg-[#17140f] px-4 py-3 text-center sm:block sm:text-left">
          <strong className="text-[#e6d7ba]">{stage.name}</strong>
          <span className="text-xs text-[#938a7a] sm:ml-3">{stage.subtitle}</span>
        </div>

        <details className="group mb-4 overflow-hidden rounded-2xl border border-[#4f4637] bg-[#15130f]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 marker:hidden transition-colors hover:bg-[#2b2419] focus-visible:bg-[#2b2419] focus-visible:outline-none group-open:bg-[#211c15] sm:px-5"><span><span className="text-[10px] font-extrabold tracking-[.2em] text-[#d0b47a]">LOADOUT</span><strong className="mt-1 block text-base font-black text-[#f1e2c6]">Skills and class information</strong></span><span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#74634d] bg-[#0d0b08] px-3 py-2 text-xs font-black leading-none text-[#ead6ae] transition group-hover:border-[#d0b47a] group-hover:text-white"><span className="group-open:hidden">OPEN</span><span className="hidden group-open:inline">CLOSE</span><span aria-hidden="true" className="block size-2.5 -translate-y-0.5 rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:translate-y-0.5 group-open:rotate-[225deg]" /></span></summary>
          <div className="border-t border-[#4f4637] p-3 sm:p-4">
        {isPoliticalCharacter(characterId) ? (
          <section className="rounded-2xl border border-[#5a5145] bg-[#15130f] p-5">
            <p className="text-[10px] font-bold tracking-[.2em] text-[#d0b47a]">SPECIAL CLASS LOADOUT</p>
            <h3 className={`mt-2 text-xl font-black ${characterId === 'conservative' ? 'faction-conservative' : 'faction-progressive'}`}>{politicalFighters[characterId].label} · 8 EXCLUSIVE SKILLS</h3>
            <p className="mt-2 text-xs font-medium text-[#aaa194]">All Q/W/E/R/Z/X/C/V skills are unlocked and can be used against regular monsters and bosses in expedition stages.</p>
          </section>
        ) : isSecretCharacter(characterId) ? <section className="rounded-2xl border border-[#f2c94c] bg-gradient-to-r from-[#2d2209] via-[#15120b] to-[#34270a] p-5 text-white [&_*]:!text-white"><p className="text-[10px] font-extrabold tracking-[.22em] text-[#f2c94c]">ASSET TYCOON · {ownsAssetTycoon ? 'NFT LICENSE ACTIVE' : 'LOCAL TEST MODE'}</p><h3 className="mt-2 text-xl font-black text-[#fff1ae]">EVERY FAILURE COMPOUNDED INTO POWER</h3><p className="mt-2 text-xs font-semibold leading-5 text-[#c4b58e]">All nine Q/W/E/R/Z/X/C/V/T skills are fully enhanced. Attack, Vitality and Defense are fixed at +20{ownsAssetTycoon ? ' while this wallet owns the NFT.' : ' for local gameplay testing only.'}</p></section> : isGeneralCharacter(characterId) ? <SkillShop
          onOwnershipChange={handleSkillOwnershipChange}
          onArmorOwnershipChange={setArmorOwned}
          onSkillLevelsChange={handleSkillLevelsChange}
          onArmorLevelChange={setArmorLevel}
          onBalanceChange={setAqtBalance}
          characterId={characterId}
          refreshKey={`${transactionState}:${transactionHash ?? 'none'}`}
        /> : null}
          </div>
        </details>

        <details className="group mb-4 overflow-hidden rounded-2xl border border-[#4f4637] bg-[#15130f]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 marker:hidden transition-colors hover:bg-[#2b2419] focus-visible:bg-[#2b2419] focus-visible:outline-none group-open:bg-[#211c15] sm:px-5"><span><span className="text-[10px] font-extrabold tracking-[.2em] text-[#d0b47a]">ENHANCEMENT</span><strong className="mt-1 block text-base font-black text-[#f1e2c6]">Character upgrades</strong></span><span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#74634d] bg-[#0d0b08] px-3 py-2 text-xs font-black leading-none text-[#ead6ae] transition group-hover:border-[#d0b47a] group-hover:text-white"><span className="group-open:hidden">OPEN</span><span className="hidden group-open:inline">CLOSE</span><span aria-hidden="true" className="block size-2.5 -translate-y-0.5 rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:translate-y-0.5 group-open:rotate-[225deg]" /></span></summary>
          <div className="border-t border-[#4f4637] p-3 sm:p-4">
            {isPoliticalCharacter(characterId) ? (
              <section className={`rounded-xl border p-4 ${characterId === 'conservative' ? 'border-[#b9363c] bg-[#260b0f]' : 'border-[#276fbe] bg-[#071f38]'}`}>
                <p className="text-[10px] font-black tracking-[.2em] text-[#d8c9b0]">SPECIAL CLASS · LOGIC PRESET</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {['SKILLS +7', 'ATTACK +20', 'VITALITY +20', 'DEFENSE +20', 'AEGIS +5'].map((label) => (
                    <span key={label} className="rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-center text-xs font-black text-white">{label}</span>
                  ))}
                </div>
                <p className="mt-3 text-xs font-medium leading-5 text-[#bdb3a4]">These values affect expedition combat only. Wallet ownership, token rewards, NFT rights, and contract state remain unchanged.</p>
              </section>
            ) : <UpgradeShop onLevelsChange={handleUpgradeLevelsChange} disabled={attemptId !== null} />}
          </div>
        </details>

        {pendingSelection ? (
          <SelectionChangeModal
            selection={pendingSelection}
            hasUnclaimedRewards={selectionHasUnclaimedRewards}
            onCancel={() => setPendingSelection(null)}
            onConfirm={confirmSelection}
          />
        ) : null}

        {result && showAdvancePrompt ? (
          <div className="fixed inset-0 z-[80] bg-black">
            <section role="dialog" aria-modal="true" aria-labelledby="stage-clear-title" className="flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto border border-[#d0b47a] bg-[radial-gradient(circle_at_center,#fffaf0_0%,#ead8b7_58%,#24190d_100%)] p-4 text-center text-[#211b15] shadow-2xl sm:p-8">
              <div className="w-full max-w-2xl rounded-3xl border border-[#d0b47a]/70 bg-[#fffaf0]/90 p-6 shadow-[0_0_80px_rgba(154,103,40,.35)] backdrop-blur sm:p-9">
                <p className="text-xs font-black tracking-[.24em] text-[#9a6728]">STAGE {stage.number} CLEAR</p>
                <h2 id="stage-clear-title" className="mt-3 text-4xl font-black sm:text-6xl">Boss Defeated!</h2>
                <p className="mx-auto mt-4 max-w-lg text-sm font-semibold leading-6 text-[#6d6255] sm:text-base">Claim AQT here. If an NFT item or the rare Asset Tycoon license dropped, its mint action will appear immediately after reward authorization.</p>
                <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
                  <button type="button" disabled={transactionState === 'pending' || transactionState === 'success'} onClick={() => void claimReward()} className={`rounded-xl border border-[#8f641f] bg-gradient-to-r from-[#80551b] to-[#b17b2b] px-6 py-4 text-sm font-black text-white shadow-lg disabled:opacity-50 ${!loot && !assetTycoonDrop ? 'sm:col-span-2' : ''}`}>
                    {transactionState === 'pending' ? 'CLAIMING AQT…' : transactionState === 'success' ? 'AQT CLAIMED' : 'CLAIM AQT'}
                  </button>
                  {loot && transactionState === 'success' ? <button type="button" disabled={lootTransactionState === 'pending' || lootTransactionState === 'success'} onClick={() => void mintLoot()} className="rounded-xl border border-[#4c91b6] bg-[#244f67] px-6 py-4 text-sm font-black text-white disabled:opacity-50">{lootTransactionState === 'pending' ? 'MINTING ITEM…' : lootTransactionState === 'success' ? 'ITEM MINTED' : `MINT ${loot.name.toUpperCase()}`}</button> : null}
                  {assetTycoonDrop && transactionState === 'success' ? <button type="button" disabled={assetTycoonMintState === 'pending' || assetTycoonMintState === 'success'} onClick={() => void mintAssetTycoon()} className="rounded-xl border border-[#d7af2d] bg-[#6e5311] px-6 py-4 text-sm font-black text-white shadow-[0_0_22px_rgba(242,201,76,.3)] disabled:opacity-50 sm:col-span-2">{assetTycoonMintState === 'pending' ? 'MINTING CLASS…' : assetTycoonMintState === 'success' ? 'ASSET TYCOON ACTIVATED' : 'MINT ASSET TYCOON NFT'}</button> : null}
                </div>
                {message ? <p className={`mx-auto mt-4 max-w-xl rounded-lg border px-4 py-3 text-xs font-bold ${transactionState === 'error' || lootTransactionState === 'error' || assetTycoonMintState === 'error' ? 'border-[#a95d58] bg-[#fff0ec] text-[#8d302a]' : 'border-[#a89a70] bg-white/70 text-[#665735]'}`}>{message}</p> : null}
                <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
                  {stage.number < stageIds.length ? <button type="button" onClick={advanceToNextStage} disabled={transactionState === 'pending' || lootTransactionState === 'pending' || assetTycoonMintState === 'pending'} className="rounded-xl bg-[#211b15] px-6 py-4 text-sm font-extrabold text-white disabled:opacity-40">Next Stage</button> : null}
                  <button type="button" onClick={() => setShowAdvancePrompt(false)} className="rounded-xl border border-[#bbaa94] bg-white px-6 py-4 text-sm font-bold">Close Reward Screen</button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {result ? (
          <section className="mt-4 border border-[#6b5a3f] bg-[#241d15] p-5">
            <p className="text-[10px] tracking-[.2em] text-[#c49a5a]">REWARD AVAILABLE</p>
            <div className="mt-3 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <div><strong className="text-xl text-[#eadcc0]">Stage cleared in {(result.durationMs / 1000).toFixed(1)}s</strong><p className="mt-1 text-xs text-[#9f9583]">The server will verify the run before authorizing the token claim.</p></div>
              <button type="button" disabled={transactionState === 'pending' || transactionState === 'success'} onClick={() => void claimReward()} className="w-full max-w-sm border border-[#d0b47a] bg-[#a8793d] px-8 py-3.5 text-xs font-bold text-[#17120b] disabled:opacity-50 sm:w-auto sm:min-w-48">
                {transactionState === 'pending' ? 'CLAIMING…' : transactionState === 'success' ? 'REWARD CLAIMED' : 'CLAIM AQT'}
              </button>
            </div>
          </section>
        ) : null}
        {loot ? <section className="mt-4 border border-[#5c6f87] bg-[#151e29] p-5"><p className="text-[10px] tracking-[.2em] text-[#76d7ff]">BOSS DROP · {loot.rarityName.toUpperCase()}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-4"><div><strong className="text-xl text-[#eaf7ff]">{loot.name}</strong><p className="mt-1 text-xs text-[#9eb1c3]">{loot.typeName} · Power {loot.claim.power}</p></div><button type="button" disabled={lootTransactionState === 'pending' || lootTransactionState === 'success'} onClick={() => void mintLoot()} className="border border-[#76d7ff] bg-[#294e65] px-6 py-3 text-xs font-bold text-[#eaf7ff] disabled:opacity-50">{lootTransactionState === 'pending' ? 'MINTING…' : lootTransactionState === 'success' ? 'ITEM MINTED' : 'MINT NFT ITEM'}</button></div>{lootHash ? <a className="mt-3 block text-xs text-[#76d7ff] underline" href={`https://testnet.snowtrace.io/tx/${lootHash}`} target="_blank" rel="noreferrer">View item transaction</a> : null}</section> : null}
        {assetTycoonDrop ? <section className="mt-4 overflow-hidden rounded-2xl border-2 border-[#f2c94c] bg-gradient-to-r from-[#3d2d07] via-[#17130a] to-[#4a3505] p-6 shadow-[0_0_35px_rgba(242,201,76,.25)]"><p className="text-[10px] font-black tracking-[.24em] text-[#f8db65]">ULTRA-RARE CLASS DROP · VERIFIED 1%</p><div className="mt-3 flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left"><div><strong className="text-2xl font-black text-[#fff4bd]">Asset Tycoon NFT License</strong><p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-[#cfbf91]">The culmination of repeated failures and earned experience. Minting activates the apex class for this wallet. Listing or selling the NFT transfers access to its new owner.</p></div><button type="button" disabled={assetTycoonMintState === 'pending' || assetTycoonMintState === 'success'} onClick={() => void mintAssetTycoon()} className="w-full rounded-lg border border-[#ffe482] bg-[#94721a] px-7 py-3.5 text-xs font-black text-white disabled:opacity-50 sm:w-auto">{assetTycoonMintState === 'pending' ? 'MINTING…' : assetTycoonMintState === 'success' ? 'CLASS ACTIVATED' : 'MINT CLASS NFT'}</button></div>{assetTycoonHash ? <a className="mt-3 block text-xs font-bold text-[#ffe482] underline" href={`https://testnet.snowtrace.io/tx/${assetTycoonHash}`} target="_blank" rel="noreferrer">View Asset Tycoon transaction</a> : null}</section> : null}
        {failure ? <p className="mt-4 border border-[#7d4444] bg-[#2b1919] p-4 text-sm text-[#e7aaaa]">Expedition failed after {(failure.durationMs / 1000).toFixed(1)}s. Start a new attempt to retry.</p> : null}
        {message ? <p className={`mt-4 border p-3 text-sm ${transactionState === 'error' ? 'border-[#7d4444] text-[#e7aaaa]' : 'border-[#5d684d] text-[#c9d6aa]'}`}>{message}</p> : null}
        {transactionHash ? <a className="mt-3 block text-xs text-[#c49a5a] underline" href={`https://testnet.snowtrace.io/tx/${transactionHash}`} target="_blank" rel="noreferrer">View transaction on Snowtrace</a> : null}
        <div className="mx-auto mt-4 max-w-3xl text-center text-xs font-semibold leading-5 text-[#938a7a]"><span className="sm:hidden">Touch controls: move · jump · dash · attack · skills</span><span className="hidden sm:inline">Arrow keys: move and double jump · SHIFT: dash · SPACE: attack · Q/W/E/R/T: purchased skills</span></div>
        {!isConnected ? <p className="mt-2 text-center text-xs text-[#c88f70]">Wallet connection required for reward attempts.</p> : null}
      </div>
    </main>
  );
}

function SelectionChangeModal({
  selection,
  hasUnclaimedRewards,
  onCancel,
  onConfirm,
}: {
  selection: PendingSelection;
  hasUnclaimedRewards: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const isClassChange = selection.kind === 'class';
  const targetLabel = isClassChange
    ? formatCharacterName(selection.characterId)
    : `Stage ${String(stages[selection.stageId].number).padStart(2, '0')} · ${stages[selection.stageId].name}`;
  const title = isClassChange
    ? `Change class to ${targetLabel}?`
    : `Change expedition to ${targetLabel}?`;
  const description = hasUnclaimedRewards
    ? isClassChange
      ? 'Changing class now will close the current reward screen. Any rewards you have not claimed or minted will remain uncollected.'
      : 'Changing the expedition now will close the current reward screen. Any rewards you have not claimed or minted will remain uncollected.'
    : isClassChange
      ? 'The current attempt will end, and the selected class will be ready for a new attempt.'
      : 'The current attempt will end, and the selected expedition will be ready for a new attempt.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="selection-change-title"
        aria-describedby="selection-change-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#8d7858] bg-[#17130e] text-[#f1e2c6] shadow-[0_28px_90px_rgba(0,0,0,.75)]"
      >
        <div className="border-b border-[#4f4637] bg-gradient-to-r from-[#2b2115] to-[#18130d] px-5 py-4 sm:px-6">
          <p className="text-[10px] font-extrabold tracking-[.22em] text-[#d0b47a]">
            {isClassChange ? 'CHANGE CLASS' : 'CHANGE EXPEDITION'}
          </p>
          <h2 id="selection-change-title" className="mt-2 text-xl font-black text-white">{title}</h2>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <p id="selection-change-description" className="text-sm font-semibold leading-6 text-[#b8aa94]">{description}</p>
          {hasUnclaimedRewards ? (
            <p className="mt-3 rounded-lg border border-[#7d4444] bg-[#2b1919] px-4 py-3 text-xs font-bold leading-5 text-[#e7aaaa]">
              Claim and mint every reward before changing if you want to keep them.
            </p>
          ) : null}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={onCancel} className="rounded-xl border border-[#6d6253] bg-[#211c16] px-4 py-3 text-xs font-extrabold text-[#d7cab5] transition hover:bg-[#2c251d]">
              CANCEL
            </button>
            <button type="button" onClick={onConfirm} autoFocus className="rounded-xl border border-[#d0b47a] bg-[#a8793d] px-4 py-3 text-xs font-extrabold text-[#17120b] transition hover:bg-[#bd8b49]">
              CONFIRM
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatCharacterName(characterId: CharacterId) {
  const labels: Record<CharacterId, string> = {
    warrior: 'Warrior', mage: 'Mage', spellblade: 'Spellblade', archer: 'Archer', dualblade: 'Dualblade', brawler: 'Brawler',
    dragonknight: 'Dragon Knight', gunslinger: 'Gunslinger', ssaulabi: 'Ssaulabi', kickfighter: 'Kickfighter', venomancer: 'Venomancer',
    pyromancer: 'Pyromancer', hammerguard: 'Hammerguard', axereaver: 'Axe Reaver', elementalist: 'Elementalist', warlock: 'Warlock', conservative: 'Conservative Faction',
    progressive: 'Progressive Faction', assettycoon: 'Asset Tycoon',
  };
  return labels[characterId];
}

function readError(value: unknown, fallback: string) {
  return value && typeof value === 'object' && 'error' in value && typeof value.error === 'string'
    ? value.error
    : fallback;
}

function isAttemptAuthorization(value: unknown): value is AttemptAuthorization {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AttemptAuthorization>;
  return typeof candidate.attemptId === 'string'
    && isHex(candidate.attemptId, { strict: true })
    && typeof candidate.player === 'string'
    && isAddress(candidate.player)
    && typeof candidate.stageId === 'string'
    && stageIds.includes(candidate.stageId as StageId)
    && typeof candidate.expiresAt === 'number'
    && Number.isSafeInteger(candidate.expiresAt)
    && typeof candidate.signature === 'string'
    && isHex(candidate.signature, { strict: true });
}

function isAuthorizedReward(value: unknown): value is AuthorizedReward {
  if (!value || typeof value !== 'object' || !('claim' in value) || !('signature' in value) || !('loot' in value) || !('assetTycoon' in value)) return false;
  const candidate = value as { claim?: Partial<AuthorizedReward['claim']>; signature?: unknown; loot?: Partial<AuthorizedLoot> | null; assetTycoon?: { claim?: Partial<AuthorizedAssetTycoon['claim']>; signature?: unknown } | null };
  const validLoot = candidate.loot === null || (Boolean(candidate.loot)
    && typeof candidate.loot?.metadataURI === 'string'
    && typeof candidate.loot.signature === 'string'
    && typeof candidate.loot.name === 'string'
    && typeof candidate.loot.rarityName === 'string'
    && typeof candidate.loot.typeName === 'string'
    && Boolean(candidate.loot.claim)
    && typeof candidate.loot.claim?.claimId === 'string'
    && typeof candidate.loot.claim.attemptId === 'string'
    && typeof candidate.loot.claim.player === 'string'
    && typeof candidate.loot.claim.itemType === 'number'
    && typeof candidate.loot.claim.rarity === 'number'
    && typeof candidate.loot.claim.power === 'number'
    && typeof candidate.loot.claim.metadataHash === 'string'
    && typeof candidate.loot.claim.nonce === 'string'
    && typeof candidate.loot.claim.deadline === 'string');
  const validAssetTycoon = candidate.assetTycoon === null || (Boolean(candidate.assetTycoon)
    && typeof candidate.assetTycoon?.signature === 'string'
    && typeof candidate.assetTycoon.claim?.claimId === 'string'
    && typeof candidate.assetTycoon.claim.attemptId === 'string'
    && typeof candidate.assetTycoon.claim.player === 'string'
    && typeof candidate.assetTycoon.claim.nonce === 'string'
    && typeof candidate.assetTycoon.claim.deadline === 'string');
  return Boolean(candidate.claim)
    && typeof candidate.signature === 'string'
    && typeof candidate.claim?.claimId === 'string'
    && typeof candidate.claim.attemptId === 'string'
    && typeof candidate.claim.player === 'string'
    && typeof candidate.claim.tokenAmount === 'string'
    && typeof candidate.claim.nonce === 'string'
    && typeof candidate.claim.deadline === 'string'
    && validLoot
    && validAssetTycoon;
}
