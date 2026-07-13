'use client';

import { useEffect, useRef, useState } from 'react';
import type { Address, Hex } from 'viem';

import { MobileGameControls, duelMobileSkills, type MobileGameAction } from '@/game/mobile-game-controls';

import type { PoliticalFaction } from './definitions';

type DuelSceneControls = {
  setAudioEnabled: (enabled: boolean) => void;
  unlockAudio: () => void;
  setMobileAction: (action: MobileGameAction, active: boolean) => void;
  triggerMobileSkill: (skillId: string) => void;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

type PoliticalDuelCanvasProps = {
  faction: PoliticalFaction;
  player: Address | null;
  onAssetTycoonReward: (reward: { claim: { claimId: Hex; attemptId: Hex; player: Address; nonce: string; deadline: string }; signature: Hex }) => void;
  onExit: () => void;
};

export function PoliticalDuelCanvas({ faction, player, onAssetTycoonReward, onExit }: PoliticalDuelCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const sceneRef = useRef<DuelSceneControls | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioPreferenceReady, setAudioPreferenceReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAudioEnabled(window.localStorage.getItem('aqt-game-audio-v2') === 'on');
      setAudioPreferenceReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!audioPreferenceReady) return;
    window.localStorage.setItem('aqt-game-audio-v2', audioEnabled ? 'on' : 'off');
    sceneRef.current?.setAudioEnabled(audioEnabled);
  }, [audioEnabled, audioPreferenceReady]);

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
      const attemptResponse = player ? await fetch('/api/duel-attempts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ player, faction }) }) : null;
      const attemptPayload: unknown = attemptResponse?.ok ? await attemptResponse.json() : null;
      const duelAttemptId = attemptPayload && typeof attemptPayload === 'object' && 'attemptId' in attemptPayload && typeof attemptPayload.attemptId === 'string' ? attemptPayload.attemptId : null;
      const Phaser = await import('phaser');
      const { PoliticalDuelScene } = await import('./political-duel-scene');
      if (disposed || !containerRef.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 1120,
        height: 520,
        backgroundColor: '#080b12',
        pixelArt: false,
        roundPixels: true,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1_050 }, debug: false } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [new PoliticalDuelScene(faction)],
      });
      gameRef.current = game;
      game.events.once(Phaser.Core.Events.READY, () => {
        const scene = game?.scene.getScene('PoliticalDuelScene');
        if (scene && 'setAudioEnabled' in scene && 'unlockAudio' in scene && 'setMobileAction' in scene && 'triggerMobileSkill' in scene) {
          sceneRef.current = scene as unknown as DuelSceneControls;
          sceneRef.current.setAudioEnabled(window.localStorage.getItem('aqt-game-audio-v2') === 'on');
        }
        scene?.events.on('duel-completed', (result: { playerWon: boolean; durationMs: number }) => {
          if (!result.playerWon || !player || !duelAttemptId) return;
          void fetch('/api/duel-rewards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ player, attemptId: duelAttemptId, durationMs: result.durationMs }) })
            .then(async (response) => response.ok ? response.json() as Promise<{ claim: { claimId: Hex; attemptId: Hex; player: Address; nonce: string; deadline: string }; signature: Hex }> : Promise.reject(new Error('Duel reward failed')))
            .then(onAssetTycoonReward)
            .catch(() => undefined);
        });
      });
    }

    void boot();
    return () => { disposed = true; gameRef.current = null; sceneRef.current = null; game?.destroy(true); };
  }, [faction, onAssetTycoonReward, player]);

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
      // Unsupported fullscreen/orientation APIs fall back to the inline layout.
    }
  };

  return (
    <section className="mobile-game-shell space-y-3">
      <div ref={frameRef} className="game-frame mobile-game-stage relative overflow-hidden rounded-2xl border border-[#74664f] bg-[#080b12] shadow-[0_20px_70px_rgba(0,0,0,.55)]">
        <div ref={containerRef} className="game-canvas-host aspect-[112/52] w-full" />
        <MobileGameControls
          skills={duelMobileSkills(faction)}
          onAction={(action, active) => sceneRef.current?.setMobileAction(action, active)}
          onSkill={(skillId) => sceneRef.current?.triggerMobileSkill(skillId)}
          onFullscreen={() => void enterFullscreen()}
        />
      </div>
      <div className="flex justify-center rounded-lg border border-[#4f4638] bg-[#12100d] p-2 sm:justify-end">
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
      <button type="button" onClick={onExit} className="mx-auto block w-full max-w-sm rounded-lg border border-[#74664f] bg-[#211b15] px-5 py-3 text-xs font-bold text-[#e9dcc5] hover:bg-[#30271d] sm:mx-0 sm:w-auto">
        Exit Special Duel
      </button>
    </section>
  );
}
