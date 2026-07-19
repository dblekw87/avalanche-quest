export type StageDifficultyTier =
  | 'veteran'
  | 'master'
  | 'hard'
  | 'extreme'
  | 'cataclysm';

export type StageDifficultyProfile = Readonly<{
  tier: StageDifficultyTier;
  label: string;
  recommendedSkillLevel: 2 | 4 | 5 | 6 | 7;
  normalHealthPermille: number;
  eliteHealthPermille: number;
  bossHealthPermille: number;
  minimumNormalHealth: number;
  minimumEliteHealth: number;
  minimumBossHealth: number;
  incomingDamagePermille: number;
  minionCastCadenceMs: number;
  minionMeleeCadenceMs: number;
  bossRecoveryPaddingMs: number;
  hostileProjectileSpeedPxPerSec: number;
}>;

const DIFFICULTY_PROFILES: Readonly<Record<StageDifficultyTier, StageDifficultyProfile>> = {
  veteran: {
    tier: 'veteran',
    label: 'VETERAN',
    recommendedSkillLevel: 2,
    normalHealthPermille: 1_900,
    eliteHealthPermille: 2_000,
    bossHealthPermille: 1_900,
    minimumNormalHealth: 4,
    minimumEliteHealth: 30,
    minimumBossHealth: 50,
    incomingDamagePermille: 1_250,
    minionCastCadenceMs: 2_200,
    minionMeleeCadenceMs: 900,
    bossRecoveryPaddingMs: 620,
    hostileProjectileSpeedPxPerSec: 225,
  },
  master: {
    tier: 'master',
    label: 'MASTER',
    recommendedSkillLevel: 4,
    normalHealthPermille: 2_500,
    eliteHealthPermille: 2_700,
    bossHealthPermille: 2_600,
    minimumNormalHealth: 12,
    minimumEliteHealth: 90,
    minimumBossHealth: 180,
    incomingDamagePermille: 1_600,
    minionCastCadenceMs: 1_850,
    minionMeleeCadenceMs: 760,
    bossRecoveryPaddingMs: 500,
    hostileProjectileSpeedPxPerSec: 235,
  },
  hard: {
    tier: 'hard',
    label: 'HARD',
    recommendedSkillLevel: 5,
    normalHealthPermille: 3_200,
    eliteHealthPermille: 3_500,
    bossHealthPermille: 3_400,
    minimumNormalHealth: 24,
    minimumEliteHealth: 180,
    minimumBossHealth: 420,
    incomingDamagePermille: 2_000,
    minionCastCadenceMs: 1_550,
    minionMeleeCadenceMs: 650,
    bossRecoveryPaddingMs: 380,
    hostileProjectileSpeedPxPerSec: 242,
  },
  extreme: {
    tier: 'extreme',
    label: 'EXTREME HARD',
    recommendedSkillLevel: 6,
    normalHealthPermille: 4_200,
    eliteHealthPermille: 4_600,
    bossHealthPermille: 4_500,
    minimumNormalHealth: 42,
    minimumEliteHealth: 320,
    minimumBossHealth: 900,
    incomingDamagePermille: 2_500,
    minionCastCadenceMs: 1_280,
    minionMeleeCadenceMs: 540,
    bossRecoveryPaddingMs: 260,
    hostileProjectileSpeedPxPerSec: 248,
  },
  cataclysm: {
    tier: 'cataclysm',
    label: 'CATACLYSM',
    recommendedSkillLevel: 7,
    normalHealthPermille: 5_800,
    eliteHealthPermille: 6_400,
    bossHealthPermille: 6_800,
    minimumNormalHealth: 70,
    minimumEliteHealth: 620,
    minimumBossHealth: 1_800,
    incomingDamagePermille: 3_300,
    minionCastCadenceMs: 1_050,
    minionMeleeCadenceMs: 460,
    bossRecoveryPaddingMs: 140,
    hostileProjectileSpeedPxPerSec: 250,
  },
};

export function getStageDifficulty(stageNumber: number): StageDifficultyProfile {
  if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > 40) {
    throw new Error(`Unsupported stage difficulty number: ${stageNumber}.`);
  }
  if (stageNumber >= 37) return DIFFICULTY_PROFILES.cataclysm;
  if (stageNumber >= 31) return DIFFICULTY_PROFILES.extreme;
  if (stageNumber >= 21) return DIFFICULTY_PROFILES.hard;
  if (stageNumber >= 11) return DIFFICULTY_PROFILES.master;
  return DIFFICULTY_PROFILES.veteran;
}

export function scaleStageHealth(baseHealth: number, permille: number, minimum: number): number {
  return Math.max(minimum, Math.ceil((baseHealth * permille) / 1_000));
}
