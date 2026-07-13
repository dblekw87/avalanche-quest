import { keccak256, parseEther, toBytes, type Hex } from 'viem';

export type SkillDefinition = {
  id: Hex;
  slug: string;
  name: string;
  key: 'Q' | 'W' | 'E' | 'R' | 'T';
  description: string;
  price: bigint;
  iconPosition: readonly [x: number, y: number];
};

function skill(slug: string, name: string, key: SkillDefinition['key'], description: string, price: string, iconPosition: readonly [number, number]): SkillDefinition {
  return { id: keccak256(toBytes(slug)), slug, name, key, description, price: parseEther(price), iconPosition };
}

export const warriorSkills = [
  skill('arcane-bolt', 'Power Slash', 'Q', 'Launch a powerful crescent sword wave.', '25', [530, 50]),
  skill('frost-nova', 'Spinning Slash', 'W', 'Spin a blade vortex through nearby enemies.', '35', [530, 110]),
  skill('flame-wave', 'Earth Slam', 'E', 'Smash the ground with a heavy shockwave.', '45', [530, 170]),
  skill('healing-light', 'Shield Guard', 'R', 'Raise a golden shield that reduces incoming damage.', '50', [530, 230]),
  skill('starfall', 'Warrior Roar', 'T', 'Damage nearby enemies and become fully invulnerable for 3 seconds, plus 0.2 seconds per enhancement.', '70', [530, 289]),
] as const satisfies readonly SkillDefinition[];

export const mageSkills = [
  skill('magic-missile', 'Magic Missile', 'Q', 'Fire a fast piercing arcane projectile.', '25', [530, 400]),
  skill('ice-storm', 'Ice Storm', 'W', 'Raise freezing spikes around nearby enemies.', '35', [530, 459]),
  skill('chain-lightning', 'Chain Lightning', 'E', 'Chain purple lightning through every enemy.', '45', [530, 518]),
  skill('healing-circle', 'Healing Circle', 'R', 'Restore 3 vitality with a healing circle.', '50', [530, 578]),
  skill('meteor', 'Meteor', 'T', 'Call a burning meteor onto every enemy.', '70', [530, 638]),
] as const satisfies readonly SkillDefinition[];

export const spellbladeSkills = [
  skill('arcane-cleave', 'Abyss Rush', 'Q', 'Dash through enemies with a black-crimson blade trail.', '25', [0, 0]),
  skill('twin-phantom', 'Blood Moon', 'W', 'Carve a wide blood-red crescent through nearby enemies.', '35', [0, 0]),
  skill('rune-step', 'Hellspike', 'E', 'Erupt jagged abyssal blades from the ground ahead.', '45', [0, 0]),
  skill('astral-counter', 'Crimson Pact', 'R', 'The spellblade’s only buff: reduce incoming damage for 4 seconds.', '50', [0, 0]),
  skill('constellation-storm', 'Black Sun', 'T', 'Detonate a black sun in a devastating crimson blast.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const archerSkills = [
  skill('gale-arrow', 'Gale Piercer', 'Q', 'Fire a brilliant wind arrow that pierces the battlefield.', '25', [0, 0]),
  skill('split-shot', 'Tri-Gale Volley', 'W', 'Loose three vivid emerald arrows in a wide spread.', '35', [0, 0]),
  skill('verdant-snare', 'Cyclone Bloom', 'E', 'Burst a cutting green cyclone around nearby enemies.', '45', [0, 0]),
  skill('feather-step', 'Sylvan Focus', 'R', 'The archer’s only buff: gain a protective wind veil for 4 seconds.', '50', [0, 0]),
  skill('emerald-rain', 'Skyfall Barrage', 'T', 'Call a spectacular rain of arrows down from the sky.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const dualbladeSkills = [
  skill('crescent-fang', 'Crescent Fang', 'Q', 'Launch a blue twin-blade wave straight ahead.', '25', [0, 0]),
  skill('phantom-cross', 'Phantom Cross', 'W', 'Carve through nearby enemies with crossing afterimage slashes.', '35', [0, 0]),
  skill('shadow-reversal', 'Shadow Reversal', 'E', 'Teleport behind the nearest enemy and strike from its blind spot.', '45', [0, 0]),
  skill('azure-focus', 'Azure Focus', 'R', 'The only buff skill: empower attacks and movement for 5 seconds.', '50', [0, 0]),
  skill('infinite-blades', 'Infinite Blades', 'T', 'Sweep a wide area with a twin-blade vortex and repeated slashes.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const brawlerSkills = [
  skill('iron-jab', 'Iron Jab', 'Q', 'Drive a concentrated fist into enemies directly ahead.', '25', [0, 0]),
  skill('hundred-fists', 'Hundred Fists', 'W', 'Pummel the area ahead with a rapid barrage of fist afterimages.', '35', [0, 0]),
  skill('titan-fist', 'Titan Fist', 'E', 'Fire a massive golden fist straight ahead without spinning.', '45', [0, 0]),
  skill('burning-spirit', 'Burning Spirit', 'R', 'The only buff skill: empower attacks and movement for 5 seconds.', '50', [0, 0]),
  skill('heaven-breaker', 'Heaven Breaker', 'T', 'Stand your ground and smash the earth with a circular shockwave.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const dragonknightSkills = [
  skill('draconic-thrust', 'Draconic Thrust', 'Q', 'Pierce forward with a blazing lance wave.', '25', [0, 0]),
  skill('wingbreaker', 'Wingbreaker', 'W', 'Sweep the area ahead with crossing dragon-wing slashes.', '35', [0, 0]),
  skill('inferno-breath', 'Inferno Breath', 'E', 'Unleash three spreading fire blasts.', '45', [0, 0]),
  skill('dragonheart', 'Dragonheart', 'R', 'The only buff skill: gain draconic power and protection for 5 seconds.', '50', [0, 0]),
  skill('cataclysm-wyvern', 'Cataclysm Wyvern', 'T', 'Call down a colossal wyvern impact across the battlefield.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const gunslingerSkills = [
  skill('quickdraw', 'Quickdraw', 'Q', 'Fire a lightning-fast piercing round.', '25', [0, 0]),
  skill('scatter-burst', 'Scatter Burst', 'W', 'Fire five rounds in a wide fan.', '35', [0, 0]),
  skill('ricochet-round', 'Ricochet Round', 'E', 'Launch a charged round that tears through multiple targets.', '45', [0, 0]),
  skill('deadeye', 'Deadeye', 'R', 'The only buff skill: boost firepower and defense for 5 seconds.', '50', [0, 0]),
  skill('bullet-tempest', 'Bullet Tempest', 'T', 'Blanket the battlefield with an explosive storm of bullets.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const skills = [...warriorSkills, ...mageSkills, ...spellbladeSkills, ...archerSkills, ...dualbladeSkills, ...brawlerSkills, ...dragonknightSkills, ...gunslingerSkills] as const;

export const aegisArmor = {
  id: keccak256(toBytes('aegis-armor')),
  slug: 'aegis-armor', name: 'Aegis Armor',
  description: '+3 maximum vitality, reduces every incoming hit by 1, and changes the hero appearance.',
  price: parseEther('75'),
} as const;

export const gameTokenAbi = [
  {
    type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'allowance', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const skillShopAbi = [
  {
    type: 'function', name: 'purchaseSkill', stateMutability: 'nonpayable',
    inputs: [{ name: 'skillId', type: 'bytes32' }], outputs: [],
  },
  {
    type: 'function', name: 'hasSkill', stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }, { name: 'skillId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const skillEnhancementAbi = [
  { type: 'function', name: 'levels', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }, { name: 'skillId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'priceFor', stateMutability: 'pure', inputs: [{ name: 'currentLevel', type: 'uint8' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'enhanceSkill', stateMutability: 'nonpayable', inputs: [{ name: 'skillId', type: 'bytes32' }], outputs: [] },
] as const;

export const armorEnhancementAbi = [
  { type: 'function', name: 'levels', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'priceFor', stateMutability: 'pure', inputs: [{ name: 'currentLevel', type: 'uint8' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'enhanceArmor', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;
