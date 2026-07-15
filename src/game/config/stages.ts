export const stageIds = [
  'verdant-pass', 'mistwood-den', 'ruined-city', 'volcanic-frontier', 'frozen-sanctum',
  'desert-tomb', 'sky-reach', 'blood-castle', 'abyssal-reef', 'thunder-coliseum',
  'plague-marsh', 'crystal-labyrinth', 'clockwork-fortress', 'sunken-dunes', 'celestial-aerie',
  'void-temple', 'mammoth-glacier', 'phoenix-caldera', 'leviathan-trench', 'avalanche-throne',
  'obsidian-breach', 'spectral-exchange', 'iron-maelstrom', 'toxic-singularity', 'solar-ruin',
  'gravity-vault', 'broken-fortune', 'chaos-ledger', 'extinction-market', 'last-compound',
  'eclipse-gate', 'paradox-foundry', 'blood-moon-citadel', 'infinite-tempest', 'godfall-chasm',
  'chronos-prison', 'astral-graveyard', 'hellfire-nexus', 'absolute-zero', 'end-of-eternity',
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
  assetNumber: number;
  worldWidth: number;
  bossArenaStartX: number;
  special: boolean;
  platforms: readonly { x: number; y: number; width: number }[];
  enemies: readonly { id: string; x: number; y: number; health: number; speed: number; left: number; right: number; boss: boolean; elite?: boolean }[];
};

const bossNames = [
  'Goblin Warlord', 'Mist Wolf', 'Rune Golem', 'Lava Dragon', 'Ice Queen',
  'Desert Scorpion', 'Wind Harpy', 'Vampire Lord', 'Deep Kraken', 'Thunder Minotaur',
  'Plague Necromancer', 'Crystal Hydra', 'Clockwork Titan', 'Sand Wyrm', 'Celestial Griffin',
  'Void Witch', 'Frost Mammoth', 'Inferno Phoenix', 'Abyss Leviathan', 'Avalanche Emperor',
  'Obsidian Behemoth', 'Spectral Broker', 'Iron Seraph', 'Toxic Singularity', 'Solar Devourer',
  'Gravity Colossus', 'Ruin Sovereign', 'Chaos Auditor', 'Extinction Dragon', 'Compound Overlord',
  'Eclipse Executioner', 'Paradox Machinist', 'Blood Moon Tyrant', 'Infinite Tempest', 'Godfall Arbiter',
  'Chronos Warden', 'Astral Gravekeeper', 'Hellfire Origin', 'Absolute Zero', 'Eternity Devourer',
] as const;

const stageNames = [
  'Verdant Pass', 'Mistwood Den', 'Ruined City', 'Volcanic Frontier', 'Frozen Sanctum',
  'Desert Tomb', 'Sky Reach', 'Blood Castle', 'Abyssal Reef', 'Thunder Coliseum',
  'Plague Marsh', 'Crystal Labyrinth', 'Clockwork Fortress', 'Sunken Dunes', 'Celestial Aerie',
  'Void Temple', 'Mammoth Glacier', 'Phoenix Caldera', 'Leviathan Trench', 'Avalanche Throne',
  'Obsidian Breach', 'Spectral Exchange', 'Iron Maelstrom', 'Toxic Singularity', 'Solar Ruin',
  'Gravity Vault', 'Broken Fortune', 'Chaos Ledger', 'Extinction Market', 'Last Compound',
  'Eclipse Gate', 'Paradox Foundry', 'Blood Moon Citadel', 'Infinite Tempest', 'Godfall Chasm',
  'Chronos Prison', 'Astral Graveyard', 'Hellfire Nexus', 'Absolute Zero', 'End of Eternity',
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
  [0x05030b, 0x241535, 0xc45cff], [0x080d13, 0x243745, 0x5ffff2], [0x190308, 0x4a101c, 0xff355d],
  [0x030d18, 0x123e62, 0x42cfff], [0x100d05, 0x493713, 0xffdf62], [0x08041a, 0x24104f, 0xa97cff],
  [0x080b12, 0x293246, 0xe5edff], [0x1c0602, 0x551509, 0xff5b21], [0x020b12, 0x143c53, 0x92efff],
  [0x030305, 0x24242c, 0xffffff],
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

type PlatformDefinition = StageDefinition['platforms'][number];

const specialRoutePatterns = [
  [[0, 230, 0], [275, 180, 1], [515, 150, 3], [735, 210, 2], [1_010, 145, 0], [1_225, 240, 2]],
  [[0, 170, 2], [225, 145, 0], [440, 225, 1], [730, 150, 3], [940, 185, 1], [1_190, 170, 0]],
  [[0, 260, 0], [325, 130, 2], [525, 130, 3], [725, 130, 1], [925, 130, 3], [1_145, 245, 0]],
  [[0, 150, 3], [215, 205, 2], [485, 145, 0], [700, 245, 1], [1_015, 135, 3], [1_220, 150, 1]],
  [[0, 205, 1], [265, 145, 3], [475, 205, 0], [745, 145, 2], [955, 205, 0], [1_225, 145, 3]],
  [[0, 145, 0], [205, 145, 2], [410, 145, 0], [615, 145, 3], [820, 145, 1], [1_025, 260, 2]],
  [[0, 245, 2], [310, 145, 0], [520, 185, 3], [775, 145, 1], [990, 145, 3], [1_205, 175, 0]],
  [[0, 180, 0], [240, 180, 3], [480, 180, 1], [720, 180, 3], [960, 180, 0], [1_200, 180, 2]],
  [[0, 135, 3], [200, 240, 1], [505, 135, 0], [705, 135, 3], [905, 240, 1], [1_210, 135, 0]],
  [[0, 150, 0], [220, 135, 3], [425, 135, 1], [630, 135, 3], [835, 135, 0], [1_040, 135, 3], [1_245, 150, 1]],
] as const;

function createSpecialPlatforms(stageNumber: number): PlatformDefinition[] {
  const stageOffset = stageNumber - 31;
  const zones = [
    { start: 370, length: 2_080 },
    { start: 4_350, length: 1_720 },
    { start: 7_950, length: 1_700 },
  ] as const;

  return zones.flatMap((zone, zoneIndex) => {
    const pattern = specialRoutePatterns[(stageOffset * 3 + zoneIndex * 4) % specialRoutePatterns.length]!;
    const patternEnd = pattern[pattern.length - 1]![0] + pattern[pattern.length - 1]![1];
    const scale = zone.length / patternEnd;
    return pattern.map(([offset, width, tier], platformIndex) => ({
      x: Math.round(zone.start + (offset + width / 2) * scale),
      y: 387 - ((tier + stageOffset + zoneIndex + platformIndex % 2) % 4) * 45,
      width: Math.max(128, Math.round(width * scale)),
    }));
  });
}

function createPlatforms(stageNumber: number) {
  if (stageNumber >= 31) return createSpecialPlatforms(stageNumber);
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
  const specialStage = number >= 31;
  const regularCount = introductoryStage ? 4 + Math.floor((number - 1) / 2) : specialStage ? 30 + (number - 31) : hardStage ? Math.min(18 + Math.floor((number - 21) * 0.8), 25) : Math.min(6 + Math.floor(number * 0.55), 17);
  const regularEnemyPlatforms = specialStage
    ? platforms.filter((platform) => !(
      (platform.x >= 2_400 && platform.x <= 4_400)
      || (platform.x >= 5_900 && platform.x <= 7_900)
      || platform.x >= 9_700
    ))
    : platforms;
  const enemies: Array<StageDefinition['enemies'][number]> = Array.from({ length: regularCount }, (_, enemyIndex) => {
    const routeProgress = regularCount <= 1 ? 0 : enemyIndex / (regularCount - 1);
    const platformIndex = Math.round(routeProgress * (regularEnemyPlatforms.length - 1));
    const platform = regularEnemyPlatforms[platformIndex] ?? platforms[0]!;
    const platformEdgePadding = 34;
    const left = platform.x - platform.width / 2 + platformEdgePadding;
    const right = platform.x + platform.width / 2 - platformEdgePadding;
    const desiredX = platform.x + Math.round((random() - 0.5) * Math.min(platform.width * 0.42, 78));
    const x = Math.max(left, Math.min(right, desiredX));
    return {
      id: `${id}-monster-${enemyIndex + 1}`,
      x,
      y: platform.y - 90,
      health: number <= 3 ? 1 : introductoryStage ? 1 + Math.floor((number + enemyIndex) / 4) : specialStage ? 82 + (number - 31) * 9 + enemyIndex : hardStage ? 20 + number + Math.floor(enemyIndex / 2) : 2 + Math.floor(number / 2) + Math.floor(enemyIndex / 4),
      speed: introductoryStage ? 42 + number * 3 + (enemyIndex % 3) * 5 : specialStage ? 330 + (number - 31) * 16 + (enemyIndex % 6) * 14 : hardStage ? 150 + number * 5 + (enemyIndex % 5) * 10 : 54 + number * 5 + (enemyIndex % 4) * 7,
      left,
      right,
      boss: false,
    };
  });
  if (specialStage) {
    enemies.push(
      {
        id: `${id}-named-guardian`, x: 3_400, y: 250,
        health: 460 + (number - 31) * 85, speed: 285 + (number - 31) * 14,
        left: 2_600, right: 4_200, boss: false, elite: true,
      },
      {
        id: `${id}-named-herald`, x: 7_000, y: 250,
        health: 620 + (number - 31) * 110, speed: 320 + (number - 31) * 16,
        left: 6_200, right: 7_800, boss: false, elite: true,
      },
    );
  }
  enemies.push({
    id: id === 'avalanche-throne' ? 'avalanche-emperor' : `${id}-boss`,
    x: specialStage ? 10_700 : 4_880, y: 250,
    health: number <= 3 ? 7 + number * 2 : specialStage ? 1_200 + (number - 31) * 240 : hardStage ? 180 + (number - 20) * 42 : 10 + number * 5,
    speed: specialStage ? 390 + (number - 31) * 22 : hardStage ? 190 + (number - 20) * 11 : 88 + number * 4,
    left: specialStage ? 9_850 : 4_380, right: specialStage ? 11_520 : 5_100,
    boss: true,
  });
  const palette = palettes[index] ?? palettes[0]!;
  const bossName = bossNames[index] ?? 'Unknown Boss';
  const name = stageNames[index] ?? `Stage ${number}`;
  return {
    id, number, name,
    subtitle: specialStage
      ? `SPECIAL NAMED RAID · Defeat ${bossName} through four escalating phases.`
      : `Defeat the ${bossName} and survive its evolving patterns.`,
    worldLabel: name.toUpperCase(),
    backgroundColor: palette[0], groundColor: palette[1], accentColor: palette[2],
    assetNumber: specialStage ? 21 + ((number - 31) % 10) : number,
    worldWidth: specialStage ? 11_600 : 5_200,
    bossArenaStartX: specialStage ? 9_800 : 4_180,
    special: specialStage,
    platforms, enemies,
  };
}

export const stages = Object.fromEntries(stageIds.map((id, index) => [id, createStage(id, index)])) as Record<StageId, StageDefinition>;

export function isStageId(value: string): value is StageId {
  return stageIds.includes(value as StageId);
}
