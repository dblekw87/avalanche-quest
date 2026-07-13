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
  { key: 'Q', name: '규제 철폐', cooldownMs: 2_600, damage: 10, frame: { x: 30, y: 272, width: 171, height: 247 } },
  { key: 'W', name: '성장 드라이브', cooldownMs: 5_800, damage: 7, frame: { x: 208, y: 272, width: 170, height: 247 } },
  { key: 'E', name: '국가 안보 강화', cooldownMs: 7_500, damage: 5, frame: { x: 386, y: 272, width: 169, height: 247 } },
  { key: 'R', name: '공정과 상식의 일격', cooldownMs: 4_100, damage: 14, frame: { x: 561, y: 272, width: 169, height: 247 } },
  { key: 'Z', name: '재건축·재개발 활성화', cooldownMs: 9_000, damage: 4, frame: { x: 30, y: 556, width: 226, height: 226 } },
  { key: 'X', name: '기업 규제 완화', cooldownMs: 10_500, damage: 4, frame: { x: 264, y: 556, width: 228, height: 226 } },
  { key: 'C', name: '감세 정책', cooldownMs: 12_000, damage: 3, frame: { x: 500, y: 556, width: 229, height: 226 } },
  { key: 'V', name: '자유 시장의 폭발', cooldownMs: 18_000, damage: 26, frame: { x: 30, y: 795, width: 699, height: 128 } },
] as const;

const progressiveSkills: readonly PoliticalSkill[] = [
  { key: 'Q', name: '부동산 투기 억제', cooldownMs: 3_000, damage: 9, frame: { x: 758, y: 272, width: 170, height: 247 } },
  { key: 'W', name: '토지거래허가제', cooldownMs: 6_200, damage: 8, frame: { x: 936, y: 272, width: 170, height: 247 } },
  { key: 'E', name: '기본소득 / 복지 확대', cooldownMs: 7_800, damage: 4, frame: { x: 1113, y: 272, width: 185, height: 247 } },
  { key: 'R', name: '사회 안전망 구축', cooldownMs: 8_500, damage: 12, frame: { x: 1307, y: 272, width: 192, height: 247 } },
  { key: 'Z', name: '다주택자 규제 강화', cooldownMs: 9_200, damage: 10, frame: { x: 758, y: 556, width: 226, height: 226 } },
  { key: 'X', name: '공공임대주택 공급', cooldownMs: 10_800, damage: 5, frame: { x: 992, y: 556, width: 247, height: 226 } },
  { key: 'C', name: '소상공인 지원', cooldownMs: 11_500, damage: 4, frame: { x: 1247, y: 556, width: 252, height: 226 } },
  { key: 'V', name: '함께 여는 내일', cooldownMs: 18_000, damage: 24, frame: { x: 758, y: 795, width: 741, height: 128 } },
] as const;

export const politicalFighters: Record<PoliticalFaction, PoliticalFighter> = {
  conservative: {
    id: 'conservative', label: '보수 진영', role: '남성 SD 검사', color: 0xef2b2d, secondaryColor: 0xff7a35,
    skills: conservativeSkills,
  },
  progressive: {
    id: 'progressive', label: '진보 진영', role: '여성 SD 마도사', color: 0x1689ff, secondaryColor: 0x68e35f,
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
