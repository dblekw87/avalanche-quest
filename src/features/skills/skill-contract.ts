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

export const ssaulabiSkills = [
  skill('moonlit-draw', 'Moonlit Draw', 'Q', 'Release a swift silver-crimson sword wave.', '25', [0, 0]),
  skill('tiger-step', 'Tiger Step', 'W', 'Rush through enemies with a tiger-shaped slash.', '35', [0, 0]),
  skill('crimson-formation', 'Crimson Formation', 'E', 'Carve a field of crossing blade seals.', '45', [0, 0]),
  skill('unbroken-resolve', 'Unbroken Resolve', 'R', 'Sharpen attack, speed and defense for 5 seconds.', '50', [0, 0]),
  skill('heaven-sever', 'Heaven Sever', 'T', 'Split the battlefield with a colossal celestial slash.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const kickfighterSkills = [
  skill('gale-kick', 'Gale Kick', 'Q', 'Launch a cutting crescent from a snapping kick.', '25', [0, 0]),
  skill('rising-dragon', 'Rising Dragon', 'W', 'Drive enemies upward with a golden rising kick.', '35', [0, 0]),
  skill('cyclone-heel', 'Cyclone Heel', 'E', 'Spin through nearby enemies in a teal heel vortex.', '45', [0, 0]),
  skill('flow-state', 'Flow State', 'R', 'Accelerate movement and striking power for 5 seconds.', '50', [0, 0]),
  skill('skybreaker-combo', 'Skybreaker Combo', 'T', 'Rain down a chain of spectacular aerial kick impacts.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const venomancerSkills = [
  skill('venom-needle', 'Venom Needle', 'Q', 'Fire a piercing toxic needle.', '25', [0, 0]),
  skill('plague-pool', 'Plague Pool', 'W', 'Create a poison pool that strikes repeatedly.', '35', [0, 0]),
  skill('serpent-miasma', 'Serpent Miasma', 'E', 'Unleash a spreading toxic serpent cloud.', '45', [0, 0]),
  skill('antidote-pact', 'Antidote Pact', 'R', 'Gain poison-forged attack and protection for 5 seconds.', '50', [0, 0]),
  skill('deathbloom', 'Deathbloom', 'T', 'Detonate a gigantic poisonous skull flower.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const pyromancerSkills = [
  skill('ember-lance', 'Ember Lance', 'Q', 'Hurl a high-speed lance of concentrated flame.', '25', [0, 0]),
  skill('flame-pillar', 'Flame Pillar', 'W', 'Erupt pillars of fire ahead.', '35', [0, 0]),
  skill('phoenix-spiral', 'Phoenix Spiral', 'E', 'Sweep enemies with a spiraling phoenix blaze.', '45', [0, 0]),
  skill('burning-soul', 'Burning Soul', 'R', 'Amplify firepower and movement for 5 seconds.', '50', [0, 0]),
  skill('solar-cataclysm', 'Solar Cataclysm', 'T', 'Crash a miniature sun into the battlefield.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const hammerguardSkills = [
  skill('iron-crash', 'Iron Crash', 'Q', 'Smash the ground with a focused hammer impact.', '25', [0, 0]),
  skill('seismic-march', 'Seismic March', 'W', 'Send successive fissures marching forward.', '35', [0, 0]),
  skill('gravity-bell', 'Gravity Bell', 'E', 'Crush a wide area beneath a gravity-charged hammer.', '45', [0, 0]),
  skill('adamant-guard', 'Adamant Guard', 'R', 'Gain exceptional defense and striking force for 5 seconds.', '50', [0, 0]),
  skill('world-anvil', 'World Anvil', 'T', 'Call down a divine hammer that shatters the earth.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const axereaverSkills = [
  skill('rending-arc', 'Rending Arc', 'Q', 'Launch a brutal green-gold axe wave.', '25', [0, 0]),
  skill('predator-rush', 'Predator Rush', 'W', 'Charge forward behind a spectral wolf.', '35', [0, 0]),
  skill('blood-cyclone', 'Blood Cyclone', 'E', 'Shred nearby enemies in a double-axe vortex.', '45', [0, 0]),
  skill('berserker-oath', 'Berserker Oath', 'R', 'Increase attack, speed and resilience for 5 seconds.', '50', [0, 0]),
  skill('ragnarok-cleaver', 'Ragnarok Cleaver', 'T', 'Split the battlefield with a colossal execution axe.', '70', [0, 0]),
] as const satisfies readonly SkillDefinition[];

export const skills = [...warriorSkills, ...mageSkills, ...spellbladeSkills, ...archerSkills, ...dualbladeSkills, ...brawlerSkills, ...dragonknightSkills, ...gunslingerSkills, ...ssaulabiSkills, ...kickfighterSkills, ...venomancerSkills, ...pyromancerSkills, ...hammerguardSkills, ...axereaverSkills] as const;

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
