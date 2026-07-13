export type PoliticalFaction = 'conservative' | 'progressive';

export type PoliticalSkillKey = 'Q' | 'W' | 'E' | 'R' | 'Z' | 'X' | 'C' | 'V';

export type PoliticalSkill = {
  key: PoliticalSkillKey;
  name: string;
  cooldownMs: number;
  damage: number;
  frame: { x: number; y: number; width: number; height: number };
};

export type PoliticalFighter = {
  id: PoliticalFaction;
  label: string;
  role: string;
  color: number;
  secondaryColor: number;
  skills: readonly PoliticalSkill[];
};

const conservativeSkills: readonly PoliticalSkill[] = [
  { key: 'Q', name: 'Deregulation', cooldownMs: 2_600, damage: 10, frame: { x: 30, y: 272, width: 171, height: 247 } },
  { key: 'W', name: 'Growth Drive', cooldownMs: 5_800, damage: 7, frame: { x: 208, y: 272, width: 170, height: 247 } },
  { key: 'E', name: 'National Security', cooldownMs: 7_500, damage: 5, frame: { x: 386, y: 272, width: 169, height: 247 } },
  { key: 'R', name: 'Strike of Common Sense', cooldownMs: 4_100, damage: 14, frame: { x: 561, y: 272, width: 169, height: 247 } },
  { key: 'Z', name: 'Urban Redevelopment', cooldownMs: 9_000, damage: 4, frame: { x: 30, y: 556, width: 226, height: 226 } },
  { key: 'X', name: 'Corporate Freedom', cooldownMs: 10_500, damage: 4, frame: { x: 264, y: 556, width: 228, height: 226 } },
  { key: 'C', name: 'Tax Relief', cooldownMs: 12_000, damage: 3, frame: { x: 500, y: 556, width: 229, height: 226 } },
  { key: 'V', name: 'Free Market Explosion', cooldownMs: 18_000, damage: 26, frame: { x: 30, y: 795, width: 699, height: 128 } },
] as const;

const progressiveSkills: readonly PoliticalSkill[] = [
  { key: 'Q', name: 'Curb Real Estate Speculation', cooldownMs: 3_000, damage: 9, frame: { x: 758, y: 272, width: 170, height: 247 } },
  { key: 'W', name: 'Land Transaction Permit', cooldownMs: 6_200, damage: 8, frame: { x: 936, y: 272, width: 170, height: 247 } },
  { key: 'E', name: 'Universal Income', cooldownMs: 7_800, damage: 4, frame: { x: 1113, y: 272, width: 185, height: 247 } },
  { key: 'R', name: 'Social Safety Net', cooldownMs: 8_500, damage: 12, frame: { x: 1307, y: 272, width: 192, height: 247 } },
  { key: 'Z', name: 'Multi-Home Regulation', cooldownMs: 9_200, damage: 10, frame: { x: 758, y: 556, width: 226, height: 226 } },
  { key: 'X', name: 'Public Rental Housing', cooldownMs: 10_800, damage: 5, frame: { x: 992, y: 556, width: 247, height: 226 } },
  { key: 'C', name: 'Small Business Support', cooldownMs: 11_500, damage: 4, frame: { x: 1247, y: 556, width: 252, height: 226 } },
  { key: 'V', name: 'Tomorrow Together', cooldownMs: 18_000, damage: 24, frame: { x: 758, y: 795, width: 741, height: 128 } },
] as const;

export const politicalFighters: Record<PoliticalFaction, PoliticalFighter> = {
  conservative: {
    id: 'conservative', label: 'Conservative Faction', role: 'Male SD Swordsman', color: 0xef2b2d, secondaryColor: 0xff7a35,
    skills: conservativeSkills,
  },
  progressive: {
    id: 'progressive', label: 'Progressive Faction', role: 'Female SD Mage', color: 0x1689ff, secondaryColor: 0x68e35f,
    skills: progressiveSkills,
  },
};

export function opposingFaction(faction: PoliticalFaction): PoliticalFaction {
  return faction === 'conservative' ? 'progressive' : 'conservative';
}

export function politicalSkillVfxStartFrame(faction: PoliticalFaction, key: PoliticalSkillKey): number {
  const skillIndex = politicalFighters[faction].skills.findIndex((skill) => skill.key === key);
  return (faction === 'conservative' ? 0 : 32) + Math.max(0, skillIndex) * 4;
}
