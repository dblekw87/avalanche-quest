export type AssetTycoonSkill = {
  id: string;
  key: 'Q' | 'W' | 'E' | 'R' | 'Z' | 'X' | 'C' | 'V' | 'T';
  name: string;
  description: string;
  cooldownMs: number;
  damage: number;
  buff?: true;
};

export const assetTycoonSkills = [
  { id: 'market-survivor', key: 'Q', name: 'Market Survivor', description: 'Turn a market crash into a violent rebound wave.', cooldownMs: 850, damage: 9 },
  { id: 'property-dominion', key: 'W', name: 'Property Dominion', description: 'Raise a silver city that crushes enemies from below.', cooldownMs: 2_200, damage: 11 },
  { id: 'crypto-tempest', key: 'E', name: 'Crypto Tempest', description: 'Release a storm of piercing digital assets.', cooldownMs: 2_700, damage: 12 },
  { id: 'golden-reserve', key: 'R', name: 'Golden Reserve', description: 'Create a gold-backed barrier and restore vitality.', cooldownMs: 6_000, damage: 0, buff: true },
  { id: 'venture-forge', key: 'Z', name: 'Venture Forge', description: 'Build momentum through a chain of explosive ventures.', cooldownMs: 3_400, damage: 13 },
  { id: 'loss-recovery', key: 'X', name: 'Loss Recovery', description: 'Convert every past failure into attack, speed and defense.', cooldownMs: 9_000, damage: 0, buff: true },
  { id: 'compound-ascension', key: 'C', name: 'Compound Ascension', description: 'Strike repeatedly with exponentially growing force.', cooldownMs: 4_800, damage: 15 },
  { id: 'empire-unification', key: 'V', name: 'Empire Unification', description: 'Unify every asset into a battlefield-wide detonation.', cooldownMs: 6_800, damage: 18 },
  { id: 'legacy-beyond-failure', key: 'T', name: 'Legacy Beyond Failure', description: 'Rise from shattered losses as a golden phoenix and erase every enemy.', cooldownMs: 10_000, damage: 24 },
] as const satisfies readonly AssetTycoonSkill[];

export const assetTycoon = {
  id: 'assettycoon',
  name: 'Asset Tycoon',
  role: 'A secret apex class earned by surviving countless failures in Extreme Hard expeditions',
  accent: '#f2c94c',
  dropRateBasisPoints: 100,
  skills: assetTycoonSkills,
} as const;

export function assetTycoonSkillIcon(skillId: string): string {
  return `/assets/new-class-skills/${skillId}.png`;
}
