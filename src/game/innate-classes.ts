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
    name: 'Dualblade',
    role: 'A high-speed melee class using twin blades and shadow movement',
    accent: '#55ddff',
    skills: [
      { id: 'crescent-fang', key: 'Q', name: 'Crescent Fang', description: 'Launch a blue twin-blade wave straight ahead.', cooldownMs: 1_500, damage: 3 },
      { id: 'phantom-cross', key: 'W', name: 'Phantom Cross', description: 'Carve through nearby enemies with crossing afterimage slashes.', cooldownMs: 3_400, damage: 4 },
      { id: 'shadow-reversal', key: 'E', name: 'Shadow Reversal', description: 'Teleport behind the nearest enemy and strike.', cooldownMs: 5_200, damage: 5 },
      { id: 'azure-focus', key: 'R', name: 'Azure Focus', description: 'The only buff skill: empower attacks and movement for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'infinite-blades', key: 'T', name: 'Infinite Blades', description: 'Sweep the battlefield with a twin-blade vortex and repeated slashes.', cooldownMs: 8_500, damage: 7 },
    ],
  },
  brawler: {
    id: 'brawler',
    name: 'Brawler',
    role: 'A striking class built around powerful fists and shockwaves',
    accent: '#ffad33',
    skills: [
      { id: 'iron-jab', key: 'Q', name: 'Iron Jab', description: 'Drive a concentrated fist into enemies directly ahead.', cooldownMs: 1_400, damage: 4 },
      { id: 'hundred-fists', key: 'W', name: 'Hundred Fists', description: 'Pummel the area ahead with a rapid barrage of fist afterimages.', cooldownMs: 3_600, damage: 4 },
      { id: 'titan-fist', key: 'E', name: 'Titan Fist', description: 'Fire a massive golden fist straight ahead.', cooldownMs: 4_800, damage: 5 },
      { id: 'burning-spirit', key: 'R', name: 'Burning Spirit', description: 'The only buff skill: empower attacks and movement for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'heaven-breaker', key: 'T', name: 'Heaven Breaker', description: 'Smash the earth with a massive circular shockwave.', cooldownMs: 8_800, damage: 8 },
    ],
  },
  dragonknight: {
    id: 'dragonknight', name: 'Dragon Knight', role: 'A fiery lancer protected by ancient draconic power', accent: '#ff5a36',
    skills: [
      { id: 'draconic-thrust', key: 'Q', name: 'Draconic Thrust', description: 'Pierce forward with a blazing lance wave.', cooldownMs: 1_500, damage: 4 },
      { id: 'wingbreaker', key: 'W', name: 'Wingbreaker', description: 'Sweep the area ahead with crossing dragon-wing slashes.', cooldownMs: 3_400, damage: 5 },
      { id: 'inferno-breath', key: 'E', name: 'Inferno Breath', description: 'Unleash three spreading fire blasts.', cooldownMs: 4_800, damage: 5 },
      { id: 'dragonheart', key: 'R', name: 'Dragonheart', description: 'The only buff skill: gain draconic power and protection for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'cataclysm-wyvern', key: 'T', name: 'Cataclysm Wyvern', description: 'Call down a colossal wyvern impact across the battlefield.', cooldownMs: 9_000, damage: 8 },
    ],
  },
  gunslinger: {
    id: 'gunslinger', name: 'Gunslinger', role: 'A mobile ranged class wielding twin arcane revolvers', accent: '#65e7ff',
    skills: [
      { id: 'quickdraw', key: 'Q', name: 'Quickdraw', description: 'Fire a lightning-fast piercing round.', cooldownMs: 1_100, damage: 3 },
      { id: 'scatter-burst', key: 'W', name: 'Scatter Burst', description: 'Fire five rounds in a wide fan.', cooldownMs: 3_200, damage: 4 },
      { id: 'ricochet-round', key: 'E', name: 'Ricochet Round', description: 'Launch a charged round that tears through multiple targets.', cooldownMs: 4_500, damage: 5 },
      { id: 'deadeye', key: 'R', name: 'Deadeye', description: 'The only buff skill: boost firepower and defense for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'bullet-tempest', key: 'T', name: 'Bullet Tempest', description: 'Blanket the battlefield with an explosive storm of bullets.', cooldownMs: 8_500, damage: 8 },
    ],
  },
};

export function innateSkillIcon(skillId: string): string {
  return `/assets/new-class-skills/${skillId}.png`;
}
