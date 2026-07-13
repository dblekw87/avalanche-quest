'use client';

import { useEffect, useRef, useState } from 'react';

import type { StageFailure, StageResult } from '@/game/bridge/events';
import type { CharacterId } from '@/game/characters';
import { stages, type StageId } from '@/game/config/stages';
import type { UpgradeLevels } from '@/features/upgrades/upgrade-contract';
import { MobileGameControls, questMobileSkills, type MobileGameAction } from '@/game/mobile-game-controls';

type QuestSceneControls = {
  setEquipmentParticlesEnabled: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
  unlockAudio: () => void;
  setMobileAction: (action: MobileGameAction, active: boolean) => void;
  triggerMobileSkill: (skillId: string) => void;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

type GameCanvasProps = {
  attemptId: string;
  stageId: StageId;
  onComplete: (result: StageResult) => void;
  onFailure: (failure: StageFailure) => void;
  ownedSkillIds: readonly string[];
  armorEquipped: boolean;
  armorLevel: number;
  aqtBalance: string;
  characterId: CharacterId;
  upgradeLevels: UpgradeLevels;
  skillUpgradeLevels: Readonly<Record<string, number>>;
};

export function GameCanvas({ attemptId, stageId, onComplete, onFailure, ownedSkillIds, armorEquipped, armorLevel, aqtBalance, characterId, upgradeLevels, skillUpgradeLevels }: GameCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const sceneRef = useRef<QuestSceneControls | null>(null);
  const [result, setResult] = useState<StageResult | null>(null);
  const [failure, setFailure] = useState<StageFailure | null>(null);
  const [equipmentParticlesEnabled, setEquipmentParticlesEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setEquipmentParticlesEnabled(window.localStorage.getItem('aqt-equipment-particles') !== 'off');
      setAudioEnabled(window.localStorage.getItem('aqt-game-audio-v2') === 'on');
      setPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('aqt-equipment-particles', equipmentParticlesEnabled ? 'on' : 'off');
    sceneRef.current?.setEquipmentParticlesEnabled(equipmentParticlesEnabled);
  }, [equipmentParticlesEnabled, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('aqt-game-audio-v2', audioEnabled ? 'on' : 'off');
    sceneRef.current?.setAudioEnabled(audioEnabled);
  }, [audioEnabled, preferencesReady]);

  useEffect(() => {
    const unlockAudio = () => sceneRef.current?.unlockAudio();
    window.addEventListener('pointerdown', unlockAudio, { capture: true });
    window.addEventListener('keydown', unlockAudio, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio, { capture: true });
      window.removeEventListener('keydown', unlockAudio, { capture: true });
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let game: import('phaser').Game | undefined;

    async function boot() {
      const Phaser = await import('phaser');
      const { QuestScene } = await import('@/game/scenes/quest-scene');
      if (disposed || !containerRef.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 1120,
        height: 520,
        backgroundColor: '#102019',
        pixelArt: true,
        roundPixels: true,
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 980 }, debug: false },
        },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [new QuestScene(stageId, attemptId, ownedSkillIds, armorEquipped, armorLevel, aqtBalance, characterId, upgradeLevels, skillUpgradeLevels, true)],
      });
      gameRef.current = game;

      game.events.once(Phaser.Core.Events.READY, () => {
        const scene = game?.scene.getScene('QuestScene');
        if (scene && 'setEquipmentParticlesEnabled' in scene && 'setAudioEnabled' in scene && 'unlockAudio' in scene && 'setMobileAction' in scene && 'triggerMobileSkill' in scene) {
          sceneRef.current = scene as unknown as QuestSceneControls;
          sceneRef.current.setEquipmentParticlesEnabled(window.localStorage.getItem('aqt-equipment-particles') !== 'off');
          sceneRef.current.setAudioEnabled(window.localStorage.getItem('aqt-game-audio-v2') === 'on');
        }
        scene?.events.on('stage-completed', (payload: StageResult) => {
          setResult(payload);
          onComplete(payload);
        });
        scene?.events.on('stage-failed', (payload: StageFailure) => {
          setFailure(payload);
          onFailure(payload);
        });
      });
    }

    void boot();
    return () => {
      disposed = true;
      gameRef.current = null;
      sceneRef.current = null;
      game?.destroy(true);
    };
  }, [armorEquipped, armorLevel, aqtBalance, attemptId, characterId, onComplete, onFailure, ownedSkillIds, skillUpgradeLevels, stageId, upgradeLevels]);

  useEffect(() => {
    const refreshScale = () => window.requestAnimationFrame(() => gameRef.current?.scale.refresh());
    window.addEventListener('orientationchange', refreshScale);
    window.addEventListener('resize', refreshScale);
    document.addEventListener('fullscreenchange', refreshScale);
    return () => {
      window.removeEventListener('orientationchange', refreshScale);
      window.removeEventListener('resize', refreshScale);
      document.removeEventListener('fullscreenchange', refreshScale);
    };
  }, []);

  const enterFullscreen = async () => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      if (!document.fullscreenElement) await frame.requestFullscreen();
      const orientation = screen.orientation as LockableScreenOrientation;
      await orientation.lock?.('landscape').catch(() => undefined);
    } catch {
      // Fullscreen and orientation locking are browser capabilities. The game
      // remains playable in the responsive inline frame when either is denied.
    }
  };

  return (
    <div className="mobile-game-shell">
      <div ref={frameRef} className="game-frame mobile-game-stage relative overflow-hidden border border-[#675b48] bg-[#102019] shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
        <div ref={containerRef} className="game-canvas-host aspect-[112/52] w-full" />
        {!result && !failure ? (
          <MobileGameControls
            skills={questMobileSkills(characterId, ownedSkillIds)}
            onAction={(action, active) => sceneRef.current?.setMobileAction(action, active)}
            onSkill={(skillId) => sceneRef.current?.triggerMobileSkill(skillId)}
            onFullscreen={() => void enterFullscreen()}
          />
        ) : null}
        {result || failure ? (
          <div className="absolute inset-0 z-40 grid place-items-center bg-[#17140f]/90 p-4 sm:p-6">
            <div className="max-w-md text-center">
              <p className="text-xs font-bold tracking-[0.24em] text-[#c8a96b]">
                {result ? 'STAGE COMPLETE' : 'EXPEDITION FAILED'}
              </p>
              <h2 className="font-display mt-4 text-4xl text-[#f1e4c7]">
                {result ? `${stages[stageId].name.toUpperCase()} CLEARED` : 'RETURN TO CAMP'}
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#aaa08e]">
                {result
                  ? `Completion time ${(result.durationMs / 1000).toFixed(1)} seconds. The run log is ready for future verification.`
                  : `You held out for ${((failure?.durationMs ?? 0) / 1000).toFixed(1)} seconds. Try again and defeat every hostile.`}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mx-auto mt-7 block w-full max-w-xs border border-[#d0b47a] bg-[#a8793d] px-6 py-3 text-xs font-extrabold tracking-[0.14em] text-[#17120b] hover:bg-[#c49a5a] sm:w-auto"
              >
                {result ? 'PLAY AGAIN' : 'RETRY STAGE'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-[#4f4638] bg-[#12100d] p-2 sm:justify-between">
        <div className="w-full min-w-0 px-2 text-center sm:mr-auto sm:w-auto sm:text-left">
          <strong className="block text-xs font-black text-[#f1e2c6]">{gameCharacterLabel(characterId)}</strong>
          <span className="mt-1 block text-[10px] font-semibold text-[#9f9583] sm:hidden">Touch Move · Jump · Dash · Attack · Skill buttons</span>
          <span className="mt-1 hidden text-[10px] font-semibold text-[#9f9583] sm:block">Arrows Move · ↑ Double Jump · Shift Dash · Space Attack · Q/W/E/R/T Skills</span>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
          <button
          type="button"
          onClick={() => setEquipmentParticlesEnabled((enabled) => !enabled)}
          className="min-w-32 rounded border border-[#7f735f] bg-[#211c15] px-3 py-2 text-[10px] font-bold tracking-[.08em] text-[#f2dfbd] hover:border-[#d0b47a]"
          aria-pressed={equipmentParticlesEnabled}
        >
          Upgrade VFX {equipmentParticlesEnabled ? 'ON' : 'OFF'}
        </button>
          <button
          type="button"
          onClick={() => {
            const enabled = !audioEnabled;
            sceneRef.current?.setAudioEnabled(enabled);
            if (enabled) sceneRef.current?.unlockAudio();
            setAudioEnabled(enabled);
          }}
          className="min-w-32 rounded border border-[#7f735f] bg-[#211c15] px-3 py-2 text-[10px] font-bold tracking-[.08em] text-[#f2dfbd] hover:border-[#d0b47a]"
          aria-pressed={audioEnabled}
        >
          Sound {audioEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}

function gameCharacterLabel(characterId: CharacterId) {
  const labels: Record<CharacterId, string> = {
    warrior: 'Warrior', mage: 'Mage', spellblade: 'Spellblade', archer: 'Archer', dualblade: 'Dualblade', brawler: 'Brawler',
    dragonknight: 'Dragon Knight', gunslinger: 'Gunslinger', ssaulabi: 'Ssaulabi', kickfighter: 'Kickfighter', venomancer: 'Venomancer',
    pyromancer: 'Pyromancer', hammerguard: 'Hammerguard', axereaver: 'Axe Reaver', conservative: 'Conservative Faction',
    progressive: 'Progressive Faction', assettycoon: 'Asset Tycoon',
  };
  return labels[characterId];
}
