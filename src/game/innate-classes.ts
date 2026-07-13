import type { InnateCharacterId } from '@/game/characters';

export type InnateSkillDefinition = {
  id: string;
  key: 'Q' | 'W' | 'E' | 'R' | 'T' | 'Z' | 'X' | 'C' | 'V';
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
      { id: 'cataclysm-wyvern', key: 'T', name: 'Cataclysm Wyvern', description: 'Summon a colossal dragon face from the left to breathe multi-hit fire across the battlefield.', cooldownMs: 9_000, damage: 8 },
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
  ssaulabi: {
    id: 'ssaulabi', name: 'Ssaulabi', role: 'A disciplined hwando master shaped by countless battles', accent: '#ef5568',
    skills: [
      { id: 'moonlit-draw', key: 'Q', name: 'Moonlit Draw', description: 'Release a swift silver-crimson sword wave.', cooldownMs: 1_300, damage: 4 },
      { id: 'tiger-step', key: 'W', name: 'Tiger Step', description: 'Rush forward through enemies with a tiger-shaped slash.', cooldownMs: 3_000, damage: 5 },
      { id: 'crimson-formation', key: 'E', name: 'Crimson Formation', description: 'Carve a field of crossing blade seals.', cooldownMs: 4_500, damage: 6 },
      { id: 'unbroken-resolve', key: 'R', name: 'Unbroken Resolve', description: 'The only buff skill: sharpen attack, speed and defense for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'heaven-sever', key: 'T', name: 'Heaven Sever', description: 'Split the battlefield with a colossal celestial slash.', cooldownMs: 8_800, damage: 9 },
    ],
  },
  kickfighter: {
    id: 'kickfighter', name: 'Kickfighter', role: 'A weaponless martial artist specializing in aerial and spinning kicks', accent: '#45e6d1',
    skills: [
      { id: 'gale-kick', key: 'Q', name: 'Gale Kick', description: 'Launch a cutting crescent from a snapping kick.', cooldownMs: 1_250, damage: 4 },
      { id: 'rising-dragon', key: 'W', name: 'Rising Dragon', description: 'Drive enemies upward with a golden rising kick.', cooldownMs: 3_100, damage: 5 },
      { id: 'cyclone-heel', key: 'E', name: 'Cyclone Heel', description: 'Spin through nearby enemies in a teal heel vortex.', cooldownMs: 4_400, damage: 6 },
      { id: 'flow-state', key: 'R', name: 'Flow State', description: 'The only buff skill: accelerate movement and striking power for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'skybreaker-combo', key: 'T', name: 'Skybreaker Combo', description: 'Rain down a chain of spectacular aerial kick impacts.', cooldownMs: 8_600, damage: 9 },
    ],
  },
  venomancer: {
    id: 'venomancer', name: 'Venomancer', role: 'A poison mage who controls venom, plague pools and toxic spirits', accent: '#80e83f',
    skills: [
      { id: 'venom-needle', key: 'Q', name: 'Venom Needle', description: 'Fire a piercing toxic needle.', cooldownMs: 1_300, damage: 4 },
      { id: 'plague-pool', key: 'W', name: 'Plague Pool', description: 'Create a poison pool that strikes repeatedly.', cooldownMs: 3_400, damage: 5 },
      { id: 'serpent-miasma', key: 'E', name: 'Serpent Miasma', description: 'Unleash a spreading toxic serpent cloud.', cooldownMs: 4_800, damage: 6 },
      { id: 'antidote-pact', key: 'R', name: 'Antidote Pact', description: 'The only buff skill: gain poison-forged attack and protection for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'deathbloom', key: 'T', name: 'Deathbloom', description: 'Detonate a gigantic poisonous skull flower.', cooldownMs: 9_000, damage: 9 },
    ],
  },
  pyromancer: {
    id: 'pyromancer', name: 'Pyromancer', role: 'A pure fire mage wielding phoenix flames and solar destruction', accent: '#ff6a25',
    skills: [
      { id: 'ember-lance', key: 'Q', name: 'Ember Lance', description: 'Hurl a high-speed lance of concentrated flame.', cooldownMs: 1_250, damage: 4 },
      { id: 'flame-pillar', key: 'W', name: 'Flame Pillar', description: 'Erupt pillars of fire ahead.', cooldownMs: 3_300, damage: 5 },
      { id: 'phoenix-spiral', key: 'E', name: 'Phoenix Spiral', description: 'Sweep enemies with a spiraling phoenix blaze.', cooldownMs: 4_600, damage: 6 },
      { id: 'burning-soul', key: 'R', name: 'Burning Soul', description: 'The only buff skill: amplify firepower and movement for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'solar-cataclysm', key: 'T', name: 'Solar Cataclysm', description: 'Crash a miniature sun into the battlefield.', cooldownMs: 9_000, damage: 10 },
    ],
  },
  hammerguard: {
    id: 'hammerguard', name: 'Hammerguard', role: 'A heavily armored warrior who crushes terrain with a warhammer', accent: '#68a9ff',
    skills: [
      { id: 'iron-crash', key: 'Q', name: 'Iron Crash', description: 'Smash the ground with a focused hammer impact.', cooldownMs: 1_500, damage: 5 },
      { id: 'seismic-march', key: 'W', name: 'Seismic March', description: 'Send successive fissures marching forward.', cooldownMs: 3_500, damage: 6 },
      { id: 'gravity-bell', key: 'E', name: 'Gravity Bell', description: 'Crush a wide area beneath a gravity-charged hammer.', cooldownMs: 4_900, damage: 7 },
      { id: 'adamant-guard', key: 'R', name: 'Adamant Guard', description: 'The only buff skill: gain exceptional defense and striking force for 5 seconds.', cooldownMs: 11_500, damage: 0, buff: true },
      { id: 'world-anvil', key: 'T', name: 'World Anvil', description: 'Call down a divine hammer that shatters the earth.', cooldownMs: 9_300, damage: 10 },
    ],
  },
  axereaver: {
    id: 'axereaver', name: 'Axe Reaver', role: 'A relentless cleaver who chains predatory rushes and axe cyclones', accent: '#a7e63f',
    skills: [
      { id: 'rending-arc', key: 'Q', name: 'Rending Arc', description: 'Launch a brutal green-gold axe wave.', cooldownMs: 1_350, damage: 5 },
      { id: 'predator-rush', key: 'W', name: 'Predator Rush', description: 'Charge forward behind a spectral wolf.', cooldownMs: 3_200, damage: 6 },
      { id: 'blood-cyclone', key: 'E', name: 'Blood Cyclone', description: 'Shred nearby enemies in a double-axe vortex.', cooldownMs: 4_600, damage: 7 },
      { id: 'berserker-oath', key: 'R', name: 'Berserker Oath', description: 'The only buff skill: increase attack, speed and resilience for 5 seconds.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'ragnarok-cleaver', key: 'T', name: 'Ragnarok Cleaver', description: 'Split the battlefield with a colossal execution axe.', cooldownMs: 9_000, damage: 10 },
    ],
  },
  elementalist: {
    id: 'elementalist', name: 'Elementalist', role: 'A special female mage who weaves fire, water, wind, earth and lightning', accent: '#f0c96a',
    skills: [
      { id: 'flame-orbit', key: 'Q', name: 'Flame Orbit', description: 'Launch an orbiting solar flame.', cooldownMs: 1_400, damage: 5 },
      { id: 'tidal-prison', key: 'W', name: 'Tidal Prison', description: 'Crush enemies inside a surging water sphere.', cooldownMs: 3_400, damage: 6 },
      { id: 'tempest-lance', key: 'E', name: 'Tempest Lance', description: 'Pierce the battlefield with compressed wind.', cooldownMs: 4_500, damage: 7 },
      { id: 'gaia-aegis', key: 'R', name: 'Gaia Aegis', description: 'Gain an earthen barrier and elemental power.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'thunder-domain', key: 'T', name: 'Thunder Domain', description: 'Call repeated lightning across a wide area.', cooldownMs: 7_000, damage: 8 },
      { id: 'frost-comet', key: 'Z', name: 'Frost Comet', description: 'Drop a freezing comet from above.', cooldownMs: 6_500, damage: 8 },
      { id: 'magma-fault', key: 'X', name: 'Magma Fault', description: 'Split the ground with molten stone.', cooldownMs: 8_000, damage: 9 },
      { id: 'elemental-convergence', key: 'C', name: 'Elemental Convergence', description: 'Fuse five elements into a multi-hit core.', cooldownMs: 12_000, damage: 11 },
      { id: 'primordial-genesis', key: 'V', name: 'Primordial Genesis', description: 'Awaken all five elements and erase the battlefield.', cooldownMs: 30_000, damage: 18 },
    ],
  },
  warlock: {
    id: 'warlock', name: 'Warlock', role: 'A male forbidden mage who commands curses, shadows and the abyss', accent: '#a86cff',
    skills: [
      { id: 'abyss-bolt', key: 'Q', name: 'Abyss Bolt', description: 'Fire a piercing orb of forbidden magic.', cooldownMs: 1_350, damage: 5 },
      { id: 'soul-chains', key: 'W', name: 'Soul Chains', description: 'Bind and repeatedly damage nearby enemies.', cooldownMs: 3_600, damage: 6 },
      { id: 'void-eruption', key: 'E', name: 'Void Eruption', description: 'Open dark rifts beneath the enemy.', cooldownMs: 4_800, damage: 7 },
      { id: 'dark-covenant', key: 'R', name: 'Dark Covenant', description: 'Gain forbidden power and damage reduction.', cooldownMs: 11_000, damage: 0, buff: true },
      { id: 'nightmare-apocalypse', key: 'T', name: 'Nightmare Apocalypse', description: 'Summon an abyssal eye and collapse the battlefield into darkness.', cooldownMs: 30_000, damage: 14 },
    ],
  },
};

export function innateSkillIcon(skillId: string): string {
  return `/assets/new-class-skills/${skillId}.png`;
}
