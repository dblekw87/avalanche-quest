'use client';

import { useCallback, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, getAddress, isAddress, type Hex } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';

import { rewardDistributorAbi } from '@/features/rewards/reward-contract';
import { gameItemAbi } from '@/features/items/item-contract';
import { SkillShop } from '@/features/skills/skill-shop';
import { UpgradeShop } from '@/features/upgrades/upgrade-shop';
import type { UpgradeLevels } from '@/features/upgrades/upgrade-contract';
import { transactionErrorMessage } from '@/features/web3/transaction-feedback';
import type { StageFailure, StageResult } from '@/game/bridge/events';
import { isPoliticalCharacter, type CharacterGroup, type CharacterId } from '@/game/characters';
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
};

type AuthorizedLoot = {
  claim: { claimId: Hex; attemptId: Hex; player: Hex; itemType: number; rarity: number; power: number; metadataHash: Hex; nonce: string; deadline: string };
  metadataURI: string; signature: Hex; name: string; rarityName: string; typeName: string;
};

export function GameExperience() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [stageId, setStageId] = useState<StageId>('verdant-pass');
  const [characterId, setCharacterId] = useState<CharacterId>('warrior');
  const [characterGroup, setCharacterGroup] = useState<CharacterGroup>('general');
  const [attemptId, setAttemptId] = useState<string | null>(null);
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
  const activeOwnedSkillIds = isPoliticalCharacter(characterId)
    ? politicalFighters[characterId].skills.map((skill) => `${characterId}-${skill.key.toLowerCase()}`)
    : ownedSkillIds;
  const handleStageComplete = useCallback((nextResult: StageResult) => { setResult(nextResult); setShowAdvancePrompt(true); }, []);

  const resetRun = useCallback(() => {
    setAttemptId(null);
    setResult(null);
    setFailure(null);
    setTransactionState('idle');
    setTransactionHash(null);
    setLoot(null); setLootTransactionState('idle'); setLootHash(null);
    setMessage(null);
  }, []);

  const requestAttempt = async (targetStageId: StageId): Promise<string> => {
    if (!address) throw new Error('Connect a wallet before starting a reward-eligible stage.');
    if (chainId !== avalancheFuji.id) throw new Error('Switch your wallet to Avalanche Fuji before starting.');
    const response = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ player: address, stageId: targetStageId }),
    });
    const data: unknown = await response.json();
    if (!response.ok || !data || typeof data !== 'object' || !('attemptId' in data) || typeof data.attemptId !== 'string') {
      throw new Error(readError(data, 'Could not create a stage attempt.'));
    }
    return data.attemptId;
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
      const nextAttemptId = await requestAttempt(nextStageId);
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
      setAttemptId(nextAttemptId);
      setShowAdvancePrompt(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not continue to the next stage.');
    } finally {
      setStarting(false);
    }
  };
  const advanceToNextStage = () => { void continueToNextStage(false); };

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
      setAttemptId(await requestAttempt(targetStageId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start the stage.');
    } finally {
      setStarting(false);
    }
  };

  const mintLoot = async () => {
    const itemValue = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS;
    if (!loot || !publicClient || !itemValue || !isAddress(itemValue)) { setLootTransactionState('error'); setMessage('Game item contract configuration is missing.'); return; }
    setLootTransactionState('pending'); setMessage(`${loot.name} NFT 발행을 지갑에서 확인해 주세요.`);
    try {
      const hash = await writeContractAsync({
        address: getAddress(itemValue), abi: gameItemAbi, functionName: 'mintItem',
        args: [{ ...loot.claim, player: getAddress(loot.claim.player), nonce: BigInt(loot.claim.nonce), deadline: BigInt(loot.claim.deadline) }, loot.metadataURI, loot.signature],
        chainId: avalancheFuji.id,
      });
      setLootHash(hash); await publicClient.waitForTransactionReceipt({ hash });
      setLootTransactionState('success'); setMessage(`${loot.rarityName} ${loot.typeName} ${loot.name} NFT 발행에 성공하였습니다.`);
    } catch (error) { setLootTransactionState('error'); setMessage(transactionErrorMessage(error)); }
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
        body: JSON.stringify({ player: address, result }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !isAuthorizedReward(data)) {
        throw new Error(readError(data, 'Reward authorization failed.'));
      }
      setLoot(data.loot);
      if (!data.loot) setMessage('AQT 보상은 지급되지만 이번 보스에서는 희귀 장비가 드롭되지 않았습니다.');
      setMessage('보상 수령 거래를 지갑에서 확인해 주세요.');
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
      setMessage('트랜잭션이 제출되었습니다. Fuji 승인을 기다리고 있습니다…');
      await publicClient.waitForTransactionReceipt({ hash });
      setTransactionState('success');
      setMessage(`${formatEther(claim.tokenAmount)} AQT 보상 수령에 성공하였습니다.${data.loot ? ' 희귀 보스 장비가 드롭되었습니다!' : ' 이번에는 희귀 보스 장비가 드롭되지 않았습니다.'}`);
      if (stage.number < stageIds.length) await continueToNextStage(true);
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
              <span className="faction-conservative">보수 진영</span>
              <span className="mx-3 text-white">VS</span>
              <span className="faction-progressive">진보 진영</span>
            </h1>
            <p className="mt-2 text-xs text-[#aca496]">선택한 진영으로 플레이하며 반대 진영은 모든 스킬과 12개 패턴을 사용하는 하드 보스로 등장합니다.</p>
          </div>
          <PoliticalDuelCanvas key={duelFaction} faction={duelFaction} onExit={() => setDuelFaction(null)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0e110d] pt-16">
      <div className="mx-auto max-w-[1400px] px-2 py-3 sm:px-3 sm:py-5 md:px-6">
        <section className="mb-5 overflow-hidden rounded-2xl border border-[#5a5145] bg-gradient-to-r from-[#24090d] via-[#0b0d13] to-[#071a2b] p-4 shadow-xl sm:p-5">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-between">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold tracking-[.26em] text-[#d8c9b0]">NEW SPECIAL DUEL</span>
              <h2 className="mt-2 text-xl font-black sm:text-2xl">
                <span className="faction-conservative">보수 진영</span>
                <span className="mx-2 text-white">VS</span>
                <span className="faction-progressive">진보 진영</span>
              </h2>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-[#aaa194]">장애물 없는 전용 대전 맵에서 SD 캐릭터끼리 맞붙습니다. Q/W/E/R/Z/X/C/V 스킬 전체와 12개 하드 보스 패턴이 활성화됩니다.</p>
            </div>
            <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:w-auto sm:min-w-[330px] sm:gap-3">
              {(['conservative', 'progressive'] as const).map((faction) => {
                const fighter = politicalFighters[faction];
                const conservative = faction === 'conservative';
                return (
                  <button key={faction} type="button" onClick={() => setDuelFaction(faction)} className={`min-w-0 rounded-xl border p-3 text-center transition hover:-translate-y-0.5 sm:p-4 sm:text-left ${conservative ? 'border-[#b9363c] bg-[#451117]/70 hover:bg-[#5b151d]' : 'border-[#276fbe] bg-[#092c50]/70 hover:bg-[#0b3b6e]'}`}>
                    <strong className={`block text-sm ${conservative ? 'faction-conservative' : 'faction-progressive'}`}>{fighter.label}</strong>
                    <span className={`mt-1 block text-[10px] ${conservative ? 'text-[#ff9da1]' : 'text-[#8dccff]'}`}>{fighter.role}로 시작</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <div className="mb-4 grid gap-4 border-y border-[#4f4637] bg-[#1c1914] p-3 sm:p-4 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="text-[10px] tracking-[.2em] text-[#a88350]">CHOOSE EXPEDITION</span>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {(Object.keys(stages) as StageId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={attemptId !== null}
                  onClick={() => setStageId(id)}
                  className={`min-w-0 border px-3 py-3 text-center sm:px-4 sm:text-left ${stageId === id ? 'border-[#d0aa68] bg-[#33271b] text-[#f0dfbd]' : 'border-[#514838] text-[#9f9583]'}`}
                >
                  <span className="block text-[9px] tracking-[.16em]">STAGE {String(stages[id].number).padStart(2, '0')}</span>
                  <strong className="mt-1 block text-sm">{stages[id].name}</strong>
                </button>
              ))}
            </div>
            <div className="mx-auto mt-4 flex w-full max-w-md justify-center gap-2 rounded-xl border border-[#514838] bg-[#12100d] p-1 sm:mx-0 sm:w-fit sm:max-w-none">
              {([['general', '일반 클래스'], ['special', '스페셜 클래스']] as const).map(([group, label]) => (
                <button key={group} type="button" disabled={attemptId !== null} onClick={() => { setCharacterGroup(group); setCharacterId(group === 'general' ? 'warrior' : 'conservative'); }} className={`flex-1 rounded-lg px-5 py-2.5 text-xs font-bold sm:flex-none ${characterGroup === group ? 'bg-[#e9dcc5] text-[#201c17]' : 'text-[#9f9583]'}`}>{label}</button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {(characterGroup === 'general'
                ? ([['warrior', '용사', '검과 근접 공격'], ['mage', '마법사', '마법과 원거리 연출'], ['spellblade', '마검사', '비전 검술과 순간 이동'], ['archer', '궁수', '활과 바람 원거리 공격']] as const)
                : ([['conservative', '보수 진영', '남성 SD 검사 · 전용 스킬 8종'], ['progressive', '진보 진영', '여성 SD 마도사 · 전용 스킬 8종']] as const)
              ).map(([id, name, role]) => {
                const special = id === 'conservative' || id === 'progressive';
                return <button key={id} type="button" disabled={attemptId !== null} onClick={() => setCharacterId(id)} className={`min-w-0 rounded-xl border px-3 py-3 text-center sm:px-4 sm:text-left ${characterId === id ? special ? id === 'conservative' ? 'border-[#d94149] bg-[#451117]' : 'border-[#3089df] bg-[#092f56]' : 'border-[#9a6728] bg-[#f3eadc]' : 'border-[#ddd4c7] bg-white'}`}><strong className={`block text-sm ${id === 'conservative' ? 'faction-conservative' : id === 'progressive' ? 'faction-progressive' : 'text-[#201c17]'}`}>{name}</strong><span className="mt-1 block text-[10px] text-[#6f685e]">{role}</span></button>;
              })}
            </div>
          </div>
          <div className="flex w-full items-end justify-center gap-3 lg:w-auto lg:justify-end">
            {!attemptId ? (
              <button type="button" onClick={() => void startStage()} disabled={starting} className="w-full max-w-md border border-[#d0b47a] bg-[#a8793d] px-8 py-3.5 text-xs font-bold text-[#17120b] disabled:opacity-50 lg:w-auto lg:min-w-56">
                {starting ? 'PREPARING…' : 'START STAGE'}
              </button>
            ) : (
              <button type="button" onClick={resetRun} className="w-full max-w-md border border-[#675b48] px-8 py-3.5 text-xs text-[#c8b99c] lg:w-auto lg:min-w-56">NEW ATTEMPT</button>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-col items-center gap-1 border border-[#4f4637] bg-[#17140f] px-4 py-3 text-center sm:block sm:text-left">
          <strong className="text-[#e6d7ba]">{stage.name}</strong>
          <span className="text-xs text-[#938a7a] sm:ml-3">{stage.subtitle}</span>
        </div>

        {!isPoliticalCharacter(characterId) ? <SkillShop
          onOwnershipChange={handleSkillOwnershipChange}
          onArmorOwnershipChange={setArmorOwned}
          onSkillLevelsChange={handleSkillLevelsChange}
          onArmorLevelChange={setArmorLevel}
          onBalanceChange={setAqtBalance}
          characterId={characterId}
          refreshKey={`${transactionState}:${transactionHash ?? 'none'}`}
        /> : <section className="mb-4 rounded-2xl border border-[#5a5145] bg-[#15130f] p-5"><p className="text-[10px] font-bold tracking-[.2em] text-[#d0b47a]">SPECIAL CLASS LOADOUT</p><h3 className={`mt-2 text-xl font-black ${characterId === 'conservative' ? 'faction-conservative' : 'faction-progressive'}`}>{politicalFighters[characterId].label} 전용 스킬 8종</h3><p className="mt-2 text-xs text-[#aaa194]">Q/W/E/R/Z/X/C/V 스킬이 모두 해금되어 있으며 일반 스테이지의 일반 몬스터와 보스에게 사용할 수 있습니다.</p></section>}

        <UpgradeShop onLevelsChange={handleUpgradeLevelsChange} disabled={attemptId !== null} />

        {attemptId ? (
          <GameCanvas
            key={attemptId}
            attemptId={attemptId}
            stageId={stageId}
            onComplete={handleStageComplete}
            onFailure={setFailure}
            ownedSkillIds={activeOwnedSkillIds}
            armorEquipped={armorOwned}
            armorLevel={armorLevel}
            aqtBalance={formatEther(aqtBalance)}
            characterId={characterId}
            upgradeLevels={upgradeLevels}
            skillUpgradeLevels={skillUpgradeLevels}
          />
        ) : (
          <div className="grid min-h-72 place-items-center border border-[#675b48] bg-[#102019] p-5 text-center sm:aspect-[112/52] sm:min-h-0 sm:p-8">
            <div className="flex flex-col items-center">
              <p className="text-sm text-[#d8c8aa]">Connect a wallet on Avalanche Fuji, then start the expedition.</p>
              <p className="mt-2 text-xs text-[#849087]">A server-issued attempt is required for token rewards.</p>
              <div className="mt-5"><ConnectButton showBalance={false} /></div>
            </div>
          </div>
        )}

        {result && showAdvancePrompt ? <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-5"><section role="dialog" aria-modal="true" aria-labelledby="stage-clear-title" className="w-full max-w-md rounded-2xl border border-[#d0b47a] bg-[#fffaf0] p-7 text-[#211b15] shadow-2xl"><p className="text-xs font-bold tracking-[.2em] text-[#9a6728]">STAGE {stage.number} CLEAR</p><h2 id="stage-clear-title" className="mt-3 text-3xl font-bold">보스를 처치했습니다!</h2><p className="mt-4 text-sm leading-6 text-[#6d6255]">{stage.number < 20 ? '다음 스테이지로 이동하시겠습니까? 이동하면 현재 보상 화면은 닫히므로 필요한 보상을 먼저 수령해 주세요.' : '모든 원정을 완료했습니다. 현재 스테이지의 보상을 확인해 주세요.'}</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{stage.number < 20 ? <button type="button" onClick={advanceToNextStage} className="rounded-lg bg-[#9a6728] px-5 py-3 text-sm font-bold text-white">다음 스테이지</button> : null}<button type="button" onClick={() => setShowAdvancePrompt(false)} className="rounded-lg border border-[#bbaa94] bg-white px-5 py-3 text-sm font-bold">보상 화면 보기</button></div></section></div> : null}

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
        {failure ? <p className="mt-4 border border-[#7d4444] bg-[#2b1919] p-4 text-sm text-[#e7aaaa]">Expedition failed after {(failure.durationMs / 1000).toFixed(1)}s. Start a new attempt to retry.</p> : null}
        {message ? <p className={`mt-4 border p-3 text-sm ${transactionState === 'error' ? 'border-[#7d4444] text-[#e7aaaa]' : 'border-[#5d684d] text-[#c9d6aa]'}`}>{message}</p> : null}
        {transactionHash ? <a className="mt-3 block text-xs text-[#c49a5a] underline" href={`https://testnet.snowtrace.io/tx/${transactionHash}`} target="_blank" rel="noreferrer">View transaction on Snowtrace</a> : null}
        <div className="mx-auto mt-4 max-w-3xl text-center text-xs leading-5 text-[#938a7a]"><span className="sm:hidden">화면 버튼: 이동 · 점프 · 대시 · 공격 · 스킬</span><span className="hidden sm:inline">Arrow keys: move and double jump · SHIFT: dash · SPACE: attack · Q/W/E/R/T: purchased skills</span></div>
        {!isConnected ? <p className="mt-2 text-center text-xs text-[#c88f70]">Wallet connection required for reward attempts.</p> : null}
      </div>
    </main>
  );
}

function readError(value: unknown, fallback: string) {
  return value && typeof value === 'object' && 'error' in value && typeof value.error === 'string'
    ? value.error
    : fallback;
}

function isAuthorizedReward(value: unknown): value is AuthorizedReward {
  if (!value || typeof value !== 'object' || !('claim' in value) || !('signature' in value) || !('loot' in value)) return false;
  const candidate = value as { claim?: Partial<AuthorizedReward['claim']>; signature?: unknown; loot?: Partial<AuthorizedLoot> | null };
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
  return Boolean(candidate.claim)
    && typeof candidate.signature === 'string'
    && typeof candidate.claim?.claimId === 'string'
    && typeof candidate.claim.attemptId === 'string'
    && typeof candidate.claim.player === 'string'
    && typeof candidate.claim.tokenAmount === 'string'
    && typeof candidate.claim.nonce === 'string'
    && typeof candidate.claim.deadline === 'string'
    && validLoot;
}
