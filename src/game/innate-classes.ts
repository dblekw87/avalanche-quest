import type { InnateCharacterId } from '@/game/characters';

export type InnateSkillDefinition = {
  id: string;
  key: 'Q' | 'W' | 'E' | 'R' | 'T';
  name: string;
  description: string;
  cooldownMs: number;
  damage: number;
  buff?: true;
};

export type InnateClassDefinition = {
  id: InnateCharacterId;
  name: string;
  role: string;
  accent: string;
  skills: readonly InnateSkillDefinition[];
};

export const innateClasses: Record<InnateCharacterId, InnateClassDefinition> = {
  dualblade: {
    id: 'dualblade',
    name: '쌍검사',
    role: '쌍칼과 그림자 기동을 사용하는 고속 근접 클래스',
    accent: '#55ddff',
    skills: [
      { id: 'crescent-fang', key: 'Q', name: '초승달 쌍참', description: '두 검의 푸른 검기를 전방으로 발사합니다.', cooldownMs: 1_500, damage: 3 },
      { id: 'phantom-cross', key: 'W', name: '환영 교차난무', description: '교차하는 잔상 검격으로 주변 적을 연속 베어냅니다.', cooldownMs: 3_400, damage: 4 },
      { id: 'shadow-reversal', key: 'E', name: '그림자 역습', description: '가장 가까운 적의 뒤로 이동해 기습 공격합니다.', cooldownMs: 5_200, damage: 5 },
      { id: 'azure-focus', key: 'R', name: '청명 집중', description: '유일한 버프 스킬. 5초 동안 공격과 이동 능력을 강화합니다.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'infinite-blades', key: 'T', name: '무한검무', description: '거대한 쌍검 소용돌이와 다중 참격으로 화면의 적을 베어냅니다.', cooldownMs: 8_500, damage: 7 },
    ],
  },
  brawler: {
    id: 'brawler',
    name: '권격가',
    role: '강력한 주먹과 충격파를 사용하는 타격 클래스',
    accent: '#ffad33',
    skills: [
      { id: 'iron-jab', key: 'Q', name: '철권 정타', description: '응축한 주먹으로 전방에 강한 타격을 가합니다.', cooldownMs: 1_400, damage: 4 },
      { id: 'hundred-fists', key: 'W', name: '백열연권', description: '수많은 주먹 잔상으로 전방의 적을 연속 타격합니다.', cooldownMs: 3_600, damage: 4 },
      { id: 'titan-fist', key: 'E', name: '거신권', description: '거대한 황금 주먹을 투사체처럼 발사합니다.', cooldownMs: 4_800, damage: 5 },
      { id: 'burning-spirit', key: 'R', name: '투혼 각성', description: '유일한 버프 스킬. 5초 동안 공격과 이동 능력을 강화합니다.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'heaven-breaker', key: 'T', name: '천붕지권', description: '지면을 내려쳐 거대한 원형 충격파로 주변 적을 공격합니다.', cooldownMs: 8_800, damage: 8 },
    ],
  },
};

export function innateSkillIcon(skillId: string): string {
  return `/assets/new-class-skills/${skillId}.png`;
}
