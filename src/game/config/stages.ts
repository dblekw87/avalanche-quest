export const stageIds = [
  'verdant-pass', 'mistwood-den', 'ruined-city', 'volcanic-frontier', 'frozen-sanctum',
  'desert-tomb', 'sky-reach', 'blood-castle', 'abyssal-reef', 'thunder-coliseum',
  'plague-marsh', 'crystal-labyrinth', 'clockwork-fortress', 'sunken-dunes', 'celestial-aerie',
  'void-temple', 'mammoth-glacier', 'phoenix-caldera', 'leviathan-trench', 'avalanche-throne',
  'obsidian-breach', 'spectral-exchange', 'iron-maelstrom', 'toxic-singularity', 'solar-ruin',
  'gravity-vault', 'broken-fortune', 'chaos-ledger', 'extinction-market', 'last-compound',
] as const;

export type StageId = (typeof stageIds)[number];

export type StageDefinition = {
  id: StageId;
  number: number;
  name: string;
  subtitle: string;
  worldLabel: string;
  backgroundColor: number;
  groundColor: number;
  accentColor: number;
  platforms: readonly { x: number; y: number; width: number }[];
  enemies: readonly { id: string; x: number; y: number; health: number; speed: number; left: number; right: number; boss: boolean }[];
};

const bossNames = [
  'Goblin Warlord', 'Mist Wolf', 'Rune Golem', 'Lava Dragon', 'Ice Queen',
  'Desert Scorpion', 'Wind Harpy', 'Vampire Lord', 'Deep Kraken', 'Thunder Minotaur',
  'Plague Necromancer', 'Crystal Hydra', 'Clockwork Titan', 'Sand Wyrm', 'Celestial Griffin',
  'Void Witch', 'Frost Mammoth', 'Inferno Phoenix', 'Abyss Leviathan', 'Avalanche Emperor',
  'Obsidian Behemoth', 'Spectral Broker', 'Iron Seraph', 'Toxic Singularity', 'Solar Devourer',
  'Gravity Colossus', 'Ruin Sovereign', 'Chaos Auditor', 'Extinction Dragon', 'Compound Overlord',
] as const;

const stageNames = [
  'Verdant Pass', 'Mistwood Den', 'Ruined City', 'Volcanic Frontier', 'Frozen Sanctum',
  'Desert Tomb', 'Sky Reach', 'Blood Castle', 'Abyssal Reef', 'Thunder Coliseum',
  'Plague Marsh', 'Crystal Labyrinth', 'Clockwork Fortress', 'Sunken Dunes', 'Celestial Aerie',
  'Void Temple', 'Mammoth Glacier', 'Phoenix Caldera', 'Leviathan Trench', 'Avalanche Throne',
  'Obsidian Breach', 'Spectral Exchange', 'Iron Maelstrom', 'Toxic Singularity', 'Solar Ruin',
  'Gravity Vault', 'Broken Fortune', 'Chaos Ledger', 'Extinction Market', 'Last Compound',
] as const;

const palettes = [
  [0x102019, 0x1c3325, 0xdfff62], [0x14201c, 0x263a31, 0xa9d8c0], [0x20201d, 0x3a3932, 0xd7b675],
  [0x28100d, 0x4b2119, 0xff765e], [0x101d2a, 0x20394b, 0x76d7ff], [0x281f14, 0x4a3824, 0xe8bb68],
  [0x14263b, 0x294a65, 0xa8e5ff], [0x22101b, 0x441d35, 0xf080a0], [0x071f2a, 0x153c4b, 0x58cce0],
  [0x17182d, 0x303455, 0xb8a7ff], [0x172113, 0x2d4225, 0x87d653], [0x20172d, 0x3d3154, 0xd08cff],
  [0x202126, 0x41444d, 0xe5b65b], [0x2b2113, 0x554326, 0xf0c36c], [0x13263a, 0x284b68, 0xf2df87],
  [0x140f20, 0x30203a, 0x9c69f0], [0x101e2d, 0x24445f, 0xa9e9ff], [0x2b120d, 0x55241a, 0xff9c47],
  [0x071724, 0x17364a, 0x62b9ff], [0x111827, 0x27364d, 0xeaf7ff],
  [0x100b16, 0x2b1d35, 0xff4f8b], [0x071a1c, 0x163e3e, 0x55ffe1], [0x17181d, 0x363842, 0xffd35e],
  [0x101b0c, 0x2d4823, 0x9cff3e], [0x2a0d08, 0x5a2014, 0xff7a32], [0x090b20, 0x252b5b, 0x8e8cff],
  [0x1c0b13, 0x461727, 0xff315f], [0x070f17, 0x152f46, 0x27ccff], [0x1b0808, 0x4c1612, 0xffb02e],
  [0x08090e, 0x202532, 0xffe675],
] as const;

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createPlatforms(stageNumber: number) {
  const random = createSeededRandom(stageNumber * 9_973 + 41);
  let x = 320 + Math.floor(random() * 45);
  let previousTier = Math.floor(random() * 2);
  const introductoryStage = stageNumber <= 5;
  const extremeStage = stageNumber >= 27;
  return Array.from({ length: 14 }, (_, index) => {
    if (index > 0) x += introductoryStage ? 250 + Math.floor(random() * 48) : extremeStage ? 315 + Math.floor(random() * 88) : 282 + Math.floor(random() * 76);
    const tierDelta = random() < 0.28 ? -1 : random() > 0.7 ? 1 : 0;
    const tier = Math.max(0, Math.min(3, previousTier + tierDelta));
    previousTier = tier;
    return {
      x,
      // Four reachable height bands, raised 3px so characters sit cleanly on
      // the remastered terrain. Seeded randomness keeps every stage stable.
      y: 387 - tier * 45,
      width: introductoryStage ? 240 + Math.floor(random() * 80) : extremeStage ? 165 + Math.floor(random() * 88) : 190 + Math.floor(random() * 116),
    };
  });
}

function createStage(id: StageId, index: number): StageDefinition {
  const number = index + 1;
  const platforms = createPlatforms(number);
  const random = createSeededRandom(number * 13_337 + 97);
  const introductoryStage = number <= 5;
  const hardStage = number >= 21;
  const regularCount = introductoryStage ? 4 + Math.floor((number - 1) / 2) : hardStage ? Math.min(18 + Math.floor((number - 21) * 0.8), 25) : Math.min(6 + Math.floor(number * 0.55), 17);
  const enemies = Array.from({ length: regularCount }, (_, enemyIndex) => {
    const routeProgress = regularCount <= 1 ? 0 : enemyIndex / (regularCount - 1);
    const platformIndex = Math.round(routeProgress * (platforms.length - 2));
    const platform = platforms[platformIndex] ?? platforms[0]!;
    const platformEdgePadding = 34;
    const left = platform.x - platform.width / 2 + platformEdgePadding;
    const right = platform.x + platform.width / 2 - platformEdgePadding;
    const desiredX = platform.x + Math.round((random() - 0.5) * Math.min(platform.width * 0.42, 78));
    const x = Math.max(left, Math.min(right, desiredX));
    return {
      id: `${id}-monster-${enemyIndex + 1}`,
      x,
      y: platform.y - 90,
      health: number <= 3 ? 1 : introductoryStage ? 1 + Math.floor((number + enemyIndex) / 4) : hardStage ? 20 + number + Math.floor(enemyIndex / 2) : 2 + Math.floor(number / 2) + Math.floor(enemyIndex / 4),
      speed: introductoryStage ? 42 + number * 3 + (enemyIndex % 3) * 5 : hardStage ? 150 + number * 5 + (enemyIndex % 5) * 10 : 54 + number * 5 + (enemyIndex % 4) * 7,
      left,
      right,
      boss: false,
    };
  });
  enemies.push({
    id: id === 'avalanche-throne' ? 'avalanche-emperor' : `${id}-boss`,
    x: 4880, y: 250,
    health: number <= 3 ? 7 + number * 2 : hardStage ? 180 + (number - 20) * 42 : 10 + number * 5,
    speed: hardStage ? 190 + (number - 20) * 11 : 88 + number * 4,
    left: 4380, right: 5100,
    boss: true,
  });
  const palette = palettes[index] ?? palettes[0];
  const bossName = bossNames[index] ?? 'Unknown Boss';
  const name = stageNames[index] ?? `Stage ${number}`;
  return {
    id, number, name,
    subtitle: `Defeat the ${bossName} and survive its evolving patterns.`,
    worldLabel: name.toUpperCase(),
    backgroundColor: palette[0], groundColor: palette[1], accentColor: palette[2],
    platforms, enemies,
  };
}

export const stages = Object.fromEntries(stageIds.map((id, index) => [id, createStage(id, index)])) as Record<StageId, StageDefinition>;

export function isStageId(value: string): value is StageId {
  return stageIds.includes(value as StageId);
}
