import { getStageDifficulty } from '@/game/config/difficulty';

export type BossPatternExecutorId =
  | 'ordered-sigils'
  | 'baited-impact'
  | 'moving-sanctuary'
  | 'interrupt-ritual'
  | 'weakpoint-break'
  | 'line-of-sight'
  | 'delayed-echo'
  | 'marked-pursuit'
  | 'tether-guide'
  | 'rotating-gates'
  | 'collapsing-floor'
  | 'lane-synthesis';

export type PatternDecisionKind =
  | 'position'
  | 'memory'
  | 'bait'
  | 'line-of-sight'
  | 'priority'
  | 'interrupt'
  | 'route'
  | 'timing';

export type TelegraphGeometry =
  | 'lane'
  | 'ordered-cells'
  | 'target-ring'
  | 'safe-glyph'
  | 'sweep-line'
  | 'tether'
  | 'moving-zone'
  | 'weak-point';

export type EnemyArchetypeId =
  | 'bulwark'
  | 'charger'
  | 'ritualist'
  | 'trapper'
  | 'warden'
  | 'summoner'
  | 'marksman'
  | 'bomber'
  | 'conductor'
  | 'echo';

export type BossPatternEntry = Readonly<{
  id: string;
  name: string;
  mechanicId: string;
  executorId: BossPatternExecutorId;
  decisionKind: PatternDecisionKind;
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
  geometry: TelegraphGeometry;
  safeZoneRule: string;
  counterplayRule: string;
  presentationId: string;
  telegraphAssetId: string;
  activeAssetId: string;
  impactAssetId: string;
  audioCueId: string;
}>;

export type BossPhaseDefinition = Readonly<{
  id: string;
  enterAtHealthBps: number;
  firstCycle: readonly BossPatternEntry[];
  repeatDeck: readonly BossPatternEntry[];
}>;

export type EnemySignatureSkill = Readonly<{
  id: string;
  name: string;
  family: string;
  archetypes: readonly EnemyArchetypeId[];
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
  targetRuleId: string;
  safeZoneRuleId: string;
  movementPlanId: string;
  counterplayRule: string;
  geometry: TelegraphGeometry;
  presentationId: string;
  telegraphAssetId: string;
  activeAssetId: string;
  impactAssetId: string;
  reducedMotionAssetId: string;
  audioCueId: string;
}>;

export type StageEncounterDefinition = Readonly<{
  id: string;
  lesson: 'teach' | 'test' | 'combine';
  maxAlive: 1 | 2 | 3 | 4;
  seed: number;
  signatureSkillId: string;
}>;

export type StageCombatProfile = Readonly<{
  stageNumber: number;
  stageId: string;
  theme: string;
  boss: Readonly<{
    id: string;
    name: string;
    baselineSpeedPxPerSec: number;
    preferredRangePx: number;
    identityTags: readonly string[];
    signatureMechanics: readonly string[];
    ultimateId: string;
    actorAssetId: string;
    skillAtlasAssetId: string;
    phases: readonly BossPhaseDefinition[];
  }>;
  enemies: Readonly<{
    signature: EnemySignatureSkill;
    encounters: readonly StageEncounterDefinition[];
    actorAssetId: string;
    skillAtlasAssetId: string;
  }>;
}>;

type StageCombatSeed = Readonly<{
  stageId: string;
  theme: string;
  bossName: string;
  bossAnchors: readonly [string, string, string];
  enemySkill: string;
  enemyFamily: string;
  enemyArchetypes: readonly [EnemyArchetypeId, EnemyArchetypeId] | readonly [EnemyArchetypeId, EnemyArchetypeId, EnemyArchetypeId];
  enemyCounterplay: string;
}>;

const STAGE_COMBAT_SEEDS = [
  ['verdant-pass', 'Verdant', 'Goblin Warlord', ['banner-claim', 'shield-flank', 'bomb-bait'], 'root-lattice', 'ordered-ground', ['bulwark', 'trapper'], 'Read the root order and move through the leafless gap.'],
  ['mistwood-den', 'Mist', 'Mist Wolf', ['scent-trail', 'fog-pockets', 'echo-paw'], 'mist-footprint', 'delayed-echo', ['echo', 'marksman'], 'Bait the recorded footprints outside the route, then reverse.'],
  ['ruined-city', 'Rune', 'Rune Golem', ['rune-order', 'core-break', 'pillar-los'], 'masonry-order', 'ordered-impact', ['ritualist', 'bulwark'], 'Follow the numbered cracks; cleared masonry becomes the safe route.'],
  ['volcanic-frontier', 'Magma', 'Lava Dragon', ['vent-order', 'breath-cover', 'tail-bait'], 'vent-relay', 'moving-safe-zone', ['bomber', 'charger'], 'Rotate to the vent that just cooled after reading the eruption order.'],
  ['frozen-sanctum', 'Frost', 'Ice Queen', ['mirror-tile', 'statue-cover', 'thaw-sigil'], 'frost-mirror', 'mirror-choice', ['conductor', 'bulwark'], 'Read the mirrored rune shape and stand on its intact opposite.'],
  ['desert-tomb', 'Sand', 'Desert Scorpion', ['burrow-track', 'tail-mark', 'oasis-cleanse'], 'scarab-seal', 'interrupt-channel', ['summoner', 'trapper'], 'Break the lit seal or interrupt the summoner before scarabs emerge.'],
  ['sky-reach', 'Gale', 'Wind Harpy', ['gust-lanes', 'perch-interrupt', 'updraft-zone'], 'crosswind-pennant', 'directional-cover', ['marksman', 'conductor'], 'Read the pennant arrow and shelter behind the matching anchor glyph.'],
  ['blood-castle', 'Blood', 'Vampire Lord', ['blood-tether', 'altar-sever', 'shadow-mirror'], 'crimson-tether', 'tether-break', ['warden', 'charger'], 'Stretch the tether beyond its limit or interrupt the warden channel.'],
  ['abyssal-reef', 'Abyss', 'Deep Kraken', ['tentacle-order', 'anchor-zone', 'ink-los'], 'bubble-wake', 'delayed-route', ['bomber', 'echo'], 'Bait the three recorded bubbles away from the forward route.'],
  ['thunder-coliseum', 'Thunder', 'Thunder Minotaur', ['pillar-charge', 'lightning-rods', 'hoof-shock'], 'conduction-circuit', 'memory-circuit', ['conductor', 'bulwark'], 'Remember the pylon order and cross through the unlit circuit segment.'],
  ['plague-marsh', 'Plague', 'Plague Necromancer', ['corpse-totem', 'cleanse-pool', 'bone-line'], 'spore-choir', 'priority-interrupt', ['summoner', 'warden'], 'Interrupt the carriers in the order shown by their spore crowns.'],
  ['crystal-labyrinth', 'Crystal', 'Crystal Hydra', ['head-match', 'prism-lanes', 'crystal-cover'], 'prism-ricochet', 'reflected-line', ['marksman', 'echo'], 'Read both the direct and reflected beam before entering the clear wedge.'],
  ['clockwork-fortress', 'Clockwork', 'Clockwork Titan', ['clock-sectors', 'gear-jam', 'piston-lanes'], 'clock-gate', 'rotating-gap', ['conductor', 'charger'], 'Track the marked gap through the half rotation, then punish recovery.'],
  ['sunken-dunes', 'Dune', 'Sand Wyrm', ['footprint-memory', 'burrow-path', 'oasis-zone'], 'buried-footfall', 'delayed-footprint', ['trapper', 'bomber'], 'Bait two buried footprints, then reverse before oldest-first eruptions.'],
  ['celestial-aerie', 'Celestial', 'Celestial Griffin', ['constellation-order', 'wing-gust', 'star-perch'], 'feather-compass', 'lane-sequence', ['ritualist', 'marksman'], 'Follow the displayed low, high, and far lane glyph sequence.'],
  ['void-temple', 'Void', 'Void Witch', ['portal-pairs', 'void-mark', 'shadow-copy'], 'null-rite', 'node-priority', ['warden', 'ritualist'], 'Destroy the lit void node before attacking the shielded ritualist.'],
  ['mammoth-glacier', 'Glacier', 'Frost Mammoth', ['tusk-wall', 'ice-order', 'stomp-ring'], 'fracture-route', 'ordered-platforms', ['trapper', 'charger'], 'Read the platform fracture order and finish on the intact region.'],
  ['phoenix-caldera', 'Phoenix', 'Inferno Phoenix', ['ash-nests', 'rebirth-interrupt', 'ember-carry'], 'ember-recall', 'revive-interrupt', ['summoner', 'bomber'], 'Destroy the ember left by a fallen add before its revival channel completes.'],
  ['leviathan-trench', 'Leviathan', 'Abyss Leviathan', ['tide-level', 'anchor-chain', 'wave-cover'], 'pressure-ring', 'aligned-gap', ['conductor', 'marksman'], 'Align with the notched pressure ring and pass through its opening.'],
  ['avalanche-throne', 'Avalanche', 'Avalanche Emperor', ['royal-decree', 'snow-cover', 'crown-shards'], 'avalanche-arch', 'closing-cover', ['bulwark', 'trapper'], 'Move to the pre-marked arch before the slow snow walls close.'],
  ['obsidian-breach', 'Obsidian', 'Obsidian Behemoth', ['plate-break', 'shard-cover', 'fissure-route'], 'obsidian-facet', 'baited-facing', ['bulwark', 'warden'], 'Bait the shield swing, circle behind, and use the exposed weak window.'],
  ['spectral-exchange', 'Spectral', 'Spectral Broker', ['bid-ask-zones', 'contract-mark', 'coin-bait'], 'debt-ledger', 'death-placement', ['echo', 'bomber'], 'Move marked enemies to the arena edge before defeating them.'],
  ['iron-maelstrom', 'Iron', 'Iron Seraph', ['wing-gates', 'halo-match', 'feather-shield'], 'magnetic-claim', 'guided-projectile', ['conductor', 'marksman'], 'Place the marked pylon between you and the curving projectile.'],
  ['toxic-singularity', 'Toxic', 'Toxic Singularity', ['contagion-transfer', 'purifier-pylons', 'quarantine-lanes'], 'antidote-rotation', 'beacon-route', ['trapper', 'warden'], 'Follow the leaf-shaped beacon rotation between toxic pulses.'],
  ['solar-ruin', 'Solar', 'Solar Devourer', ['moving-shadow', 'eclipse-pillars', 'flare-bait'], 'solar-occlusion', 'line-of-sight', ['marksman', 'ritualist'], 'Enter the explicitly marked pillar shadow before the solar pulse.'],
  ['gravity-vault', 'Gravity', 'Gravity Colossus', ['anchor-weight', 'gravity-lanes', 'falling-zone'], 'gravity-stamp', 'elevated-safe-zone', ['conductor', 'charger'], 'Step on the raised gravity pad for the sweep, then punish recovery.'],
  ['broken-fortune', 'Fortune', 'Ruin Sovereign', ['floor-collapse', 'rebuild-tiles', 'masonry-cover'], 'fortune-split', 'symbol-match', ['ritualist', 'bomber'], 'Match the star or crack symbol; color alone never identifies safety.'],
  ['chaos-ledger', 'Chaos', 'Chaos Auditor', ['ledger-order', 'audit-stamps', 'variance-zones'], 'audit-sequence', 'ordered-targets', ['echo', 'ritualist'], 'Interrupt targets in the displayed one-two-three audit order.'],
  ['extinction-market', 'Extinction', 'Extinction Dragon', ['fossil-wards', 'breath-los', 'species-sigils'], 'disposal-route', 'hazard-guidance', ['bomber', 'charger'], 'Guide the parcel bomb into the marked crusher to stagger nearby enemies.'],
  ['last-compound', 'Compound', 'Compound Overlord', ['stack-transfer', 'deposit-zones', 'growing-mark'], 'keyholder-protocol', 'role-priority', ['warden', 'summoner', 'marksman'], 'Break keyholders I, II, and III in order to unlock the final guard.'],
  ['eclipse-gate', 'Eclipse', 'Eclipse Executioner', ['light-shadow-judgment', 'execution-marks', 'totality-sentence'], 'umbra-relay', 'moving-sanctuary', ['conductor', 'echo'], 'Stay inside the slow A-to-B-to-C sanctuary during each eclipse pulse.'],
  ['paradox-foundry', 'Paradox', 'Paradox Machinist', ['recorded-path', 'clone-timeline', 'bootstrap-collapse'], 'paradox-afterimage', 'mirrored-echo', ['echo', 'charger'], 'Dodge the original lane, then its mirrored replay nine tenths later.'],
  ['blood-moon-citadel', 'Blood Moon', 'Blood Moon Tyrant', ['moon-altars', 'vein-lanes', 'red-coronation'], 'moonbrand-hunt', 'moving-priority', ['warden', 'summoner'], 'Track and interrupt the deterministic moonbrand target.'],
  ['infinite-tempest', 'Tempest', 'Infinite Tempest', ['moving-eye', 'grounded-zones', 'infinite-eye'], 'storm-weave', 'moving-gap', ['marksman', 'conductor'], 'Follow the slowly moving gap through the numbered woven storm lanes.'],
  ['godfall-chasm', 'Godfall', 'Godfall Arbiter', ['verdict-symbols', 'witness-adds', 'godfall-verdict'], 'judgment-seal', 'collision-bait', ['charger', 'bulwark'], 'Bait the charger into the lit judgment seal to break the bulwark.'],
  ['chronos-prison', 'Chronos', 'Chronos Warden', ['delayed-echo', 'time-locks', 'prison-break'], 'time-latch', 'hazard-control', ['echo', 'warden'], 'Hit the latch orb to freeze the clock beam at a safe angle.'],
  ['astral-graveyard', 'Astral', 'Astral Gravekeeper', ['constellation-graves', 'lantern-los', 'astral-funeral'], 'constellation-wake', 'ordered-defeat', ['summoner', 'ritualist'], 'Defeat star adds in the shown order to draw the safe constellation path.'],
  ['hellfire-nexus', 'Hellfire', 'Hellfire Origin', ['temper-cycle', 'forge-runes', 'origin-forge'], 'fuse-network', 'network-interrupt', ['bomber', 'trapper'], 'Break the overheated fuse junction or retreat to the marked safe bay.'],
  ['absolute-zero', 'Absolute Zero', 'Absolute Zero', ['heat-sharing', 'thaw-beacons', 'thermal-death'], 'thermal-memory', 'platform-memory', ['ritualist', 'echo'], 'Repeat the warm platform sequence during the whiteout.'],
  ['end-of-eternity', 'Eternity', 'Eternity Devourer', ['era-lanes', 'memory-devour', 'end-of-eternity'], 'eternity-palindrome', 'palindrome-memory', ['bulwark', 'echo', 'ritualist'], 'Resolve A-B-C-C-B-A across the safe and interrupt nodes.'],
] as const satisfies readonly (readonly [
  string,
  string,
  string,
  readonly [string, string, string],
  string,
  string,
  readonly EnemyArchetypeId[],
  string,
])[];

const BOSS_EXECUTORS: readonly BossPatternExecutorId[] = [
  'ordered-sigils',
  'baited-impact',
  'moving-sanctuary',
  'interrupt-ritual',
  'weakpoint-break',
  'line-of-sight',
  'delayed-echo',
  'marked-pursuit',
  'tether-guide',
  'rotating-gates',
  'collapsing-floor',
  'lane-synthesis',
];

const DECISIONS: readonly PatternDecisionKind[] = [
  'position',
  'memory',
  'bait',
  'line-of-sight',
  'priority',
  'interrupt',
  'route',
  'timing',
];

const GEOMETRIES: readonly TelegraphGeometry[] = [
  'lane',
  'ordered-cells',
  'target-ring',
  'safe-glyph',
  'sweep-line',
  'tether',
  'moving-zone',
  'weak-point',
];

const ENTRY_VARIANTS = [
  'lesson',
  'mirror',
  'relay',
  'memory',
  'reversal',
  'crossing',
  'anchor',
  'verdict',
  'echo',
  'synthesis',
  'break',
  'finale',
] as const;

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function seedFromTuple(tuple: (typeof STAGE_COMBAT_SEEDS)[number]): StageCombatSeed {
  return {
    stageId: tuple[0],
    theme: tuple[1],
    bossName: tuple[2],
    bossAnchors: tuple[3],
    enemySkill: tuple[4],
    enemyFamily: tuple[5],
    enemyArchetypes: tuple[6],
    enemyCounterplay: tuple[7],
  };
}

function createBossEntry(
  seed: StageCombatSeed,
  stageNumber: number,
  phaseNumber: number,
  entryIndex: number,
): BossPatternEntry {
  const difficulty = getStageDifficulty(stageNumber);
  const anchor = seed.bossAnchors[(entryIndex + phaseNumber - 1) % seed.bossAnchors.length] ?? seed.bossAnchors[0];
  const variant = ENTRY_VARIANTS[entryIndex] ?? 'lesson';
  const executorIndex = (
    stageNumber * 7
    + phaseNumber * 3
    + entryIndex * 5
    + ((stageNumber >> (entryIndex % 5)) & 0b11)
  ) % BOSS_EXECUTORS.length;
  const executorId = BOSS_EXECUTORS[executorIndex] ?? 'ordered-sigils';
  const decisionKind = DECISIONS[(
    stageNumber
    + phaseNumber
    + entryIndex * 3
    + ((stageNumber >> (entryIndex % 6)) & 0b111)
  ) % DECISIONS.length] ?? 'position';
  const geometry = GEOMETRIES[(
    stageNumber * 2
    + phaseNumber
    + entryIndex
    + ((stageNumber >> (entryIndex % 4)) & 0b111)
  ) % GEOMETRIES.length] ?? 'lane';
  const namespace = `boss.s${String(stageNumber).padStart(2, '0')}.phase-${phaseNumber}.${anchor}.${variant}`;
  const tierTelegraphBase = {
    veteran: 900,
    master: 820,
    hard: 760,
    extreme: 720,
    cataclysm: 700,
  }[difficulty.tier];
  const phasePressureMs = Math.max(0, (4 - phaseNumber) * (difficulty.tier === 'cataclysm' ? 0 : 35));
  const recoveryBaseMs = {
    veteran: 650,
    master: 600,
    hard: 560,
    extreme: 520,
    cataclysm: 500,
  }[difficulty.tier];
  return {
    id: `${namespace}.v1`,
    name: `${seed.theme} ${titleCase(anchor)}: ${titleCase(variant)}`,
    mechanicId: anchor,
    executorId,
    decisionKind,
    telegraphMs: tierTelegraphBase + phasePressureMs + (entryIndex % 3) * 55,
    activeMs: 420 + (entryIndex % 4) * 110,
    recoveryMs: recoveryBaseMs + ((entryIndex + phaseNumber) % 5) * 80,
    geometry,
    safeZoneRule: `${seed.stageId}.${anchor}.${geometry}.safe`,
    counterplayRule: `Read ${titleCase(anchor)}, then resolve by ${decisionKind}.`,
    presentationId: `${namespace}.presentation.v1`,
    telegraphAssetId: `${namespace}.telegraph.v1`,
    activeAssetId: `${namespace}.active.v1`,
    impactAssetId: `${namespace}.impact.v1`,
    audioCueId: `${namespace}.audio.v1`,
  };
}

function createBossPhase(
  seed: StageCombatSeed,
  stageNumber: number,
  phaseNumber: number,
  phaseCount: number,
): BossPhaseDefinition {
  const entries = Array.from({ length: 12 }, (_, entryIndex) => {
    const entry = createBossEntry(seed, stageNumber, phaseNumber, entryIndex);
    if (phaseNumber !== phaseCount || entryIndex !== 11) return entry;
    const ultimateNamespace = `boss.s${String(stageNumber).padStart(2, '0')}.${seed.bossAnchors[2]}.ultimate`;
    return {
      ...entry,
      id: `${ultimateNamespace}.v1`,
      name: `${seed.theme} ${titleCase(seed.bossAnchors[2])}: Ultimate`,
      presentationId: `${ultimateNamespace}.presentation.v1`,
      telegraphAssetId: `${ultimateNamespace}.telegraph.v1`,
      activeAssetId: `${ultimateNamespace}.active.v1`,
      impactAssetId: `${ultimateNamespace}.impact.v1`,
      audioCueId: `${ultimateNamespace}.audio.v1`,
    };
  });
  const repeatOffset = (stageNumber + phaseNumber * 3) % entries.length;
  return {
    id: `boss.s${String(stageNumber).padStart(2, '0')}.phase-${phaseNumber}.v1`,
    enterAtHealthBps: phaseNumber === 1 ? 10_000 : Math.round(((phaseCount - phaseNumber + 1) / phaseCount) * 10_000),
    firstCycle: entries,
    repeatDeck: [...entries.slice(repeatOffset), ...entries.slice(0, repeatOffset)],
  };
}

function createEnemySignature(seed: StageCombatSeed, stageNumber: number): EnemySignatureSkill {
  const difficulty = getStageDifficulty(stageNumber);
  const namespace = `enemy.skill.s${String(stageNumber).padStart(2, '0')}.${seed.enemySkill}`;
  const geometry = GEOMETRIES[(stageNumber * 5) % GEOMETRIES.length] ?? 'lane';
  return {
    id: `${namespace}.v1`,
    name: `${seed.theme} ${titleCase(seed.enemySkill)}`,
    family: seed.enemyFamily,
    archetypes: seed.enemyArchetypes,
    telegraphMs: {
      veteran: 800,
      master: 760,
      hard: 730,
      extreme: 710,
      cataclysm: 700,
    }[difficulty.tier] + (stageNumber % 3) * 35,
    activeMs: 420 + (stageNumber % 3) * 100,
    recoveryMs: 500 + (stageNumber % 3) * 45,
    targetRuleId: `${seed.stageId}.${seed.enemySkill}.target`,
    safeZoneRuleId: `${seed.stageId}.${seed.enemySkill}.safe`,
    movementPlanId: `${seed.stageId}.${seed.enemySkill}.movement`,
    counterplayRule: seed.enemyCounterplay,
    geometry,
    presentationId: `enemy.presentation.s${String(stageNumber).padStart(2, '0')}.${seed.enemySkill}.v1`,
    telegraphAssetId: `enemy.vfx.s${String(stageNumber).padStart(2, '0')}.${seed.enemySkill}.telegraph.v1`,
    activeAssetId: `enemy.vfx.s${String(stageNumber).padStart(2, '0')}.${seed.enemySkill}.active.v1`,
    impactAssetId: `enemy.vfx.s${String(stageNumber).padStart(2, '0')}.${seed.enemySkill}.impact.v1`,
    reducedMotionAssetId: `enemy.vfx.s${String(stageNumber).padStart(2, '0')}.${seed.enemySkill}.reduced.v1`,
    audioCueId: `enemy.audio.s${String(stageNumber).padStart(2, '0')}.${seed.enemySkill}.v1`,
  };
}

function createStageCombatProfile(tuple: (typeof STAGE_COMBAT_SEEDS)[number], index: number): StageCombatProfile {
  const seed = seedFromTuple(tuple);
  const stageNumber = index + 1;
  const phaseCount = stageNumber >= 31 ? 4 : 3;
  const signature = createEnemySignature(seed, stageNumber);
  const maxCombineAlive = stageNumber >= 31 ? 4 : 3;
  const stageKey = String(stageNumber).padStart(2, '0');
  return {
    stageNumber,
    stageId: seed.stageId,
    theme: seed.theme,
    boss: {
      id: `boss.s${stageKey}.${seed.stageId}.v1`,
      name: seed.bossName,
      baselineSpeedPxPerSec: 72 + ((stageNumber - 1) % 8) * 4,
      preferredRangePx: 230 + (stageNumber % 4) * 25,
      identityTags: [seed.theme.toLowerCase().replaceAll(' ', '-'), ...seed.bossAnchors],
      signatureMechanics: seed.bossAnchors,
      ultimateId: `boss.s${stageKey}.${seed.bossAnchors[2]}.ultimate.v1`,
      actorAssetId: `boss.actor.s${stageKey}.${seed.stageId}.v1`,
      skillAtlasAssetId: `boss.skills.s${stageKey}.${seed.stageId}.v1`,
      phases: Array.from({ length: phaseCount }, (_, phaseIndex) => createBossPhase(seed, stageNumber, phaseIndex + 1, phaseCount)),
    },
    enemies: {
      signature,
      actorAssetId: `enemy.actor.s${stageKey}.${seed.stageId}.v1`,
      skillAtlasAssetId: `enemy.skills.s${stageKey}.${seed.stageId}.v1`,
      encounters: [
        { id: `encounter.s${stageKey}.teach.v1`, lesson: 'teach', maxAlive: 1, seed: stageNumber * 10_003 + 1, signatureSkillId: signature.id },
        { id: `encounter.s${stageKey}.test.v1`, lesson: 'test', maxAlive: 2, seed: stageNumber * 10_003 + 2, signatureSkillId: signature.id },
        { id: `encounter.s${stageKey}.combine.v1`, lesson: 'combine', maxAlive: maxCombineAlive, seed: stageNumber * 10_003 + 3, signatureSkillId: signature.id },
      ],
    },
  };
}

export const STAGE_COMBAT_PROFILES: readonly StageCombatProfile[] = STAGE_COMBAT_SEEDS.map(createStageCombatProfile);

export function getStageCombatProfile(stageNumber: number): StageCombatProfile {
  const profile = STAGE_COMBAT_PROFILES[stageNumber - 1];
  if (!profile) throw new Error(`Missing stage combat profile for stage ${stageNumber}.`);
  return profile;
}

export function canonicalBossFingerprint(profile: StageCombatProfile): string {
  return JSON.stringify({
    identity: profile.boss.identityTags,
    signatureMechanics: profile.boss.signatureMechanics,
    ultimateId: profile.boss.ultimateId,
    phaseDecisions: profile.boss.phases.map((phase) => phase.firstCycle.map((entry) => [
      entry.mechanicId,
      entry.executorId,
      entry.decisionKind,
      entry.geometry,
      entry.safeZoneRule,
    ])),
  });
}

export function canonicalBossMechanicalFingerprint(profile: StageCombatProfile): string {
  return JSON.stringify(profile.boss.phases.map((phase) => phase.firstCycle.map((entry) => [
    entry.executorId,
    entry.decisionKind,
    entry.geometry,
  ])));
}

export function canonicalEnemyFingerprint(profile: StageCombatProfile): string {
  const skill = profile.enemies.signature;
  return JSON.stringify({
    family: skill.family,
    targetRuleId: skill.targetRuleId,
    safeZoneRuleId: skill.safeZoneRuleId,
    movementPlanId: skill.movementPlanId,
    geometry: skill.geometry,
    counterplayRule: skill.counterplayRule,
  });
}
