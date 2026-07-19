export type CombatPresentationStatus = 'production' | 'shared-placeholder';

export type StageCombatPresentationManifest = Readonly<{
  stageNumber: number;
  bossActorSrc: string;
  bossActorStatus: CombatPresentationStatus;
  minionActorSrc: string;
  minionActorStatus: CombatPresentationStatus;
  bossProjectileSrc: string;
  bossProjectileStatus: 'production';
  minionProjectileSrc: string;
  minionProjectileStatus: 'production';
  telegraphMode: 'procedural-geometry';
  telegraphShapeSignature: string;
}>;

const BOSS_KEYS = [
  'goblin-warlord', 'mist-wolf', 'rune-golem', 'lava-dragon', 'ice-queen',
  'desert-scorpion', 'wind-harpy', 'vampire-lord', 'deep-kraken', 'thunder-minotaur',
  'plague-necromancer', 'crystal-hydra', 'clockwork-titan', 'sand-wyrm', 'celestial-griffin',
  'void-witch', 'frost-mammoth', 'inferno-phoenix', 'abyss-leviathan', 'avalanche-emperor',
  'obsidian-behemoth', 'spectral-broker', 'iron-seraph', 'toxic-singularity', 'solar-devourer',
  'gravity-colossus', 'ruin-sovereign', 'chaos-auditor', 'extinction-dragon', 'compound-overlord',
  'eclipse-executioner', 'paradox-machinist', 'blood-moon-tyrant', 'infinite-tempest', 'godfall-arbiter',
  'chronos-warden', 'astral-gravekeeper', 'hellfire-origin', 'absolute-zero', 'eternity-devourer',
] as const;

export const STAGE_COMBAT_PRESENTATIONS: readonly StageCombatPresentationManifest[] = BOSS_KEYS.map(
  (bossKey, index) => {
    const stageNumber = index + 1;
    const special = stageNumber >= 31;
    const stageAssetNumber = special ? 21 + (stageNumber - 31) : stageNumber;
    const stageAssetKey = String(stageAssetNumber).padStart(2, '0');
    return {
      stageNumber,
      bossActorSrc: special
        ? `/assets/boss-animation-sheets-special/${bossKey}.png`
        : `/assets/boss-animation-sheets/${bossKey}.png`,
      bossActorStatus: 'production',
      minionActorSrc: special
        ? `/assets/minions-special/${bossKey}.png`
        : `/assets/minions-hd/stage-${stageAssetKey}.png`,
      minionActorStatus: 'production',
      bossProjectileSrc: special
        ? `/assets/boss-projectiles-special-alpha/${bossKey}.png`
        : `/assets/boss-projectiles-alpha/${bossKey}.png`,
      bossProjectileStatus: 'production',
      minionProjectileSrc: special
        ? `/assets/projectiles-special/${bossKey}.png`
        : `/assets/projectiles-alpha/stage-${stageAssetKey}.png`,
      minionProjectileStatus: 'production',
      telegraphMode: 'procedural-geometry',
      telegraphShapeSignature: `stage-${stageNumber}.star-${5 + (stageNumber % 8)}.${18 + (stageNumber % 5) * 2}.${31 + (stageNumber % 7) * 3}.${stageNumber % 2 === 0 ? 'cw' : 'ccw'}`,
    };
  },
);

export function getStageCombatPresentation(stageNumber: number): StageCombatPresentationManifest {
  const manifest = STAGE_COMBAT_PRESENTATIONS[stageNumber - 1];
  if (!manifest) throw new Error(`Missing combat presentation manifest for stage ${stageNumber}.`);
  return manifest;
}
