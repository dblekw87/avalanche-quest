import * as Phaser from 'phaser';

import { QuestAudioDirector } from '@/game/audio/quest-audio-director';
import { assetTycoonSkills } from '@/game/asset-tycoon';
import type { StageResult, StageTelemetryEvent } from '@/game/bridge/events';
import { isInnateCharacter, isPoliticalCharacter, isSecretCharacter, type CharacterId } from '@/game/characters';
import { stages, type StageId } from '@/game/config/stages';
import { innateClasses } from '@/game/innate-classes';
import type { MobileGameAction } from '@/game/mobile-game-controls';
import { politicalFighters } from '@/game/political-duel/definitions';
import type { UpgradeLevels } from '@/features/upgrades/upgrade-contract';

type EnemyState = {
  id: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  health: number;
  maxHealth: number;
  speed: number;
  leftBound: number;
  rightBound: number;
  direction: -1 | 1;
  boss: boolean;
  healthBar: Phaser.GameObjects.Rectangle;
  nextSkillAt: number;
  nextJumpAt: number;
  nextAttackAt: number;
  patternIndex: number;
  bossMotion: 'idle' | 'move' | 'jump' | 'cast' | 'hit' | 'dead';
  bossMotionUntil: number;
  actionLockedUntil: number;
  revealed: boolean;
};

type BossProjectile = {
  sprite: Phaser.Physics.Arcade.Image | Phaser.Physics.Arcade.Sprite;
  expiresAt: number;
  lastTrailAt: number;
};

type BossPattern = 'fan' | 'rain' | 'charge' | 'leap' | 'burst' | 'teleport-left' | 'teleport-right' | 'retreat-volley' | 'blink-barrage' | 'sky-dive' | 'closing-walls' | 'crossfire' | 'gravity-cage' | 'doom-grid' | 'relentless-chain';

type PlayerSkillProjectile = {
  sprite: Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image;
  expiresAt: number;
  damage: number;
  skillId?: string;
  horizontalHitRadius?: number;
  verticalHitRadius?: number;
  piercing?: boolean;
  hitEnemyIds?: Set<string>;
  lastTrailAt?: number;
};

const PLAYER_MAX_HEALTH = 8;
const ATTACK_COOLDOWN_MS = 360;
const DAMAGE_INVULNERABILITY_MS = 850;
const BOSS_AGGRO_RANGE = 540;
const BOSS_PREFERRED_RANGE = 230;
const BOSS_SKILL_COOLDOWN_MS = 1_700;
const BOSS_ENRAGED_SKILL_COOLDOWN_MS = 1_050;
const BOSS_PROJECTILE_LIFETIME_MS = 3_200;
const PLAYER_SKILL_PROJECTILE_LIFETIME_MS = 1_700;
const BOSS_VISUAL_SCALE = 0.9;
const DASH_SPEED = 520;
const DASH_DURATION_MS = 165;
const DASH_COOLDOWN_MS = 800;
const WORLD_WIDTH = 5_200;
const WORLD_PHYSICS_HEIGHT = 720;
const PIT_DEATH_Y = 610;
const BOSS_ARENA_START_X = 4_180;
const BOSS_ARENA_TOP_Y = 390;
const SKILL_COOLDOWN_BAR_WIDTH = 48;
const AWAKENING_COOLDOWN_MS = 30_000;
const AWAKENING_SKILL_IDS = new Set([
  'starfall', 'meteor', 'constellation-storm', 'emerald-rain', 'infinite-blades', 'heaven-breaker',
  'cataclysm-wyvern', 'bullet-tempest', 'heaven-sever', 'skybreaker-combo', 'deathbloom',
  'solar-cataclysm', 'world-anvil', 'ragnarok-cleaver', 'legacy-beyond-failure',
  'primordial-genesis', 'nightmare-apocalypse',
]);
const MAX_TOTAL_EQUIPMENT_UPGRADE_LEVEL = 65;
const UPGRADE_PARTICLE_OFFSET_X = 8;
const PLATFORM_SURFACE_ORIGIN_Y = [
  0.1477, 0.1532, 0.1557, 0.1727, 0.1731,
  0.0588, 0.0886, 0.1538, 0.1216, 0.0549,
  0.1045, 0.1554, 0.0685, 0.1154, 0.0679,
  0.0403, 0.0467, 0.124, 0.0427, 0.1866,
] as const;
const SKILL_COOLDOWNS: Readonly<Record<string, number>> = {
  'arcane-bolt': 1_200, 'frost-nova': 3_500, 'flame-wave': 2_400, 'healing-light': 8_000, starfall: 7_000,
  'magic-missile': 1_200, 'ice-storm': 3_500, 'chain-lightning': 2_400, 'healing-circle': 8_000, meteor: 7_000,
  'arcane-cleave': 2_200, 'twin-phantom': 3_200, 'rune-step': 3_800, 'astral-counter': 8_000, 'constellation-storm': 7_500,
  'gale-arrow': 1_300, 'split-shot': 2_600, 'verdant-snare': 3_800, 'feather-step': 8_000, 'emerald-rain': 7_500,
  'crescent-fang': 1_500, 'phantom-cross': 3_400, 'shadow-reversal': 5_200, 'azure-focus': 11_000, 'infinite-blades': 8_500,
  'iron-jab': 1_400, 'hundred-fists': 3_600, 'titan-fist': 4_800, 'burning-spirit': 11_000, 'heaven-breaker': 8_800,
};

const BOSS_PATTERN_SEQUENCES: readonly (readonly BossPattern[])[] = [
  ['fan', 'charge', 'leap'],
  ['fan', 'retreat-volley', 'charge', 'leap'],
  ['rain', 'fan', 'charge', 'leap'],
  ['charge', 'fan', 'leap', 'burst'],
  ['rain', 'retreat-volley', 'fan', 'charge'],
  ['rain', 'charge', 'teleport-left', 'fan', 'leap'],
  ['sky-dive', 'retreat-volley', 'blink-barrage', 'fan', 'teleport-right'],
  ['teleport-left', 'blink-barrage', 'burst', 'retreat-volley', 'teleport-right'],
  ['rain', 'burst', 'teleport-right', 'leap', 'fan'],
  ['charge', 'leap', 'burst', 'sky-dive', 'fan'],
  ['teleport-left', 'rain', 'burst', 'blink-barrage', 'retreat-volley'],
  ['burst', 'fan', 'rain', 'sky-dive', 'teleport-right'],
  ['charge', 'blink-barrage', 'fan', 'leap', 'teleport-left'],
  ['teleport-right', 'rain', 'charge', 'retreat-volley', 'sky-dive'],
  ['sky-dive', 'fan', 'blink-barrage', 'leap', 'burst'],
  ['teleport-left', 'teleport-right', 'blink-barrage', 'rain', 'burst'],
  ['leap', 'rain', 'charge', 'sky-dive', 'retreat-volley'],
  ['sky-dive', 'burst', 'blink-barrage', 'teleport-left', 'fan'],
  ['rain', 'teleport-right', 'burst', 'sky-dive', 'charge'],
  ['teleport-left', 'sky-dive', 'burst', 'rain', 'blink-barrage'],
  ['closing-walls', 'fan', 'crossfire', 'charge', 'rain'],
  ['crossfire', 'blink-barrage', 'retreat-volley', 'gravity-cage', 'burst'],
  ['gravity-cage', 'leap', 'closing-walls', 'fan', 'sky-dive'],
  ['doom-grid', 'teleport-left', 'crossfire', 'rain', 'charge'],
  ['relentless-chain', 'gravity-cage', 'sky-dive', 'closing-walls', 'burst'],
  ['doom-grid', 'blink-barrage', 'relentless-chain', 'crossfire', 'teleport-right'],
  ['relentless-chain', 'doom-grid', 'gravity-cage', 'closing-walls', 'blink-barrage'],
  ['doom-grid', 'crossfire', 'relentless-chain', 'sky-dive', 'gravity-cage'],
  ['relentless-chain', 'closing-walls', 'doom-grid', 'blink-barrage', 'crossfire', 'gravity-cage'],
  ['doom-grid', 'relentless-chain', 'gravity-cage', 'crossfire', 'closing-walls', 'sky-dive'],
];

export class QuestScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private skillKeys!: Readonly<Record<string, Phaser.Input.Keyboard.Key>>;
  private enemies: EnemyState[] = [];
  private playerHealth = PLAYER_MAX_HEALTH;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private objectiveText!: Phaser.GameObjects.Text;
  private startedAt = 0;
  private lastAttackAt = -ATTACK_COOLDOWN_MS;
  private invulnerableUntil = 0;
  private attackVisual?: Phaser.GameObjects.Container;
  private armorOverlay!: Phaser.GameObjects.Graphics;
  private armorGlow!: Phaser.GameObjects.Ellipse;
  private weaponGlow!: Phaser.GameObjects.Ellipse;
  private upgradeParticle?: Phaser.GameObjects.Sprite;
  private playerPoseLockedUntil = 0;
  private bossProjectiles: BossProjectile[] = [];
  private playerSkillProjectiles: PlayerSkillProjectile[] = [];
  private readonly lastSkillAt = new Map<string, number>();
  private readonly skillCooldownBars = new Map<string, { fill: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }>();
  private skillLockedUntil = 0;
  private defenseUntil = 0;
  private activeDefenseReduction = 1;
  private classPowerUntil = 0;
  private classPowerMultiplier = 1.3;
  private classMovementSpeed = 270;
  private classBuffAura?: Phaser.GameObjects.Ellipse;
  private dashUntil = 0;
  private lastDashAt = -DASH_COOLDOWN_MS;
  private lastDashTrailAt = 0;
  private jumpsRemaining = 2;
  private finished = false;
  private victorySequenceStarted = false;
  private telemetry: StageTelemetryEvent[] = [];
  private readonly stage;
  private readonly audioDirector: QuestAudioDirector;
  private mobileLeft = false;
  private mobileRight = false;
  private mobileJumpQueued = false;
  private mobileDashQueued = false;
  private mobileAttackQueued = false;
  private readonly mobileSkillQueue = new Set<string>();

  constructor(
    stageId: StageId,
    private readonly attemptId: string,
    private readonly ownedSkillIds: readonly string[] = [],
    private readonly armorEquipped = false,
    private readonly armorLevel = 0,
    private readonly aqtBalance = '0',
    private readonly characterId: CharacterId = 'warrior',
    private readonly upgradeLevels: UpgradeLevels = { attack: 0, vitality: 0, defense: 0 },
    private readonly skillUpgradeLevels: Readonly<Record<string, number>> = {},
    private equipmentParticlesEnabled = true,
  ) {
    super('QuestScene');
    this.stage = stages[stageId];
    this.audioDirector = new QuestAudioDirector(this.stage.number);
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioDirector.setEnabled(enabled);
  }

  unlockAudio(): void {
    void this.audioDirector.unlock();
  }

  setMobileAction(action: MobileGameAction, active: boolean): void {
    if (action === 'left') this.mobileLeft = active;
    else if (action === 'right') this.mobileRight = active;
    else if (active && action === 'jump') this.mobileJumpQueued = true;
    else if (active && action === 'dash') this.mobileDashQueued = true;
    else if (active && action === 'attack') this.mobileAttackQueued = true;
  }

  triggerMobileSkill(skillId: string): void {
    if (this.classSkillIds.includes(skillId) && this.ownedSkillIds.includes(skillId)) this.mobileSkillQueue.add(skillId);
  }

  preload(): void {
    const upgradeVfxKey = `quest-upgrade-vfx-${this.characterId}`;
    if (!this.textures.exists(upgradeVfxKey)) {
      this.load.spritesheet(upgradeVfxKey, `/assets/upgrade-vfx/${this.characterId}.png?v=20260714d`, { frameWidth: 256, frameHeight: 256 });
    }
    if (!this.textures.exists('quest-warrior-sheet')) this.load.image('quest-warrior-sheet', '/assets/sprites/hero-v2.png');
    if (!this.textures.exists('quest-spellblade-sheet')) this.load.image('quest-spellblade-sheet', '/assets/home/spellblade.png');
    if (!this.textures.exists('quest-archer-sheet')) this.load.image('quest-archer-sheet', '/assets/home/archer.png');
    if (!this.textures.exists('quest-mage-sheet')) this.load.image('quest-mage-sheet', '/assets/sprites/mage.png');
    if (!this.textures.exists('quest-dualblade-sheet')) this.load.image('quest-dualblade-sheet', '/assets/classes/dualblade-sheet.png');
    if (!this.textures.exists('quest-brawler-sheet')) this.load.image('quest-brawler-sheet', '/assets/classes/brawler-sheet.png');
    if (!this.textures.exists('quest-brawler-jump-sheet')) this.load.image('quest-brawler-jump-sheet', '/assets/classes/brawler-jump-strip.png');
    if (!this.textures.exists('quest-dragonknight-sheet')) this.load.image('quest-dragonknight-sheet', '/assets/classes/dragonknight-sheet.png');
    if (!this.textures.exists('quest-gunslinger-sheet')) this.load.image('quest-gunslinger-sheet', '/assets/classes/gunslinger-sheet.png');
    if (!this.textures.exists('quest-gunslinger-skill-strip')) {
      this.load.spritesheet('quest-gunslinger-skill-strip', '/assets/classes/gunslinger-skill-strip.png?v=20260714d', { frameWidth: 156, frameHeight: 156 });
    }
    ['ssaulabi', 'kickfighter', 'venomancer', 'pyromancer', 'hammerguard', 'axereaver', 'elementalist', 'warlock', 'assettycoon'].forEach((character) => {
      if (!this.textures.exists(`quest-${character}-sheet`)) this.load.image(`quest-${character}-sheet`, `/assets/classes/${character}-sheet.png?v=20260714c`);
    });
    (['run', 'jump', 'skill', 'hit'] as const).forEach((animation) => {
      const textureKey = `quest-kickfighter-${animation}-strip`;
      if (!this.textures.exists(textureKey)) {
        this.load.spritesheet(textureKey, `/assets/classes/kickfighter-${animation}-strip.png?v=20260714c`, { frameWidth: 156, frameHeight: 156 });
      }
    });
    if (!this.textures.exists('quest-goblin-sheet')) this.load.image('quest-goblin-sheet', '/assets/sprites/goblin.png');
    if (!this.textures.exists('quest-boss-sheet')) this.load.image('quest-boss-sheet', '/assets/sprites/boss.png');
    if (!this.textures.exists('political-conservative-sheet')) this.load.spritesheet('political-conservative-sheet', '/assets/political-duel/political-conservative-sheet.png', { frameWidth: 256, frameHeight: 256 });
    if (!this.textures.exists('political-progressive-sheet')) this.load.spritesheet('political-progressive-sheet', '/assets/political-duel/political-progressive-sheet.png', { frameWidth: 256, frameHeight: 256 });
    if (!this.textures.exists('political-reference')) this.load.image('political-reference', '/assets/political-duel/skill-reference.png');
    (['conservative', 'progressive'] as const).forEach((faction) => {
      politicalFighters[faction].skills.forEach((skill) => {
        const skillId = `${faction}-${skill.key.toLowerCase()}`;
        const textureKey = `political-vfx-${skillId}`;
        if (!this.textures.exists(textureKey)) this.load.spritesheet(textureKey, `/assets/political-duel/skill-vfx/${skillId}.png`, { frameWidth: 256, frameHeight: 256 });
      });
    });
    if (!this.textures.exists('quest-warrior-vfx-v2')) this.load.image('quest-warrior-vfx-v2', '/assets/sprites/warrior-vfx-v2.png');
    if (!this.textures.exists('quest-mage-vfx-v2')) this.load.image('quest-mage-vfx-v2', '/assets/sprites/mage-vfx-v2.png');
    if (!this.textures.exists('quest-warrior-hq-vfx')) this.load.spritesheet('quest-warrior-hq-vfx', '/assets/class-skill-vfx/warrior.png?v=20260714e', { frameWidth: 256, frameHeight: 256 });
    if (!this.textures.exists('quest-mage-special-vfx')) this.load.spritesheet('quest-mage-special-vfx', '/assets/class-skill-vfx/mage-special.png?v=20260714e', { frameWidth: 256, frameHeight: 256 });
    if (!this.textures.exists('quest-dragon-breath-vfx')) this.load.spritesheet('quest-dragon-breath-vfx', '/assets/class-skill-vfx/dragon-breath.png?v=20260714e', { frameWidth: 256, frameHeight: 256 });
    ['spellblade', 'archer', 'dualblade', 'brawler', 'gunslinger', 'ssaulabi', 'kickfighter', 'venomancer', 'pyromancer', 'hammerguard', 'axereaver', 'elementalist', 'warlock', 'assettycoon'].forEach((character) => {
      const textureKey = `quest-${character}-ultimate-vfx`;
      if (!this.textures.exists(textureKey)) this.load.spritesheet(textureKey, `/assets/class-skill-vfx/${character}-ultimate.png?v=20260714f`, { frameWidth: 256, frameHeight: 256 });
    });
    ['spellblade', 'archer'].forEach((character) => {
      ['idle', 'run', 'jump', 'attack', 'skill', 'dash'].forEach((pose) => {
        if (!this.textures.exists(`quest-${character}-${pose}`)) this.load.image(`quest-${character}-${pose}`, `/assets/class-poses/${character}-${pose}.png`);
      });
      for (let frame = 0; frame < 4; frame += 1) {
        if (!this.textures.exists(`quest-${character}-run-${frame}`)) this.load.image(`quest-${character}-run-${frame}`, `/assets/class-poses/${character}-run-${frame}.png`);
      }
    });
    ['goblin-warlord', 'mist-wolf', 'rune-golem', 'lava-dragon', 'ice-queen', 'desert-scorpion', 'wind-harpy', 'vampire-lord', 'deep-kraken', 'thunder-minotaur', 'plague-necromancer', 'crystal-hydra', 'clockwork-titan', 'sand-wyrm', 'celestial-griffin', 'void-witch', 'frost-mammoth', 'inferno-phoenix', 'abyss-leviathan', 'avalanche-emperor', 'obsidian-behemoth', 'spectral-broker', 'iron-seraph', 'toxic-singularity', 'solar-devourer', 'gravity-colossus', 'ruin-sovereign', 'chaos-auditor', 'extinction-dragon', 'compound-overlord'].forEach((bossKey) => {
      if (!this.textures.exists(`quest-${bossKey}`)) this.load.spritesheet(`quest-${bossKey}`, `/assets/boss-animation-sheets/${bossKey}.png`, { frameWidth: 256, frameHeight: 256 });
    });
    ['warrior-power-slash', 'warrior-spin-slash', 'warrior-earth-slam', 'warrior-shield', 'warrior-roar', 'mage-missile', 'mage-ice-storm', 'mage-chain-lightning', 'mage-healing-circle', 'mage-meteor'].forEach((effectKey) => {
      if (!this.textures.exists(`quest-${effectKey}`)) this.load.image(`quest-${effectKey}`, `/assets/skill-effects/${effectKey}.png`);
    });
    ['arcane-bolt', 'frost-nova', 'flame-wave', 'healing-light', 'starfall', 'magic-missile', 'ice-storm', 'chain-lightning', 'healing-circle', 'meteor'].forEach((skillId) => {
      if (!this.textures.exists(`quest-enhanced-${skillId}`)) this.load.image(`quest-enhanced-${skillId}`, `/assets/skill-effects-enhanced/${skillId}.png`);
      if (!this.textures.exists(`quest-skill-icon-${skillId}`)) this.load.image(`quest-skill-icon-${skillId}`, `/assets/skills-v2/${skillId}.png`);
    });
    ['arcane-cleave', 'twin-phantom', 'rune-step', 'astral-counter', 'constellation-storm', 'gale-arrow', 'split-shot', 'verdant-snare', 'feather-step', 'emerald-rain'].forEach((skillId) => {
      const version = this.isSpellbladeSkill(skillId) ? '-v2' : '';
      if (!this.textures.exists(`quest-enhanced-${skillId}`)) this.load.image(`quest-enhanced-${skillId}`, `/assets/skill-effects-new/${skillId}${version}.png`);
      if (!this.textures.exists(`quest-skill-icon-${skillId}`)) this.load.image(`quest-skill-icon-${skillId}`, `/assets/skill-effects-new/${skillId}${version}.png`);
    });
    Object.values(innateClasses).flatMap((definition) => definition.skills).forEach((skill) => {
      if (!this.textures.exists(`quest-skill-icon-${skill.id}`)) this.load.image(`quest-skill-icon-${skill.id}`, `/assets/new-class-skills/${skill.id}.png`);
    });
    assetTycoonSkills.forEach((skill) => {
      if (!this.textures.exists(`quest-skill-icon-${skill.id}`)) this.load.image(`quest-skill-icon-${skill.id}`, `/assets/new-class-skills/${skill.id}.png`);
    });
    ['gale-arrow', 'split-shot', 'verdant-snare', 'feather-step', 'emerald-rain'].forEach((skillId) => {
      const textureKey = `quest-archer-vfx-${skillId}`;
      if (!this.textures.exists(textureKey)) this.load.spritesheet(textureKey, `/assets/archer-skill-vfx/${skillId}.png`, { frameWidth: 256, frameHeight: 256 });
    });
    ['arcane-cleave', 'twin-phantom', 'rune-step', 'astral-counter', 'constellation-storm'].forEach((skillId) => {
      const textureKey = `quest-spellblade-vfx-${skillId}`;
      if (!this.textures.exists(textureKey)) this.load.spritesheet(textureKey, `/assets/spellblade-skill-vfx/${skillId}.png`, { frameWidth: 256, frameHeight: 256 });
    });
    ['goblin-warlord', 'mist-wolf', 'rune-golem', 'lava-dragon', 'ice-queen', 'desert-scorpion', 'wind-harpy', 'vampire-lord', 'deep-kraken', 'thunder-minotaur', 'plague-necromancer', 'crystal-hydra', 'clockwork-titan', 'sand-wyrm', 'celestial-griffin', 'void-witch', 'frost-mammoth', 'inferno-phoenix', 'abyss-leviathan', 'avalanche-emperor', 'obsidian-behemoth', 'spectral-broker', 'iron-seraph', 'toxic-singularity', 'solar-devourer', 'gravity-colossus', 'ruin-sovereign', 'chaos-auditor', 'extinction-dragon', 'compound-overlord'].forEach((effectKey) => {
      if (!this.textures.exists(`quest-boss-${effectKey}`)) this.load.image(`quest-boss-${effectKey}`, `/assets/boss-projectiles/${effectKey}.png`);
    });
    if (!this.textures.exists('quest-skill-sheet')) this.load.image('quest-skill-sheet', '/assets/sprites/skills.png');
    const hdStageKey = `quest-stage-hd-${this.stage.number}`;
    if (!this.textures.exists(hdStageKey)) this.load.image(hdStageKey, `/assets/maps-hd/stage-${String(this.stage.number).padStart(2, '0')}.webp`);
    const hdPlatformKey = `quest-platform-hd-${this.stage.number}`;
    if (!this.textures.exists(hdPlatformKey)) this.load.image(hdPlatformKey, `/assets/platforms-hd/stage-${String(this.stage.number).padStart(2, '0')}.png`);
    const hdMinionKey = `quest-minion-hd-${this.stage.number}`;
    if (!this.textures.exists(hdMinionKey)) this.load.spritesheet(hdMinionKey, `/assets/minions-hd/stage-${String(this.stage.number).padStart(2, '0')}.png`, { frameWidth: 256, frameHeight: 256 });
    const hdProjectileKey = `quest-projectile-hd-${this.stage.number}`;
    if (!this.textures.exists(hdProjectileKey)) this.load.spritesheet(hdProjectileKey, `/assets/projectiles-hd/stage-${String(this.stage.number).padStart(2, '0')}.png`, { frameWidth: 256, frameHeight: 256 });
  }

  create(): void {
    this.playerHealth = this.playerMaxHealth;
    this.startedAt = this.time.now;
    this.telemetry.push({ type: 'run-started', elapsedMs: 0 });
    this.cameras.main.setBackgroundColor(this.stage.backgroundColor);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_PHYSICS_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.registerUpgradeVfxAnimation();
    this.registerArcherVfxAnimations();
    this.registerSpellbladeVfxAnimations();
    this.registerHighQualitySkillVfxAnimations();
    this.registerCurrentProjectileAnimation();
    this.createWorld();
    const platforms = this.createPlatforms();
    this.createPlayer(platforms);
    this.createEnemies(platforms);
    this.createHud();
    this.configureInput();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, 520);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(240, 120);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audioDirector.stop());
    this.events.emit('stage-ready');
  }

  update(time: number): void {
    if (this.finished || this.victorySequenceStarted) return;
    if (time - this.startedAt >= 1_200 && this.player.y >= PIT_DEATH_Y) {
      this.recordCheckpoint('fell-into-chasm');
      this.failStage();
      return;
    }
    this.updatePlayerMovement();
    this.updateEnemyMovement();
    this.updateBossSkills(time);
    this.updateBossProjectiles(time);
    this.updatePlayerSkillProjectiles(time);
    this.handleAttack(time);
    this.handlePlayerSkill(time);
    this.handleEnemyContact(time);
    this.updateEquipmentVisuals();
    this.updateSkillCooldownHud(time);
    this.updateObjective();
  }

  private createWorld(): void {
    const mapTexture = `quest-stage-hd-${this.stage.number}`;
    // Preserve the source aspect ratio instead of stretching one bitmap across
    // the whole 5,200px world. Adjacent panels overlap by 100px and a subtle
    // atmospheric veil hides the join while the player scrolls through it.
    const panelWidth = 1120;
    const panelStep = (WORLD_WIDTH - panelWidth) / 4;
    for (let panel = 0; panel < 5; panel += 1) {
      this.add.image(panelWidth / 2 + panel * panelStep, 260, mapTexture)
        .setDisplaySize(panelWidth, 520)
        .setDepth(-10);
      if (panel > 0) {
        this.add.rectangle(panel * panelStep, 260, 112, 520, this.stage.backgroundColor, 0.1)
          .setDepth(-9.8);
      }
    }
    this.add.rectangle(WORLD_WIDTH / 2, 260, WORLD_WIDTH, 520, this.stage.backgroundColor, 0.16).setDepth(-9);
    this.add.rectangle(40, 28, 520, 38, 0x050806, 0.92).setOrigin(0).setStrokeStyle(1, 0xffd98a, 0.55).setScrollFactor(0).setDepth(19);
    this.add.text(52, 38, `${this.stage.worldLabel} // STAGE ${String(this.stage.number).padStart(2, '0')}`, {
      color: '#ffe5a8', fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', letterSpacing: 2, stroke: '#000000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(20);
  }

  private createPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    const platforms = this.physics.add.staticGroup();
    const groundBaseline = 475;
    const addSolidGround = (centerX: number, topY: number, width: number): void => {
      const collisionHeight = WORLD_PHYSICS_HEIGHT - topY;
      const collision = this.add.rectangle(centerX, topY + collisionHeight / 2, width, collisionHeight, this.stage.groundColor, 0);
      this.physics.add.existing(collision, true);
      platforms.add(collision);
    };

    // A safe launch ledge and a continuous boss arena are the only solid
    // ground sections. Every gap between traversal platforms is a real chasm.
    addSolidGround(150, 390, 300);
    this.drawStageStructure(150, 390, 300, 132);

    this.stage.platforms.filter((platform) => platform.x < BOSS_ARENA_START_X - 90).forEach((platform) => {
      const structureHeight = groundBaseline - platform.y;
      const collisionShape = this.add.rectangle(
        platform.x,
        platform.y + 12,
        platform.width,
        24,
        this.stage.groundColor,
        0,
      );
      this.physics.add.existing(collisionShape, true);
      platforms.add(collisionShape);

      this.drawStageStructure(platform.x, platform.y, platform.width, structureHeight);
    });

    const bossArenaWidth = WORLD_WIDTH - BOSS_ARENA_START_X;
    addSolidGround(BOSS_ARENA_START_X + bossArenaWidth / 2, BOSS_ARENA_TOP_Y, bossArenaWidth);
    this.drawStageStructure(BOSS_ARENA_START_X + bossArenaWidth / 2, BOSS_ARENA_TOP_Y, bossArenaWidth, 148);
    return platforms;
  }

  private drawStageStructure(x: number, y: number, width: number, height: number): void {
    const number = this.stage.number;
    const platformTexture = `quest-platform-hd-${number}`;
    if (this.textures.exists(platformTexture)) {
      this.add.image(x, y, platformTexture)
        .setOrigin(0.5, PLATFORM_SURFACE_ORIGIN_Y[number - 1] ?? 0.12)
        .setDisplaySize(width + 18, height + 18)
        .setDepth(2);
      return;
    }

    const visual = this.add.graphics().setPosition(x - width / 2, y).setDepth(1);
    const theme = [1, 2, 11].includes(number) ? 'forest'
      : [3, 6, 14].includes(number) ? 'ruin'
        : [4, 18].includes(number) ? 'volcano'
          : [5, 17].includes(number) ? 'ice'
            : [7, 15].includes(number) ? 'sky'
              : [8, 16, 20].includes(number) ? 'castle'
                : [9, 19].includes(number) ? 'reef'
                  : [10, 13].includes(number) ? 'machine'
                    : 'crystal';
    const dark = Phaser.Display.Color.IntegerToColor(this.stage.groundColor).darken(22).color;
    visual.fillStyle(dark, 0.98).fillRoundedRect(0, 0, width, height + 8, 5);
    visual.fillStyle(this.stage.groundColor, 1).fillRect(5, 8, width - 10, height);
    visual.fillStyle(this.stage.accentColor, 0.78).fillRect(0, 0, width, 7);

    if (theme === 'forest') {
      visual.clear();
      visual.fillStyle(0x49321f, 1).fillRoundedRect(width * 0.34, 8, width * 0.32, height, 12);
      visual.lineStyle(5, 0x76502a, 0.9).lineBetween(width * 0.42, 15, width * 0.38, height).lineBetween(width * 0.57, 12, width * 0.62, height);
      visual.fillStyle(0x244d2b, 1).fillCircle(width * 0.2, 4, 38).fillCircle(width * 0.5, -12, 52).fillCircle(width * 0.8, 3, 40);
      visual.fillStyle(0x3d7138, 0.9).fillCircle(width * 0.36, -18, 32).fillCircle(width * 0.66, -20, 34);
      visual.fillStyle(this.stage.accentColor, 0.6).fillRect(4, -4, width - 8, 7);
    } else if (theme === 'ruin') {
      // Broken stone ruin with battlements.
      for (let block = 0; block < width; block += 34) visual.fillStyle(block % 68 === 0 ? 0x52584f : 0x424940, 1).fillRect(block, 10, 30, 18);
      visual.lineStyle(2, this.stage.accentColor, 0.22);
      for (let seam = 20; seam < width; seam += 30) visual.lineBetween(seam, 34, seam - 7, height - 4);
    } else if (theme === 'machine') {
      // Mine machinery and stacked reinforced crates.
      for (let crateX = 8; crateX < width - 30; crateX += 48) {
        visual.fillStyle(0x5b3a21, 1).fillRect(crateX, 16, 42, 38);
        visual.lineStyle(3, 0xb67b3b, 0.8).strokeRect(crateX, 16, 42, 38).lineBetween(crateX, 16, crateX + 42, 54).lineBetween(crateX + 42, 16, crateX, 54);
      }
    } else if (theme === 'castle') {
      // Fortress wall with glowing arrow slits.
      for (let merlon = 4; merlon < width; merlon += 38) visual.fillStyle(dark, 1).fillRect(merlon, -14, 23, 20);
      for (let slit = 27; slit < width; slit += 52) visual.fillStyle(this.stage.accentColor, 0.9).fillRoundedRect(slit, 28, 8, 30, 4);
    } else if (theme === 'reef') {
      visual.clear();
      visual.fillStyle(0x173d4a, 1).fillRoundedRect(0, 3, width, height + 6, 14);
      for (let coral = 18; coral < width; coral += 38) {
        visual.lineStyle(7, coral % 76 === 18 ? 0xd25f79 : 0x6e7ed8, 0.9).lineBetween(coral, height, coral, 12).lineBetween(coral, 32, coral - 13, 18).lineBetween(coral, 45, coral + 14, 27);
      }
    } else if (theme === 'sky') {
      visual.clear();
      visual.fillStyle(0x596451, 1).fillTriangle(0, 0, width, 0, width * 0.54, height).fillTriangle(0, 0, width * 0.46, height, width, 0);
      visual.fillStyle(0x3f753f, 1).fillRoundedRect(0, -4, width, 18, 8);
      visual.lineStyle(3, 0x69864e, 0.8);
      for (let vine = 22; vine < width; vine += 44) visual.lineBetween(vine, 8, vine + 8, Math.min(height, 65));
    } else if (theme === 'volcano') {
      visual.clear();
      visual.fillStyle(0x251713, 1).fillTriangle(0, height, 24, 0, 62, height).fillTriangle(width - 68, height, width - 30, 0, width, height).fillRect(38, 8, width - 76, height);
      visual.lineStyle(3, 0xff5a32, 0.75);
      for (let crack = 24; crack < width; crack += 43) visual.lineBetween(crack, 10, crack + 12, height * 0.45).lineBetween(crack + 12, height * 0.45, crack + 3, height);
    } else {
      // Ice and crystal stages use translucent natural formations.
      visual.fillStyle(dark, 1).fillTriangle(0, height, 18, 2, 55, height).fillTriangle(width - 62, height, width - 24, 0, width, height);
      for (let shard = 45; shard < width - 30; shard += 48) visual.fillStyle(this.stage.accentColor, 0.35).fillTriangle(shard - 15, height, shard, 12, shard + 18, height);
    }
    // Shared high-detail pass: readable rim lighting, chipped silhouettes and
    // seeded hanging details make every structure feel embedded in its biome.
    visual.lineStyle(2, 0xffffff, 0.16).lineBetween(7, 1, width - 7, 1);
    visual.lineStyle(3, dark, 0.72).lineBetween(4, height, width - 4, height);
    const decorationSeed = Math.floor(x / 37) + number * 19;
    for (let index = 0; index < 5; index += 1) {
      const detailX = 14 + ((decorationSeed * (index + 3) * 17) % Math.max(24, Math.floor(width - 28)));
      const detailHeight = 8 + ((decorationSeed + index * 23) % 22);
      visual.fillStyle(index % 2 === 0 ? this.stage.accentColor : dark, index % 2 === 0 ? 0.48 : 0.85)
        .fillTriangle(detailX - 5, 4, detailX, -detailHeight, detailX + 6, 4);
      if (theme === 'forest' || theme === 'reef' || theme === 'sky') {
        visual.lineStyle(2, this.stage.accentColor, 0.38).lineBetween(detailX, 7, detailX + ((index % 2) * 2 - 1) * 8, Math.min(height, 38 + detailHeight));
      }
    }

  }

  private createPlayer(platforms: Phaser.Physics.Arcade.StaticGroup): void {
    if (isPoliticalCharacter(this.characterId)) this.registerPoliticalClassAssets();
    else if (this.characterId === 'warrior' || this.characterId === 'mage' || isInnateCharacter(this.characterId) || isSecretCharacter(this.characterId)) this.registerHeroFramesAndAnimations();
    this.registerSkillEffectAnimations();
    this.registerClassVfxAnimations();
    const political = isPoliticalCharacter(this.characterId);
    const animated = political || this.characterId === 'warrior' || this.characterId === 'mage' || isInnateCharacter(this.characterId) || isSecretCharacter(this.characterId);
    if (!animated) this.registerNewClassAnimations();
    const textureKey = political ? `political-${this.characterId}-sheet` : animated ? `quest-${this.characterId}-sheet` : `quest-${this.characterId}-idle`;
    const initialFrame = political ? 0 : animated ? `${this.characterId}-idle-0` : undefined;
    this.player = this.physics.add.sprite(120, 300, textureKey, initialFrame);
    if (political) this.player.setScale(0.38);
    else if (animated) this.player.setScale(0.64);
    else this.player.setDisplaySize(92, 100);
    this.player.setCollideWorldBounds(true).setMaxVelocity(560, 560).setDepth(8);
    const body = this.player.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      if (political) body.setSize(82, 140).setOffset(87, 90);
      else if (animated) {
        const expansionFootOffsets: Partial<Record<CharacterId, number>> = {
          ssaulabi: 23,
          kickfighter: 16,
          venomancer: 28,
          pyromancer: 13,
          hammerguard: 6,
          axereaver: 28,
          assettycoon: 19,
        };
        body.setSize(70, 127).setOffset(43, expansionFootOffsets[this.characterId] ?? 23);
      }
      else body.setSize(this.player.width * 0.34, this.player.height * 0.7).setOffset(this.player.width * 0.33, this.player.height * 0.15);
    }
    this.applyEquipmentTint();
    if (animated) this.player.play(`${this.characterId}-idle`);
    this.physics.add.collider(this.player, platforms);
    this.createEquipmentVisuals();
    this.createBasicArrowTexture();
  }

  private createEquipmentVisuals(): void {
    // Equipment upgrades are represented only by transient twinkles. Persistent
    // circles, triangles and drawn armor shapes obscured the character sprite.
    return;
    const defenseLevel = this.defenseLevel + (this.armorEquipped ? 1 : 0) + this.armorLevel;
    if (defenseLevel > 0) {
      const color = this.characterId === 'warrior' ? 0xe0b35a : 0x8f7cff;
      this.armorGlow = this.add.ellipse(this.player.x, this.player.y + 5, 86, 112, color, Math.min(0.1 + defenseLevel * 0.035, 0.28)).setStrokeStyle(2 + defenseLevel * 0.35, color, 0.7).setDepth(7);
      this.armorOverlay = this.add.graphics().setDepth(9);
      if (this.characterId === 'warrior') {
        this.armorOverlay.fillStyle(0xd8c08a, 0.72).fillCircle(-24, -18, 9).fillCircle(24, -18, 9);
        this.armorOverlay.fillStyle(defenseLevel >= 4 ? 0xd3a441 : 0x8293a3, 0.55).fillRoundedRect(-18, -13, 36, 39, 7);
        this.armorOverlay.lineStyle(2, 0xffe5a3, 0.75).strokeRoundedRect(-18, -13, 36, 39, 7);
        if (defenseLevel >= 2) this.armorOverlay.fillStyle(0xb08a49, 0.9).fillTriangle(-28, -27, -13, -41, -7, -20).fillTriangle(28, -27, 13, -41, 7, -20);
        if (defenseLevel >= 3) this.armorOverlay.lineStyle(4, 0xf2c66d, 0.85).strokeCircle(0, 3, 24);
        if (defenseLevel >= 4) this.armorOverlay.fillStyle(0x8e2d22, 0.78).fillTriangle(-21, 17, -38, 51, -6, 31).fillTriangle(21, 17, 38, 51, 6, 31);
        if (defenseLevel >= 5) this.armorOverlay.lineStyle(3, 0xffffff, 0.95).strokeTriangle(0, -31, -17, 19, 17, 19);
      } else {
        this.armorOverlay.lineStyle(3, 0xb8a7ff, 0.78).strokeCircle(0, 2, 34);
        this.armorOverlay.lineStyle(1, 0x76d7ff, 0.7).strokeTriangle(0, -37, -31, 22, 31, 22);
        this.armorOverlay.fillStyle(0x8f7cff, 0.35).fillCircle(-23, -18, 8).fillCircle(23, -18, 8);
        if (defenseLevel >= 2) this.armorOverlay.lineStyle(3, 0x76d7ff, 0.9).strokeCircle(0, -8, 25);
        if (defenseLevel >= 3) this.armorOverlay.fillStyle(0x50358f, 0.52).fillTriangle(-31, 12, 0, 53, 31, 12);
        if (defenseLevel >= 4) this.armorOverlay.lineStyle(3, 0xd8c7ff, 0.9).strokeTriangle(0, -48, -39, 28, 39, 28);
        if (defenseLevel >= 5) this.armorOverlay.fillStyle(0xffffff, 0.92).fillCircle(0, -13, 6);
      }
    }
    if (this.attackLevel + this.armorLevel > 0) {
      const color = this.characterId === 'warrior' ? 0xffb52e : 0x8c6cff;
      const weaponLevel = this.attackLevel + this.armorLevel;
      this.weaponGlow = this.add.ellipse(this.player.x, this.player.y, 42 + weaponLevel * 5, 20 + weaponLevel * 2, color, Math.min(0.18 + weaponLevel * 0.05, 0.52)).setDepth(10);
    }
  }

  private updateEquipmentVisuals(): void {
    if (this.classBuffAura?.active) {
      this.classBuffAura.setPosition(this.player.x, this.player.y + 18);
      if (this.time.now >= this.classPowerUntil) {
        this.classBuffAura.destroy();
        this.classBuffAura = undefined;
      }
    }
    const totalUpgradeLevel = this.attackLevel + this.vitalityLevel + this.defenseLevel + this.armorLevel;
    if (!this.equipmentParticlesEnabled || totalUpgradeLevel <= 0) {
      this.upgradeParticle?.destroy();
      this.upgradeParticle = undefined;
      return;
    }
    if (!this.upgradeParticle?.active) this.upgradeParticle = this.createUpgradeParticle(totalUpgradeLevel);
    this.upgradeParticle.setPosition(this.player.x + UPGRADE_PARTICLE_OFFSET_X, this.player.y).setDepth(totalUpgradeLevel >= 5 ? 7 : 14).setVisible(true);
    if (!this.upgradeParticle.anims.isPlaying) this.upgradeParticle.play(`upgrade-vfx-${this.characterId}`);
  }

  setEquipmentParticlesEnabled(enabled: boolean): void {
    this.equipmentParticlesEnabled = enabled;
    if (!enabled) {
      this.upgradeParticle?.destroy();
      this.upgradeParticle = undefined;
    }
  }

  private registerUpgradeVfxAnimation(): void {
    const textureKey = `quest-upgrade-vfx-${this.characterId}`;
    const animationKey = `upgrade-vfx-${this.characterId}`;
    if (this.anims.exists(animationKey)) return;
    this.anims.create({
      key: animationKey,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 15 }),
      frameRate: 18,
      repeat: -1,
    });
    const castAnimationKey = `class-cast-vfx-${this.characterId}`;
    if (!this.anims.exists(castAnimationKey)) {
      this.anims.create({
        key: castAnimationKey,
        frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 15 }),
        frameRate: 26,
        repeat: 0,
      });
    }
  }

  private registerHighQualitySkillVfxAnimations(): void {
    const warriorSkills = ['arcane-bolt', 'frost-nova', 'flame-wave', 'healing-light', 'starfall'] as const;
    warriorSkills.forEach((skillId, row) => {
      const key = `warrior-hq-${skillId}`;
      if (!this.anims.exists(key)) this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('quest-warrior-hq-vfx', { start: row * 4, end: row * 4 + 3 }),
        frameRate: skillId === 'starfall' ? 4 : skillId === 'healing-light' ? 6 : skillId === 'arcane-bolt' ? 10 : 8,
        repeat: 0,
      });
    });
    if (!this.anims.exists('mage-hq-grand-meteor')) this.anims.create({
      key: 'mage-hq-grand-meteor', frames: this.anims.generateFrameNumbers('quest-mage-special-vfx', { start: 0, end: 7 }), frameRate: 11, repeat: 0,
    });
    if (!this.anims.exists('mage-hq-violet-judgment')) this.anims.create({
      key: 'mage-hq-violet-judgment', frames: this.anims.generateFrameNumbers('quest-mage-special-vfx', { start: 8, end: 15 }), frameRate: 11, repeat: 0,
    });
    if (!this.anims.exists('dragon-hq-cataclysm-breath')) this.anims.create({
      key: 'dragon-hq-cataclysm-breath', frames: this.anims.generateFrameNumbers('quest-dragon-breath-vfx', { start: 0, end: 7 }), frameRate: 5, repeat: 0,
    });
    ['spellblade', 'archer', 'dualblade', 'brawler', 'gunslinger', 'ssaulabi', 'kickfighter', 'venomancer', 'pyromancer', 'hammerguard', 'axereaver', 'elementalist', 'warlock', 'assettycoon'].forEach((character) => {
      const animationKey = `${character}-hq-ultimate`;
      if (!this.anims.exists(animationKey)) this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(`quest-${character}-ultimate-vfx`, { start: 0, end: 7 }),
        frameRate: 6,
        repeat: 0,
      });
    });
  }

  private registerArcherVfxAnimations(): void {
    ['gale-arrow', 'split-shot', 'verdant-snare', 'feather-step', 'emerald-rain'].forEach((skillId) => {
      const animationKey = `archer-vfx-${skillId}`;
      if (this.anims.exists(animationKey)) return;
      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(`quest-archer-vfx-${skillId}`, { start: 0, end: 15 }),
        frameRate: skillId === 'feather-step' ? 22 : 28,
        repeat: skillId === 'gale-arrow' || skillId === 'split-shot' || skillId === 'feather-step' ? -1 : 0,
      });
    });
  }

  private registerSpellbladeVfxAnimations(): void {
    ['arcane-cleave', 'twin-phantom', 'rune-step', 'astral-counter', 'constellation-storm'].forEach((skillId) => {
      const animationKey = `spellblade-vfx-${skillId}`;
      if (this.anims.exists(animationKey)) return;
      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(`quest-spellblade-vfx-${skillId}`, { start: 0, end: 15 }),
        frameRate: skillId === 'astral-counter' ? 22 : 28,
        repeat: skillId === 'astral-counter' ? -1 : 0,
      });
    });
  }

  private createUpgradeParticle(totalUpgradeLevel: number): Phaser.GameObjects.Sprite {
    const textureKey = `quest-upgrade-vfx-${this.characterId}`;
    const animationKey = `upgrade-vfx-${this.characterId}`;
    const intensity = Phaser.Math.Clamp(totalUpgradeLevel / MAX_TOTAL_EQUIPMENT_UPGRADE_LEVEL, 0, 1);
    const muted = Phaser.Display.Color.ValueToColor(0x68716c);
    const vivid = Phaser.Display.Color.ValueToColor(0xffffff);
    const tintColor = Phaser.Display.Color.Interpolate.ColorWithColor(muted, vivid, 100, Math.round(intensity * 100));
    const tint = Phaser.Display.Color.GetColor(tintColor.r, tintColor.g, tintColor.b);
    const auraProgress = Phaser.Math.Clamp((totalUpgradeLevel - 5) / (MAX_TOTAL_EQUIPMENT_UPGRADE_LEVEL - 5), 0, 1);
    const width = totalUpgradeLevel >= 5 ? 112 + auraProgress * 70 : 42 + intensity * 54;
    const height = totalUpgradeLevel >= 5 ? 132 + auraProgress * 88 : width;
    return this.add.sprite(this.player.x + UPGRADE_PARTICLE_OFFSET_X, this.player.y, textureKey, 0)
      .setDisplaySize(width, height)
      .setDepth(totalUpgradeLevel >= 5 ? 7 : 14)
      .setTint(tint)
      .setAlpha(0.3 + intensity * 0.54)
      .play(animationKey);
  }

  private spawnCrossTwinkle(x: number, y: number, color: number, strength: number): void {
    const horizontal = this.add.rectangle(0, 0, 24, 3, color, 0.96);
    const vertical = this.add.rectangle(0, 0, 3, 24, color, 0.96);
    const core = this.add.rectangle(0, 0, 5, 5, 0xffffff, 1);
    const twinkle = this.add.container(x, y, [horizontal, vertical, core])
      .setDepth(15)
      .setScale(0.12)
      .setAngle(Phaser.Math.Between(-12, 12));
    this.tweens.add({
      targets: twinkle,
      scale: strength,
      angle: twinkle.angle + 45,
      duration: 150,
      yoyo: true,
      hold: 65,
      ease: 'Sine.Out',
      onComplete: () => twinkle.destroy(),
    });
  }

  private spawnSkillImpactBurst(x: number, y: number, color: number, strength = 1): void {
    const glow = this.add.circle(x, y, 18 * strength, color, 0.42).setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add.ellipse(x, y + 18 * strength, 62 * strength, 22 * strength, color, 0.08)
      .setStrokeStyle(4, color, 0.9)
      .setDepth(14)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 3.2, alpha: 0, duration: 420, ease: 'Cubic.Out', onComplete: () => glow.destroy() });
    this.tweens.add({ targets: ring, scaleX: 2.4, scaleY: 1.65, alpha: 0, duration: 520, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10 + Phaser.Math.FloatBetween(-0.12, 0.12);
      const shard = this.add.rectangle(x, y, 14 * strength, 3 * strength, color, 0.92)
        .setDepth(16)
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * 82 * strength,
        y: y + Math.sin(angle) * 58 * strength,
        alpha: 0,
        scaleX: 0.35,
        duration: 460,
        ease: 'Cubic.Out',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private spawnClassCastHalo(color: number, strength = 1): void {
    const x = this.player.x;
    const y = this.player.y;
    const groundRing = this.add.ellipse(x, y + 43, 104 * strength, 30 * strength, color, 0.1)
      .setStrokeStyle(4, color, 0.92)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);
    const verticalRing = this.add.ellipse(x, y - 4, 68 * strength, 118 * strength, color, 0.04)
      .setStrokeStyle(3, color, 0.68)
      .setDepth(10)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: groundRing,
      scaleX: 1.85,
      scaleY: 1.45,
      angle: 95,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.Out',
      onComplete: () => groundRing.destroy(),
    });
    this.tweens.add({
      targets: verticalRing,
      scaleX: 1.45,
      scaleY: 1.2,
      angle: -180,
      alpha: 0,
      duration: 680,
      ease: 'Sine.Out',
      onComplete: () => verticalRing.destroy(),
    });
  }

  private applyEquipmentTint(): void {
    this.player.clearTint();
    return;
    const defenseLevel = this.defenseLevel + (this.armorEquipped ? 1 : 0) + this.armorLevel;
    if (defenseLevel <= 0) return;
    if (this.characterId === 'warrior') this.player.setTint(defenseLevel >= 4 ? 0xffdfa0 : 0xd5e4ef);
    else this.player.setTint(defenseLevel >= 4 ? 0xc9b3ff : 0xd9d3ff);
  }

  private bossAnimationKey(name: 'idle' | 'move' | 'jump' | 'attack' | 'hit' | 'death'): string {
    return `boss-${this.bossAssetKey}-${name}`;
  }

  private registerCurrentBossAnimations(): void {
    const textureKey = `quest-${this.bossAssetKey}`;
    const definitions = [
      { name: 'idle', frames: [0, 1], rate: 3, repeat: -1 },
      { name: 'move', frames: [2, 0, 2, 1], rate: 6, repeat: -1 },
      { name: 'jump', frames: [3], rate: 2, repeat: 0 },
      { name: 'attack', frames: [4, 5, 6], rate: 9, repeat: 0 },
      { name: 'hit', frames: [7], rate: 3, repeat: 0 },
      { name: 'death', frames: [7], rate: 2, repeat: 0 },
    ] as const;
    definitions.forEach((definition) => {
      const key = this.bossAnimationKey(definition.name);
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: definition.frames.map((frame) => ({ key: textureKey, frame })),
        frameRate: definition.rate,
        repeat: definition.repeat,
      });
    });
  }

  private minionAnimationKey(name: 'idle' | 'walk' | 'attack' | 'hit' | 'death'): string {
    return `minion-${this.stage.number}-${name}`;
  }

  private registerCurrentMinionAnimations(): void {
    const textureKey = `quest-minion-hd-${this.stage.number}`;
    const definitions = [
      { name: 'idle', frames: [0], rate: 2, repeat: -1 },
      { name: 'walk', frames: [0, 1], rate: 6, repeat: -1 },
      { name: 'attack', frames: [1, 2], rate: 9, repeat: 0 },
      { name: 'hit', frames: [3], rate: 3, repeat: 0 },
      { name: 'death', frames: [3], rate: 2, repeat: 0 },
    ] as const;
    definitions.forEach((definition) => {
      const key = this.minionAnimationKey(definition.name);
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: definition.frames.map((frame) => ({ key: textureKey, frame })),
        frameRate: definition.rate,
        repeat: definition.repeat,
      });
    });
  }

  private registerCurrentProjectileAnimation(): void {
    const key = `projectile-hd-${this.stage.number}`;
    if (this.anims.exists(key)) return;
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(`quest-projectile-hd-${this.stage.number}`, { start: 0, end: 3 }),
      frameRate: 12,
      repeat: -1,
    });
  }

  private createHostileProjectile(x: number, y: number, width: number, height = width): Phaser.Physics.Arcade.Sprite {
    const projectile = this.physics.add.sprite(x, y, `quest-projectile-hd-${this.stage.number}`, 0)
      .setDisplaySize(width, height)
      .setDepth(10)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play(`projectile-hd-${this.stage.number}`);
    projectile.body?.setAllowGravity(false);
    return projectile;
  }

  private createEnemies(platforms: Phaser.Physics.Arcade.StaticGroup): void {
    this.registerEnemyFramesAndAnimations();
    this.registerCurrentBossAnimations();
    this.registerCurrentMinionAnimations();
    this.stage.enemies.forEach((definition) => {
      if (!definition.boss && definition.x >= BOSS_ARENA_START_X - 90) return;
      const bossUsesAnimatedSheet = true;
      const textureKey = definition.boss ? `quest-${this.bossAssetKey}` : `quest-minion-hd-${this.stage.number}`;
      const sprite = this.physics.add.sprite(definition.x, definition.y, textureKey, 0);
      sprite.setScale(definition.boss ? BOSS_VISUAL_SCALE : 0.42).setCollideWorldBounds(true).setBounce(0.05).setDepth(7);
      const body = sprite.body;
      if (body instanceof Phaser.Physics.Arcade.Body) {
        if (definition.boss && bossUsesAnimatedSheet) body.setSize(118, 184).setOffset(69, 50);
        else if (definition.boss) body.setSize(180, 260).setOffset(38, 34);
        else body.setSize(86, 178).setOffset(85, 70);
      }
      if (definition.boss && bossUsesAnimatedSheet) sprite.play(this.bossAnimationKey('idle'));
      else if (!definition.boss) sprite.play(this.minionAnimationKey('idle'));
      if (definition.boss) sprite.setTint(this.bossTint);
      sprite.setVisible(false).setAlpha(0);
      if (body instanceof Phaser.Physics.Arcade.Body) body.enable = false;
      this.physics.add.collider(sprite, platforms);
      const healthBar = this.add.rectangle(definition.x, definition.y - (definition.boss ? 128 : 40), definition.boss ? 138 : 44, 7, 0xdfff62).setDepth(9).setVisible(false);
      this.enemies.push({
        id: definition.id, sprite, health: definition.health, maxHealth: definition.health,
        speed: definition.speed,
        leftBound: definition.left,
        rightBound: definition.boss ? definition.right : Math.min(definition.right, BOSS_ARENA_START_X - 90),
        direction: -1, boss: definition.boss, healthBar,
        nextSkillAt: this.time.now + this.bossSkillCooldownMs,
        nextJumpAt: this.time.now + 2_400,
        nextAttackAt: this.time.now + Phaser.Math.Between(500, 1_200),
        patternIndex: (this.stage.number - 1) % 5,
        bossMotion: definition.boss ? 'idle' : 'move',
        bossMotionUntil: 0,
        actionLockedUntil: 0,
        revealed: false,
      });
    });
  }

  private createHud(): void {
    this.add.rectangle(998, 42, 224, 72, 0x07100b, 0.86).setStrokeStyle(1, 0xffffff, 0.18).setScrollFactor(0).setDepth(19);
    this.add.text(892, 12, 'VITALITY', { color: '#d8e1da', fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', backgroundColor: '#07100bcc' }).setPadding(4, 2).setScrollFactor(0).setDepth(21);
    this.add.rectangle(998, 38, 200, 10, 0x27302b).setScrollFactor(0).setDepth(20);
    this.healthBar = this.add.rectangle(898, 38, 200, 10, 0xdfff62).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
    this.objectiveText = this.add.text(1102, 51, '', { color: '#f1ffb8', fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', align: 'right', backgroundColor: '#07100bcc' }).setOrigin(1, 0).setPadding(4, 2).setScrollFactor(0).setDepth(21);
    this.add.rectangle(1032, 88, 150, 26, 0x07100b, 0.88).setStrokeStyle(1, 0xd0a55f, 0.65).setScrollFactor(0).setDepth(19);
    this.add.text(1098, 80, `AQT ${Number(this.aqtBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, { color: '#ffe09a', fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
    const classSkillIds = this.classSkillIds;
    const political = isPoliticalCharacter(this.characterId);
    const secret = isSecretCharacter(this.characterId);
    const elementalist = this.characterId === 'elementalist';
    const expanded = political || secret || elementalist;
    const keyLabels = secret
      ? ['Q', 'W', 'E', 'R', 'Z', 'X', 'C', 'V', 'T']
      : elementalist
        ? ['Q', 'W', 'E', 'R', 'T', 'Z', 'X', 'C', 'V']
        : political
          ? ['Q', 'W', 'E', 'R', 'Z', 'X', 'C', 'V']
          : ['Q', 'W', 'E', 'R', 'T'];
    const cardWidth = expanded ? 56 : 62;
    const cardGap = expanded ? 62 : 68;
    const hudWidth = cardWidth + Math.max(0, classSkillIds.length - 1) * cardGap;
    const hudStartX = (this.scale.width - hudWidth) / 2;
    classSkillIds.forEach((skillId, index) => {
      const x = hudStartX + index * cardGap;
      const owned = this.ownedSkillIds.includes(skillId);
      this.add.rectangle(x + cardWidth / 2, 482, cardWidth, 68, 0x07100b, 0.9).setStrokeStyle(1, owned ? this.stage.accentColor : 0x4d514d, owned ? 0.72 : 0.42).setScrollFactor(0).setDepth(19);
      this.add.image(x + 29, 473, political ? 'political-reference' : `quest-skill-icon-${skillId}`, political ? `political-stage-${skillId}` : undefined).setDisplaySize(political ? 40 : 44, 44).setAlpha(owned ? 1 : 0.28).setScrollFactor(0).setDepth(20);
      this.add.text(x + 5, 451, keyLabels[index] ?? '', { color: owned ? '#fff0bd' : '#777b76', fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', backgroundColor: '#0b110d' }).setPadding(3, 1).setScrollFactor(0).setDepth(22);
      const fill = this.add.rectangle(x + 5, 508, SKILL_COOLDOWN_BAR_WIDTH, 5, this.stage.accentColor, 0.9).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
      const label = this.add.text(x + 29, 488, owned ? 'READY' : 'LOCKED', { color: '#ffffff', fontFamily: 'monospace', fontSize: '8px', fontStyle: 'bold', align: 'center', backgroundColor: '#00000099' }).setOrigin(0.5).setPadding(3, 1).setScrollFactor(0).setDepth(22);
      this.skillCooldownBars.set(skillId, { fill, label });
    });
    this.updateObjective();
  }

  private updateSkillCooldownHud(time: number): void {
    this.skillCooldownBars.forEach(({ fill, label }, skillId) => {
      const owned = this.ownedSkillIds.includes(skillId);
      const cooldown = this.skillCooldownMs(skillId);
      const elapsed = time - (this.lastSkillAt.get(skillId) ?? Number.NEGATIVE_INFINITY);
      const ratio = owned ? Phaser.Math.Clamp(elapsed / cooldown, 0, 1) : 0;
      fill.width = SKILL_COOLDOWN_BAR_WIDTH * ratio;
      fill.setFillStyle(ratio >= 1 ? 0x8eea68 : this.stage.accentColor, owned ? 0.9 : 0.2);
      label.setText(!owned ? 'LOCKED' : ratio >= 1 ? 'READY' : `${Math.max(0, (cooldown - elapsed) / 1000).toFixed(1)}s`);
    });
  }

  private configureInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable');
    this.cursors = keyboard.createCursorKeys();
    this.attackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.dashKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    const skillIds = this.classSkillIds;
    const keyCodes = isSecretCharacter(this.characterId) || this.characterId === 'elementalist'
      ? [Phaser.Input.Keyboard.KeyCodes.Q, Phaser.Input.Keyboard.KeyCodes.W, Phaser.Input.Keyboard.KeyCodes.E, Phaser.Input.Keyboard.KeyCodes.R, Phaser.Input.Keyboard.KeyCodes.Z, Phaser.Input.Keyboard.KeyCodes.X, Phaser.Input.Keyboard.KeyCodes.C, Phaser.Input.Keyboard.KeyCodes.V, Phaser.Input.Keyboard.KeyCodes.T]
      : isPoliticalCharacter(this.characterId)
      ? [Phaser.Input.Keyboard.KeyCodes.Q, Phaser.Input.Keyboard.KeyCodes.W, Phaser.Input.Keyboard.KeyCodes.E, Phaser.Input.Keyboard.KeyCodes.R, Phaser.Input.Keyboard.KeyCodes.Z, Phaser.Input.Keyboard.KeyCodes.X, Phaser.Input.Keyboard.KeyCodes.C, Phaser.Input.Keyboard.KeyCodes.V]
      : [Phaser.Input.Keyboard.KeyCodes.Q, Phaser.Input.Keyboard.KeyCodes.W, Phaser.Input.Keyboard.KeyCodes.E, Phaser.Input.Keyboard.KeyCodes.R, Phaser.Input.Keyboard.KeyCodes.T];
    this.skillKeys = Object.fromEntries(skillIds.map((skillId, index) => [skillId, keyboard.addKey(keyCodes[index] ?? Phaser.Input.Keyboard.KeyCodes.Q)])) as Readonly<Record<string, Phaser.Input.Keyboard.Key>>;
    keyboard.once('keydown', () => void this.audioDirector.unlock());
    this.input.once('pointerdown', () => void this.audioDirector.unlock());
  }

  private updatePlayerMovement(): void {
    const time = this.time.now;
    this.stabilizePlayerVisualSize();
    const dashRequested = Phaser.Input.Keyboard.JustDown(this.dashKey) || this.mobileDashQueued;
    this.mobileDashQueued = false;
    if (dashRequested && time - this.lastDashAt >= DASH_COOLDOWN_MS) {
      this.lastDashAt = time;
      this.dashUntil = time + DASH_DURATION_MS;
    }
    if (time < this.dashUntil) {
      this.player.setVelocityX((this.player.flipX ? -1 : 1) * DASH_SPEED);
      this.playPlayerAnimation('dash');
      if (time - this.lastDashTrailAt >= 45) {
        this.lastDashTrailAt = time;
        const trailColor = this.characterId === 'warrior' ? 0x8e8175 : this.skillAccentColor;
        const trail = this.add.ellipse(this.player.x + (this.player.flipX ? 34 : -34), this.player.y + 38, 58, 16, trailColor, 0.42).setDepth(5);
        this.tweens.add({ targets: trail, alpha: 0, scaleX: 1.8, duration: 180, onComplete: () => trail.destroy() });
      }
      return;
    }
    const movementSpeed = time < this.classPowerUntil ? this.classMovementSpeed : 225;
    if (this.cursors.left.isDown || this.mobileLeft) this.player.setVelocityX(-movementSpeed).setFlipX(true);
    else if (this.cursors.right.isDown || this.mobileRight) this.player.setVelocityX(movementSpeed).setFlipX(false);
    else this.player.setVelocityX(0);
    const body = this.player.body;
    if (body instanceof Phaser.Physics.Arcade.Body && body.blocked.down) this.jumpsRemaining = 2;
    const jumpRequested = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.mobileJumpQueued;
    this.mobileJumpQueued = false;
    if (body instanceof Phaser.Physics.Arcade.Body && jumpRequested && this.jumpsRemaining > 0) {
      this.player.setVelocityY(-420);
      this.jumpsRemaining -= 1;
    }
    if (time < this.playerPoseLockedUntil) return;
    if ((this.player.anims.currentAnim?.key === `${this.characterId}-attack` || this.player.anims.currentAnim?.key === `${this.characterId}-skill` || this.player.anims.currentAnim?.key === `${this.characterId}-hit`) && this.player.anims.isPlaying) return;
    if (body instanceof Phaser.Physics.Arcade.Body && !body.blocked.down) this.playPlayerAnimation('jump');
    else if (Math.abs(this.player.body?.velocity.x ?? 0) > 190) this.playPlayerAnimation('run');
    else if (Math.abs(this.player.body?.velocity.x ?? 0) > 18) this.playPlayerAnimation('walk');
    else this.playPlayerAnimation('idle');
  }

  private updateEnemyMovement(): void {
    this.enemies.forEach((enemy) => {
      if (enemy.health <= 0) return;
      if (!enemy.revealed) {
        if (Math.abs(this.player.x - enemy.sprite.x) <= (enemy.boss ? 760 : 680)) this.revealEnemy(enemy);
        else return;
      }
      if (!enemy.boss && enemy.sprite.x <= enemy.leftBound) {
        enemy.sprite.setX(enemy.leftBound).setVelocityX(Math.max(0, enemy.sprite.body?.velocity.x ?? 0));
        enemy.direction = 1;
      } else if (!enemy.boss && enemy.sprite.x >= enemy.rightBound) {
        enemy.sprite.setX(enemy.rightBound).setVelocityX(Math.min(0, enemy.sprite.body?.velocity.x ?? 0));
        enemy.direction = -1;
      }
      if (!enemy.boss && this.time.now < enemy.actionLockedUntil) {
        enemy.sprite.setFlipX(this.player.x < enemy.sprite.x);
        enemy.healthBar.setPosition(enemy.sprite.x, enemy.sprite.y - 34);
        return;
      }
      if (enemy.boss && Math.abs(this.player.x - enemy.sprite.x) <= BOSS_AGGRO_RANGE) {
        if (this.time.now < enemy.actionLockedUntil) {
          enemy.sprite.setVelocityX(0);
          this.applyBossMotion(enemy);
          enemy.healthBar.setPosition(enemy.sprite.x, enemy.sprite.y - 138);
          return;
        }
        const distanceX = this.player.x - enemy.sprite.x;
        const direction = Math.sign(distanceX) || enemy.direction;
        enemy.direction = direction > 0 ? 1 : -1;
        const enragedSpeed = enemy.health <= enemy.maxHealth / 2 ? 1.35 : 1;
        const body = enemy.sprite.body;
        if (body instanceof Phaser.Physics.Arcade.Body && body.blocked.down && this.time.now >= enemy.nextJumpAt) {
          enemy.sprite.setVelocityY(-360 - Math.min(this.stage.number * 7, 120));
          enemy.bossMotion = 'jump';
          enemy.bossMotionUntil = this.time.now + 520;
          enemy.nextJumpAt = this.time.now + Math.max(1_250, 3_400 - this.stage.number * 85);
        }
        const distance = Math.abs(distanceX);
        const shouldChase = distance > BOSS_PREFERRED_RANGE;
        const shouldRetreat = distance < 135;
        const movementDirection = shouldRetreat ? -enemy.direction : enemy.direction;
        enemy.sprite.setVelocityX(shouldChase || shouldRetreat ? enemy.speed * movementDirection * enragedSpeed : 0);
        // Every v3 boss source faces left. Flip only when the player is to its right.
        enemy.sprite.setFlipX(enemy.direction > 0);
        if (this.time.now >= enemy.bossMotionUntil) enemy.bossMotion = shouldChase || shouldRetreat ? 'move' : 'idle';
        this.applyBossMotion(enemy);
        enemy.healthBar.setPosition(enemy.sprite.x, enemy.sprite.y - 138);
        return;
      }
      if (enemy.sprite.x <= enemy.leftBound) enemy.direction = 1;
      if (enemy.sprite.x >= enemy.rightBound) enemy.direction = -1;
      const playerDistance = Math.abs(this.player.x - enemy.sprite.x);
      if (playerDistance <= 410 && this.time.now >= enemy.nextSkillAt) {
        this.castMinionSkill(enemy);
        enemy.nextSkillAt = this.time.now + Math.max(1_350, 2_850 - this.stage.number * 42) + Phaser.Math.Between(0, 520);
        enemy.healthBar.setPosition(enemy.sprite.x, enemy.sprite.y - 40);
        return;
      }
      if (!enemy.boss && playerDistance < 92 && this.time.now >= enemy.nextAttackAt) {
        const attackDirection = this.player.x >= enemy.sprite.x ? 1 : -1;
        enemy.nextAttackAt = this.time.now + Phaser.Math.Between(850, 1_250);
        enemy.sprite.setVelocityX(attackDirection * 185).setFlipX(attackDirection < 0);
        enemy.sprite.play(this.minionAnimationKey('attack'), true);
        this.spawnEnemyAttackEffect(enemy.sprite.x, enemy.sprite.y, attackDirection);
      } else {
        enemy.sprite.setVelocityX(enemy.speed * enemy.direction).setFlipX(this.player.x < enemy.sprite.x);
      }
      if (enemy.boss && this.usesAnimatedBossSheet) {
        enemy.bossMotion = 'move';
        this.applyBossMotion(enemy);
      }
      else if (!enemy.boss) enemy.sprite.play(this.minionAnimationKey('walk'), true);
      enemy.healthBar.setPosition(enemy.sprite.x, enemy.sprite.y - (enemy.boss ? 138 : 34));
    });
  }

  private revealEnemy(enemy: EnemyState): void {
    enemy.revealed = true;
    const body = enemy.sprite.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.enable = true;
      body.reset(enemy.sprite.x, enemy.sprite.y);
    }
    enemy.sprite.setVisible(true).setAlpha(0);
    enemy.healthBar.setVisible(true).setAlpha(0);
    const portalRadius = enemy.boss ? 92 : 48;
    const portal = this.add.ellipse(enemy.sprite.x, enemy.sprite.y + (enemy.boss ? 78 : 42), portalRadius * 2, portalRadius * 0.48, this.stage.accentColor, 0.16)
      .setStrokeStyle(enemy.boss ? 6 : 3, this.stage.accentColor, 0.95)
      .setDepth(6)
      .setBlendMode(Phaser.BlendModes.ADD);
    const flare = this.add.circle(enemy.sprite.x, enemy.sprite.y, enemy.boss ? 42 : 22, this.stage.accentColor, 0.62)
      .setDepth(12)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: enemy.sprite, alpha: 1, duration: enemy.boss ? 720 : 420, ease: 'Cubic.Out' });
    this.tweens.add({ targets: enemy.healthBar, alpha: 1, duration: 420, delay: 220 });
    this.tweens.add({ targets: portal, scaleX: 1.85, scaleY: 1.35, alpha: 0, duration: enemy.boss ? 920 : 560, ease: 'Cubic.Out', onComplete: () => portal.destroy() });
    this.tweens.add({ targets: flare, scale: enemy.boss ? 4.2 : 2.8, alpha: 0, duration: enemy.boss ? 760 : 480, ease: 'Cubic.Out', onComplete: () => flare.destroy() });
    if (enemy.boss) {
      this.audioDirector.setBossIntensity(true);
      this.cameras.main.shake(360, 0.008);
      this.cameras.main.flash(180, 40, 40, 70, false);
    }
  }

  private castMinionSkill(enemy: EnemyState): void {
    const direction: -1 | 1 = this.player.x >= enemy.sprite.x ? 1 : -1;
    const skillDecks = [
      [0, 1, 4, 3],
      [2, 0, 5, 1],
      [4, 6, 0, 2],
      [7, 3, 1, 6],
      [5, 2, 4, 7],
    ] as const;
    const deck = skillDecks[(this.stage.number - 1) % skillDecks.length] ?? skillDecks[0];
    const pattern = deck[(enemy.patternIndex + Math.floor((this.stage.number - 1) / 5)) % deck.length] ?? 0;
    enemy.patternIndex += 1;
    enemy.sprite.play(this.minionAnimationKey('attack'), true).setFlipX(direction < 0);
    if (pattern === 0) {
      this.fireMinionProjectile(enemy, 0);
      return;
    }
    if (pattern === 1) {
      enemy.actionLockedUntil = this.time.now + 360;
      enemy.sprite.setVelocityX(direction * (310 + this.stage.number * 7));
      this.spawnEnemyAttackEffect(enemy.sprite.x, enemy.sprite.y, direction);
      return;
    }
    if (pattern === 2) {
      enemy.actionLockedUntil = this.time.now + 520;
      enemy.sprite.setVelocity(direction * (155 + this.stage.number * 3), -330 - Math.min(this.stage.number * 5, 90));
      this.time.delayedCall(290, () => {
        if (enemy.health > 0) this.dropBossProjectile(this.player.x + Phaser.Math.Between(-45, 45));
      });
      return;
    }
    if (pattern === 3) {
      [-0.2, 0, 0.2].forEach((angle, index) => this.time.delayedCall(index * 85, () => {
        if (enemy.health > 0) this.fireMinionProjectile(enemy, angle);
      }));
      return;
    }
    if (pattern === 4) {
      enemy.actionLockedUntil = this.time.now + 720;
      enemy.sprite.setVelocity(0, 0);
      this.spawnSkillImpactBurst(enemy.sprite.x, enemy.sprite.y, this.stage.accentColor, 0.75);
      this.tweens.add({ targets: enemy.sprite, alpha: 0.08, duration: 180, yoyo: true, hold: 150 });
      this.time.delayedCall(220, () => {
        if (enemy.health <= 0) return;
        enemy.sprite.setX(Phaser.Math.Clamp(this.player.x - direction * 112, enemy.leftBound, enemy.rightBound));
        this.spawnEnemyAttackEffect(enemy.sprite.x, enemy.sprite.y, direction);
      });
      return;
    }
    if (pattern === 5) {
      enemy.actionLockedUntil = this.time.now + 560;
      [-0.42, -0.21, 0, 0.21, 0.42].forEach((angle, index) => this.time.delayedCall(index * 55, () => {
        if (enemy.health > 0) this.fireMinionProjectile(enemy, angle);
      }));
      return;
    }
    if (pattern === 6) {
      enemy.actionLockedUntil = this.time.now + 520;
      const wave = this.createHostileProjectile(enemy.sprite.x + direction * 32, enemy.sprite.y + 28, 70, 38)
        .setFlipX(direction < 0);
      wave.setVelocityX(direction * (325 + this.stage.number * 6));
      this.bossProjectiles.push({ sprite: wave, expiresAt: this.time.now + 2_100, lastTrailAt: 0 });
      this.cameras.main.shake(120, 0.0025);
      return;
    }
    enemy.actionLockedUntil = this.time.now + 620;
    enemy.sprite.setVelocityX(-direction * 230);
    this.time.delayedCall(190, () => {
      if (enemy.health <= 0) return;
      this.fireMinionProjectile(enemy, -0.14);
      this.fireMinionProjectile(enemy, 0.14);
    });
  }

  private fireMinionProjectile(enemy: EnemyState, angleOffset: number): void {
    const projectileSize = 48 + Math.min(this.stage.number, 10);
    const projectile = this.createHostileProjectile(enemy.sprite.x, enemy.sprite.y - 12, projectileSize);
    const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, this.player.x, this.player.y) + angleOffset;
    this.physics.velocityFromRotation(angle, 225 + this.stage.number * 7, projectile.body?.velocity);
    projectile.setRotation(angle);
    this.bossProjectiles.push({ sprite: projectile, expiresAt: this.time.now + 2_600, lastTrailAt: 0 });
    this.spawnSkillImpactBurst(enemy.sprite.x, enemy.sprite.y - 10, this.stage.accentColor, 0.42);
  }

  private updateBossSkills(time: number): void {
    this.enemies.forEach((boss) => {
      if (!boss.boss || boss.health <= 0 || time < boss.nextSkillAt) return;
      if (Math.abs(this.player.x - boss.sprite.x) > BOSS_AGGRO_RANGE) return;

      const actionDuration = this.castBossPattern(boss);
      const cooldown = boss.health <= boss.maxHealth / 2
        ? this.bossEnragedSkillCooldownMs
        : this.bossSkillCooldownMs;
      boss.nextSkillAt = time + Math.max(actionDuration + 260, cooldown - this.stage.number * 38);
    });
  }

  private spawnEnemyAttackEffect(x: number, y: number, direction: -1 | 1): void {
    const slash = this.add.arc(x + direction * 36, y - 4, 28, -65, 65, false, this.stage.accentColor, 0.22)
      .setStrokeStyle(4, this.stage.accentColor, 0.92)
      .setScale(direction, 1)
      .setDepth(11);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: direction * 1.55,
      scaleY: 1.55,
      duration: 180,
      ease: 'Quad.Out',
      onComplete: () => slash.destroy(),
    });
  }

  private spawnBossCastTelegraph(boss: EnemyState): void {
    boss.bossMotion = 'cast';
    boss.bossMotionUntil = this.time.now + 460;
    const ring = this.add.ellipse(boss.sprite.x, boss.sprite.y + 72, 108, 26, this.stage.accentColor, 0.08)
      .setStrokeStyle(4, this.stage.accentColor, 0.85)
      .setDepth(6)
      .setScale(0.35);
    const pulse = this.add.circle(boss.sprite.x, boss.sprite.y - 8, 16, this.stage.accentColor, 0.55).setDepth(12);
    this.tweens.add({ targets: ring, scaleX: 1.35, scaleY: 1.35, alpha: 0, duration: 360, ease: 'Sine.Out', onComplete: () => ring.destroy() });
    this.tweens.add({ targets: pulse, scale: 2.4, alpha: 0, duration: 280, ease: 'Quad.Out', onComplete: () => pulse.destroy() });
    this.spawnCrossTwinkle(boss.sprite.x, boss.sprite.y - 38, this.stage.accentColor, 1.25);
  }

  private applyBossMotion(boss: EnemyState): void {
    const state = boss.bossMotion;
    if (state === 'dead') return;
    const animationName = state === 'cast' ? 'attack' : state;
    const animationKey = this.bossAnimationKey(animationName);
    const repeatingAnimation = state === 'idle' || state === 'move';
    if (boss.sprite.anims.currentAnim?.key !== animationKey || (repeatingAnimation && !boss.sprite.anims.isPlaying)) boss.sprite.play(animationKey, true);
    // Keep the physics sprite dimensions immutable. Scaling the sprite while its
    // Arcade body is standing on a platform caused both visible shrinking and
    // repeated collision correction that pushed bosses down the Y axis.
    boss.sprite.setScale(BOSS_VISUAL_SCALE).setAngle(state === 'hit' ? boss.direction * -2 : 0);
  }

  private castBossPattern(boss: EnemyState): number {
    const stageNumber = this.stage.number;
    const sequence = BOSS_PATTERN_SEQUENCES[stageNumber - 1] ?? BOSS_PATTERN_SEQUENCES[0]!;
    const pattern = sequence[boss.patternIndex % sequence.length] ?? 'fan';
    boss.patternIndex += 1;
    this.spawnBossCastTelegraph(boss);
    const direction = this.player.x >= boss.sprite.x ? 1 : -1;
    const power = 0.92 + stageNumber * 0.035;

    if (pattern === 'fan') {
      const count = Math.min(9, 3 + Math.floor(stageNumber / 4));
      this.fanAngles(count, 0.14 + (stageNumber % 3) * 0.025).forEach((angle, index) => this.time.delayedCall(index * 48, () => {
        if (boss.health > 0) this.fireBossProjectile(boss, angle, power);
      }));
      return 420;
    }
    if (pattern === 'rain') {
      const targetX = this.player.x;
      this.centeredOffsets(3 + (stageNumber % 5), 82 + stageNumber * 2).forEach((offset, index) => this.time.delayedCall(index * 72, () => {
        if (boss.health > 0) this.dropBossProjectile(targetX + offset);
      }));
      return 520;
    }
    if (pattern === 'charge') {
      boss.sprite.setVelocityX(direction * (440 + Math.min(stageNumber * 12, 220)));
      boss.sprite.setTintFill(this.stage.accentColor);
      this.cameras.main.shake(180, 0.006 + stageNumber * 0.0002);
      this.time.delayedCall(170, () => boss.health > 0 && this.fireBossProjectile(boss, 0, power * 1.08));
      this.time.delayedCall(300, () => boss.health > 0 && boss.sprite.setTint(this.bossTint));
      return 420;
    }
    if (pattern === 'leap') {
      boss.bossMotion = 'jump';
      boss.bossMotionUntil = this.time.now + 760;
      boss.sprite.setVelocity(direction * (150 + stageNumber * 4), -390 - Math.min(stageNumber * 8, 150));
      this.time.delayedCall(470, () => {
        if (boss.health <= 0) return;
        this.cameras.main.shake(220, 0.008);
        this.centeredOffsets(3 + (stageNumber % 3), 96).forEach((offset) => this.dropBossProjectile(boss.sprite.x + offset));
      });
      return 760;
    }
    if (pattern === 'burst') {
      [0, 105, 210].forEach((delay, volley) => this.time.delayedCall(delay, () => {
        if (boss.health <= 0) return;
        this.fanAngles(2 + ((stageNumber + volley) % 4), 0.18).forEach((angle) => this.fireBossProjectile(boss, angle, power * 1.08));
      }));
      return 520;
    }
    if (pattern === 'retreat-volley') {
      boss.sprite.setVelocityX(-direction * (300 + stageNumber * 5));
      [0, 130, 260].forEach((delay, index) => this.time.delayedCall(delay, () => {
        if (boss.health > 0) this.fireBossProjectile(boss, (index - 1) * 0.16, power);
      }));
      return 560;
    }
    if (pattern === 'blink-barrage') {
      const startingY = boss.sprite.y;
      [0, 220, 440].forEach((delay, index) => this.time.delayedCall(delay, () => {
        if (boss.health <= 0) return;
        const side = index % 2 === 0 ? -1 : 1;
        boss.sprite.setPosition(Phaser.Math.Clamp(this.player.x + side * (150 + index * 25), boss.leftBound, boss.rightBound), startingY);
        this.spawnBossBlinkFlash(boss.sprite.x, boss.sprite.y);
        this.fireBossProjectile(boss, 0, power * 1.12);
      }));
      return 760;
    }
    if (pattern === 'sky-dive') {
      boss.bossMotion = 'jump';
      boss.bossMotionUntil = this.time.now + 900;
      boss.sprite.setVelocity(direction * 240, -500);
      this.time.delayedCall(520, () => {
        if (boss.health <= 0) return;
        boss.sprite.setVelocity(direction * 380, 520);
        this.fanAngles(5, 0.2).forEach((angle) => this.fireBossProjectile(boss, angle, power));
        this.cameras.main.shake(260, 0.01);
      });
      return 940;
    }
    if (pattern === 'closing-walls') {
      const arenaCenter = Phaser.Math.Clamp(this.player.x, boss.leftBound + 190, boss.rightBound - 190);
      const warningLeft = this.add.rectangle(arenaCenter - 280, 320, 8, 310, 0xff355d, 0.7).setDepth(12);
      const warningRight = this.add.rectangle(arenaCenter + 280, 320, 8, 310, 0xff355d, 0.7).setDepth(12);
      this.tweens.add({ targets: [warningLeft, warningRight], alpha: 0.15, yoyo: true, repeat: 3, duration: 120 });
      this.time.delayedCall(620, () => {
        warningLeft.destroy(); warningRight.destroy();
        [245, 330, 415].forEach((y, index) => {
          if (index === (stageNumber % 3)) return; // one readable dodge lane always remains.
          const left = this.createHostileProjectile(arenaCenter - 300, y, 94, 58).setVelocityX(390);
          const right = this.createHostileProjectile(arenaCenter + 300, y, 94, 58).setVelocityX(-390);
          this.bossProjectiles.push({ sprite: left, expiresAt: this.time.now + 1_900, lastTrailAt: 0 }, { sprite: right, expiresAt: this.time.now + 1_900, lastTrailAt: 0 });
        });
      });
      return 1_080;
    }
    if (pattern === 'crossfire') {
      const targetX = this.player.x;
      const safeOffset = ((stageNumber % 3) - 1) * 110;
      this.centeredOffsets(9, 82).filter((offset) => Math.abs(offset - safeOffset) > 70).forEach((offset, index) => {
        const marker = this.add.rectangle(targetX + offset, 410, 54, 8, 0xffd34d, 0.8).setDepth(12);
        this.tweens.add({ targets: marker, alpha: 0.12, duration: 420, yoyo: true, onComplete: () => marker.destroy() });
        this.time.delayedCall(520 + index * 38, () => boss.health > 0 && this.dropBossProjectile(targetX + offset));
      });
      this.time.delayedCall(260, () => boss.health > 0 && this.fanAngles(7, 0.16).forEach((angle) => this.fireBossProjectile(boss, angle, power * 1.18)));
      return 1_180;
    }
    if (pattern === 'gravity-cage') {
      const x = this.player.x;
      const cage = this.add.circle(x, this.player.y, 132, this.stage.accentColor, 0.06).setStrokeStyle(7, this.stage.accentColor, 0.8).setDepth(11).setScale(1.7);
      this.tweens.add({ targets: cage, scale: 0.7, alpha: 0.8, duration: 760, ease: 'Cubic.In', onComplete: () => cage.destroy() });
      this.time.delayedCall(780, () => {
        if (boss.health <= 0) return;
        this.fanAngles(10, Math.PI * 2 / 10).forEach((angle) => {
          const projectile = this.createHostileProjectile(x + Math.cos(angle) * 165, this.player.y + Math.sin(angle) * 115, 62);
          this.physics.velocityFromRotation(angle + Math.PI, 300, projectile.body?.velocity);
          this.bossProjectiles.push({ sprite: projectile, expiresAt: this.time.now + 1_350, lastTrailAt: 0 });
        });
      });
      return 1_300;
    }
    if (pattern === 'doom-grid') {
      const startX = Phaser.Math.Clamp(this.player.x - 360, boss.leftBound, boss.rightBound - 720);
      const safeColumn = stageNumber % 7;
      for (let column = 0; column < 7; column += 1) {
        if (column === safeColumn) continue;
        const x = startX + column * 120;
        const marker = this.add.rectangle(x, 272, 72, 285, 0xff244f, 0.12).setStrokeStyle(2, 0xff5577, 0.75).setDepth(10);
        this.tweens.add({ targets: marker, alpha: 0.55, duration: 680, yoyo: true, onComplete: () => marker.destroy() });
        [0, 150].forEach((delay) => this.time.delayedCall(720 + delay + column * 24, () => boss.health > 0 && this.dropBossProjectile(x)));
      }
      return 1_500;
    }
    if (pattern === 'relentless-chain') {
      [0, 360, 720, 1_080].forEach((delay, index) => this.time.delayedCall(delay, () => {
        if (boss.health <= 0) return;
        const aim = this.player.x >= boss.sprite.x ? 1 : -1;
        const warning = this.add.rectangle(boss.sprite.x + aim * 170, boss.sprite.y + 42, 320, 12, 0xffc24a, 0.72).setRotation(aim < 0 ? Math.PI : 0).setDepth(11);
        this.tweens.add({ targets: warning, alpha: 0, duration: 230, onComplete: () => warning.destroy() });
        this.time.delayedCall(250, () => {
          if (boss.health <= 0) return;
          boss.sprite.setVelocityX(aim * (620 + index * 35));
          this.fanAngles(3, 0.19).forEach((angle) => this.fireBossProjectile(boss, angle, power * 1.2));
        });
      }));
      return 1_720;
    }

    return this.castBossTeleportFlank(boss, pattern === 'teleport-left' ? -1 : 1, power);
  }

  private castBossTeleportFlank(boss: EnemyState, side: -1 | 1, power: number): number {
    const body = boss.sprite.body;
    if (!(body instanceof Phaser.Physics.Arcade.Body)) return 0;
    const reappearDelay = 1_900 + (this.stage.number % 3) * 80;
    const savedY = boss.sprite.y;
    boss.actionLockedUntil = this.time.now + reappearDelay + 420;
    boss.sprite.setVelocity(0, 0).setVisible(false);
    boss.healthBar.setVisible(false);
    body.enable = false;
    this.spawnBossBlinkFlash(boss.sprite.x, savedY);
    this.time.delayedCall(reappearDelay, () => {
      if (boss.health <= 0 || !boss.sprite.active) return;
      const destination = Phaser.Math.Clamp(this.player.x + side * 170, boss.leftBound, boss.rightBound);
      body.enable = true;
      body.reset(destination, savedY);
      boss.sprite.setVisible(true).setAlpha(1).setTint(this.bossTint);
      boss.healthBar.setVisible(true);
      boss.direction = this.player.x >= destination ? 1 : -1;
      boss.sprite.setFlipX(boss.direction > 0);
      boss.bossMotion = 'cast';
      boss.bossMotionUntil = this.time.now + 520;
      this.spawnBossBlinkFlash(destination, savedY);
      this.cameras.main.flash(100, 90, 55, 150);
      this.fanAngles(3 + (this.stage.number % 3), 0.16).forEach((angle) => this.fireBossProjectile(boss, angle, power * 1.18));
    });
    return reappearDelay + 520;
  }

  private spawnBossBlinkFlash(x: number, y: number): void {
    const flash = this.add.circle(x, y - 10, 28, this.stage.accentColor, 0.72).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add.ellipse(x, y + 64, 54, 18, this.stage.accentColor, 0.18).setStrokeStyle(4, this.stage.accentColor, 0.9).setDepth(11);
    this.tweens.add({ targets: flash, scale: 3.6, alpha: 0, duration: 360, ease: 'Cubic.Out', onComplete: () => flash.destroy() });
    this.tweens.add({ targets: ring, scaleX: 2.8, scaleY: 1.8, alpha: 0, duration: 420, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
  }

  private fanAngles(count: number, spacing: number): number[] {
    return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * spacing);
  }

  private centeredOffsets(count: number, spacing: number): number[] {
    return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * spacing);
  }

  private fireBossProjectile(boss: EnemyState, angleOffset = 0, speedMultiplier = 1): void {
    boss.bossMotion = 'cast';
    boss.bossMotionUntil = this.time.now + 460;
    const attackKey = this.bossAnimationKey('attack');
    if (boss.sprite.anims.currentAnim?.key !== attackKey || !boss.sprite.anims.isPlaying) boss.sprite.play(attackKey, true);
    boss.sprite.setTintFill(this.stage.accentColor);
    this.time.delayedCall(145, () => {
      if (boss.health <= 0) return;
      const displaySize = 78 + Math.min(this.stage.number, 10);
      const projectile = this.createHostileProjectile(boss.sprite.x, boss.sprite.y - 8, displaySize);
      if (projectile.body instanceof Phaser.Physics.Arcade.Body) projectile.body.setSize(56, 44, true);
      const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, this.player.x, this.player.y) + angleOffset;
      const speed = (boss.health <= boss.maxHealth / 2 ? 310 : 250) * speedMultiplier;
      this.physics.velocityFromRotation(angle, speed, projectile.body?.velocity);
      projectile.setRotation(angle);
      this.bossProjectiles.push({ sprite: projectile, expiresAt: this.time.now + BOSS_PROJECTILE_LIFETIME_MS, lastTrailAt: 0 });
      this.spawnCrossTwinkle(projectile.x, projectile.y, this.stage.accentColor, 0.9);
    });
    this.time.delayedCall(240, () => {
      if (boss.health > 0) boss.sprite.setTint(this.bossTint);
    });
    this.cameras.main.shake(80, 0.0025);
  }

  private dropBossProjectile(x: number): void {
    const displaySize = 88 + Math.min(this.stage.number, 12);
    const projectile = this.createHostileProjectile(Phaser.Math.Clamp(x, 40, WORLD_WIDTH - 40), 90, displaySize).setRotation(Math.PI / 2);
    if (projectile.body instanceof Phaser.Physics.Arcade.Body) projectile.body.setSize(58, 58, true);
    projectile.setVelocityY(330);
    this.bossProjectiles.push({ sprite: projectile, expiresAt: this.time.now + BOSS_PROJECTILE_LIFETIME_MS, lastTrailAt: 0 });
  }

  private updateBossProjectiles(time: number): void {
    this.bossProjectiles = this.bossProjectiles.filter((projectile) => {
      if (!projectile.sprite.active) return false;
      if (time - projectile.lastTrailAt >= 55) {
        projectile.lastTrailAt = time;
        const trail = this.add.image(projectile.sprite.x, projectile.sprite.y, projectile.sprite.texture.key, projectile.sprite.frame.name)
          .setDepth(9)
          .setScale(projectile.sprite.scaleX * 0.72, projectile.sprite.scaleY * 0.72)
          .setRotation(projectile.sprite.rotation)
          .setTint(this.stage.accentColor)
          .setAlpha(0.34);
        this.tweens.add({ targets: trail, alpha: 0, scaleX: trail.scaleX * 0.45, scaleY: trail.scaleY * 0.45, duration: 180, onComplete: () => trail.destroy() });
      }
      if (time >= projectile.expiresAt || projectile.sprite.x < 0 || projectile.sprite.x > WORLD_WIDTH) {
        projectile.sprite.destroy();
        return false;
      }
      if (this.physics.overlap(this.player, projectile.sprite)) {
        projectile.sprite.destroy();
        this.damagePlayer(time, 1, projectile.sprite.x);
        return false;
      }
      return true;
    });
  }

  private handleAttack(time: number): void {
    const attackRequested = Phaser.Input.Keyboard.JustDown(this.attackKey) || this.mobileAttackQueued;
    this.mobileAttackQueued = false;
    if (!attackRequested || time - this.lastAttackAt < ATTACK_COOLDOWN_MS) return;
    this.lastAttackAt = time;
    this.playPlayerAnimation('attack');
    if (this.characterId === 'archer') {
      this.time.delayedCall(110, () => {
        if (!this.finished) this.fireBasicArrow(1 + this.attackLevel + this.armorLevel, this.time.now);
      });
      return;
    }
    if (this.characterId === 'gunslinger') {
      this.launchInnateProjectile('quickdraw', 1 + this.attackLevel + this.armorLevel, 820, time, 54);
      this.spawnInnateParticles(this.player.x + (this.player.flipX ? -48 : 48), this.player.y - 5, 8, 70);
      return;
    }
    if (isSecretCharacter(this.characterId)) {
      this.launchInnateProjectile('market-survivor', 5 + this.attackLevel, 900, time, 62);
      this.spawnInnateParticles(this.player.x + (this.player.flipX ? -54 : 54), this.player.y - 6, 14, 105);
      return;
    }
    const attackX = this.player.x + (this.player.flipX ? -64 : 64);
    if (this.characterId === 'spellblade') this.spawnEnemyAttackEffect(this.player.x, this.player.y, this.player.flipX ? -1 : 1);
    if (isInnateCharacter(this.characterId)) {
      this.spawnSkillImpactBurst(attackX, this.player.y + 4, this.skillAccentColor, this.characterId === 'dualblade' ? 0.58 : 0.72);
      this.spawnCrossTwinkle(attackX, this.player.y, this.skillAccentColor, 0.65);
    }
    this.attackVisual?.destroy();
    this.enemies.forEach((enemy) => {
      if (enemy.health <= 0) return;
      const innateRangeBonus = this.characterId === 'dualblade' ? 18 : this.characterId === 'dragonknight' ? 26 : this.characterId === 'brawler' ? 10 : 0;
      const inRange = Math.abs(enemy.sprite.x - attackX) <= (enemy.boss ? 92 : 68) + innateRangeBonus;
      if (inRange && this.combatFootDistance(enemy) <= 42) {
        this.damageEnemy(enemy, (enemy.boss ? Math.ceil(enemy.maxHealth / 3) : 1) + this.attackLevel + this.armorLevel);
      }
    });
  }

  private fireBasicArrow(damage: number, time: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const arrow = this.physics.add.image(this.player.x + direction * 45, this.player.y - 7, 'quest-basic-arrow')
      .setDepth(12)
      .setFlipX(direction < 0);
    arrow.body?.setAllowGravity(false);
    arrow.setVelocityX(direction * 720);
    this.playerSkillProjectiles.push({ sprite: arrow, expiresAt: time + PLAYER_SKILL_PROJECTILE_LIFETIME_MS, damage });
  }

  private handlePlayerSkill(time: number): void {
    if (time < this.skillLockedUntil) return;
    const keyboardSkillId = Object.keys(this.skillKeys).find((id) => (
      this.ownedSkillIds.includes(id) && Phaser.Input.Keyboard.JustDown(this.skillKeys[id] ?? this.attackKey)
    ));
    const mobileSkillId = this.mobileSkillQueue.values().next().value;
    if (mobileSkillId) this.mobileSkillQueue.delete(mobileSkillId);
    const skillId = keyboardSkillId ?? mobileSkillId;
    if (!skillId) return;
    const lastUsedAt = this.lastSkillAt.get(skillId) ?? Number.NEGATIVE_INFINITY;
    if (time - lastUsedAt < this.skillCooldownMs(skillId)) return;
    this.lastSkillAt.set(skillId, time);
    this.skillLockedUntil = time + 620;
    void this.audioDirector.unlock().then(() => this.audioDirector.playSkill(this.characterId, skillId));
    this.playPlayerAnimation('skill');
    if (this.characterId === 'warrior' || this.characterId === 'mage' || this.characterId === 'spellblade' || isInnateCharacter(this.characterId) || isPoliticalCharacter(this.characterId) || isSecretCharacter(this.characterId)) {
      this.spawnSkillImpactBurst(this.player.x, this.player.y - 8, this.skillAccentColor, isPoliticalCharacter(this.characterId) ? 1 : 0.72);
    }
    if (this.characterId === 'warrior' || this.characterId === 'mage' || isInnateCharacter(this.characterId) || isPoliticalCharacter(this.characterId) || isSecretCharacter(this.characterId)) {
      this.spawnClassCastHalo(this.skillAccentColor, isPoliticalCharacter(this.characterId) ? 1.18 : 0.9);
      const flashColor = Phaser.Display.Color.ValueToColor(this.skillAccentColor);
      this.cameras.main.flash(90, flashColor.red, flashColor.green, flashColor.blue, false);
      if (skillId === 'starfall' || skillId === 'meteor' || skillId.endsWith('-v')) {
        this.time.delayedCall(150, () => {
          this.spawnClassCastHalo(this.skillAccentColor, 1.35);
          this.spawnSkillImpactBurst(this.player.x, this.player.y, this.skillAccentColor, 1.25);
        });
      }
    }

    if (!isPoliticalCharacter(this.characterId)) this.spawnEnhancedSkillEffect(skillId);
    if (isInnateCharacter(this.characterId) || isSecretCharacter(this.characterId)) this.playAnimatedClassCastVfx(skillId);
    if (isPoliticalCharacter(this.characterId)) {
      this.castPoliticalStageSkill(skillId, time);
      return;
    }
    if (isSecretCharacter(this.characterId)) {
      this.castAssetTycoonSkill(skillId, time);
      return;
    }
    if (isInnateCharacter(this.characterId)) {
      this.castInnateClassSkill(skillId, time);
      return;
    }
    if (skillId === 'healing-light') { this.castDefense(skillId, time); return; }
    if (skillId === 'starfall') { this.castWarriorRoar(this.skillDamage(skillId, 5), time); return; }
    if (skillId === 'arcane-bolt') { this.castWarriorPowerSlash(this.skillDamage(skillId, 3)); return; }
    if (skillId === 'frost-nova') { this.castWarriorBladeCyclone(this.skillDamage(skillId, 4)); return; }
    if (skillId === 'flame-wave') { this.castWarriorEarthbreaker(this.skillDamage(skillId, 4)); return; }

    if (skillId === 'healing-circle') { this.castHealingCircle(skillId); return; }
    if (skillId === 'chain-lightning') { this.castVioletJudgment(this.skillDamage(skillId, 3)); return; }
    if (skillId === 'meteor') { this.castMeteor(this.skillDamage(skillId, 5)); return; }
    if (skillId === 'magic-missile') this.spawnSkillProjectile('slash', this.skillDamage(skillId, 3), 620, 0.68, time, undefined, 'quest-mage-vfx-v2', 'mage-vfx-missile');
    if (skillId === 'ice-storm') { this.castIceStorm(this.skillDamage(skillId, 3)); return; }

    if (skillId === 'arcane-cleave') { this.castAbyssRush(skillId, this.skillDamage(skillId, 4)); return; }
    if (skillId === 'twin-phantom') { this.castBloodMoon(skillId, this.skillDamage(skillId, 4)); return; }
    if (skillId === 'rune-step') { this.castForwardEruption(skillId, this.skillDamage(skillId, 5), 185); return; }
    if (skillId === 'astral-counter') { this.castClassBuff(skillId, time); return; }
    if (skillId === 'constellation-storm') { this.castDarkSwordRain(this.skillDamage(skillId, 7)); return; }

    if (skillId === 'gale-arrow') { this.castIconProjectile(skillId, this.skillDamage(skillId, 3), 680, time); return; }
    if (skillId === 'split-shot') { [-0.18, 0, 0.18].forEach((angle) => this.castIconProjectile(skillId, this.skillDamage(skillId, 2), 590, time, angle)); return; }
    if (skillId === 'verdant-snare') { this.castIconArea(skillId, this.skillDamage(skillId, 4), 230); return; }
    if (skillId === 'feather-step') { this.castClassBuff(skillId, time); return; }
    if (skillId === 'emerald-rain') { this.castEmeraldTempest(this.skillDamage(skillId, 6)); }
  }

  private castInnateClassSkill(skillId: string, time: number): void {
    if (!isInnateCharacter(this.characterId)) return;
    const definition = innateClasses[this.characterId].skills.find((skill) => skill.id === skillId);
    if (!definition) return;
    const damage = this.skillDamage(skillId, definition.damage);
    const direction = this.player.flipX ? -1 : 1;

    if (this.characterId === 'elementalist' || this.characterId === 'warlock') {
      this.castNewMageClassSkill(skillId, definition.key, damage, time);
      return;
    }

    if (skillId === 'crescent-fang') {
      this.launchInnateProjectile(skillId, damage, 720, time, 128);
      this.spawnInnateParticles(this.player.x + direction * 62, this.player.y, 14, 110);
      return;
    }
    if (skillId === 'phantom-cross') {
      [0, 110, 220].forEach((delay, index) => this.time.delayedCall(delay, () => {
        if (this.finished) return;
        const x = this.player.x + direction * (35 + index * 24);
        this.showInnateSkillEffect(skillId, x, this.player.y, 150 + index * 18, 440, direction * (index % 2 === 0 ? 18 : -18));
        this.spawnInnateParticles(x, this.player.y, 12, 135);
        this.damageEnemiesInArea(x, 145, Math.max(1, Math.ceil(damage / 2)));
      }));
      return;
    }
    if (skillId === 'shadow-reversal') {
      this.castShadowReversal(damage, time);
      return;
    }
    if (definition.buff) {
      this.castInnateBuff(skillId, time);
      return;
    }
    if (skillId === 'infinite-blades') {
      this.castAnimatedUltimate('dualblade', damage);
      return;
    }
    if (skillId === 'iron-jab') {
      const impactX = this.player.x + direction * 92;
      this.showInnateSkillEffect(skillId, impactX, this.player.y, 142, 380, direction * 8);
      this.spawnInnateParticles(impactX, this.player.y, 18, 150);
      this.damageEnemiesInArea(impactX, 112, damage);
      this.cameras.main.shake(120, 0.006);
      return;
    }
    if (skillId === 'hundred-fists') {
      [0, 75, 150, 225, 300].forEach((delay, index) => this.time.delayedCall(delay, () => {
        if (this.finished) return;
        const impactX = this.player.x + direction * (82 + index * 25);
        this.showInnateSkillEffect(skillId, impactX, this.player.y + Phaser.Math.Between(-24, 20), 118 + index * 5, 300, direction * index * 7);
        this.spawnInnateParticles(impactX, this.player.y, 10, 105);
        this.damageEnemiesInArea(impactX, 94, Math.max(1, Math.ceil(damage / 3)));
      }));
      this.cameras.main.shake(360, 0.008);
      return;
    }
    if (skillId === 'titan-fist') {
      this.launchInnateProjectile(skillId, damage, 620, time, 156);
      this.spawnInnateParticles(this.player.x + direction * 70, this.player.y, 20, 160);
      return;
    }
    if (skillId === 'heaven-breaker') {
      this.castAnimatedUltimate('brawler', damage);
      return;
    }
    if (skillId === 'draconic-thrust') {
      this.castDraconicThrust(damage);
      return;
    }
    if (skillId === 'wingbreaker') {
      [0, 125, 250].forEach((delay, index) => this.time.delayedCall(delay, () => {
        if (this.finished) return;
        const x = this.player.x + direction * (72 + index * 48);
        this.showInnateSkillEffect(skillId, x, this.player.y - 8, 170 + index * 18, 470, direction * (index % 2 === 0 ? 22 : -22));
        this.spawnInnateParticles(x, this.player.y, 16, 170);
        this.damageEnemiesInArea(x, 138, Math.max(1, Math.ceil(damage / 2)), 120);
      }));
      return;
    }
    if (skillId === 'inferno-breath') {
      [-0.18, 0, 0.18].forEach((angle) => this.launchInnateProjectile(skillId, Math.max(1, Math.ceil(damage / 2)), 590, time, 112, angle));
      this.spawnInnateParticles(this.player.x + direction * 82, this.player.y - 5, 28, 210);
      return;
    }
    if (skillId === 'cataclysm-wyvern') {
      this.castCataclysmDragonBreath(damage);
      return;
    }
    if (skillId === 'quickdraw') {
      this.launchInnateProjectile(skillId, damage, 920, time, 64);
      this.spawnInnateParticles(this.player.x + direction * 58, this.player.y - 4, 10, 90);
      return;
    }
    if (skillId === 'scatter-burst') {
      [-0.3, -0.15, 0, 0.15, 0.3].forEach((angle) => this.launchInnateProjectile(skillId, Math.max(1, Math.ceil(damage / 2)), 690, time, 58, angle));
      this.spawnInnateParticles(this.player.x + direction * 56, this.player.y, 18, 130);
      return;
    }
    if (skillId === 'ricochet-round') {
      this.launchInnateProjectile(skillId, damage, 760, time, 105);
      this.showInnateSkillEffect(skillId, this.player.x + direction * 70, this.player.y, 126, 390);
      return;
    }
    if (skillId === 'bullet-tempest') {
      this.castAnimatedUltimate('gunslinger', damage);
      return;
    }

    // The six expansion classes share the same combat foundation while their
    // silhouettes, colors, timing and attack geometry remain class-specific.
    const mageClass = this.characterId === 'venomancer' || this.characterId === 'pyromancer';
    const heavyClass = this.characterId === 'hammerguard' || this.characterId === 'axereaver';
    if (skillId === 'moonlit-draw') {
      this.castMoonlitDraw(damage, time);
      return;
    }
    if (skillId === 'venom-needle') {
      this.castVenomNeedle(damage, time);
      return;
    }
    if (definition.key === 'Q') {
      if (mageClass) this.launchInnateProjectile(skillId, damage, 760, time, 112);
      else {
        const x = this.player.x + direction * (heavyClass ? 104 : 86);
        [0, 70, 140].forEach((delay, index) => this.time.delayedCall(delay, () => {
          if (this.finished) return;
          const impactX = x + direction * index * (heavyClass ? 24 : 18);
          this.showInnateSkillEffect(skillId, impactX, this.player.y + (heavyClass ? 28 : 0), (heavyClass ? 170 : 138) + index * 16, 360, direction * (index % 2 === 0 ? 18 : -22));
          this.spawnInnateParticles(impactX, this.player.y, 10 + index * 4, 100 + index * 24);
        }));
        const shockwave = this.add.ellipse(x, this.player.y + 38, heavyClass ? 138 : 108, heavyClass ? 42 : 58, this.skillAccentColor, 0.18)
          .setStrokeStyle(4, 0xffffff, 0.9)
          .setDepth(12)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: shockwave, scaleX: 2.4, scaleY: 1.45, alpha: 0, duration: 430, ease: 'Cubic.Out', onComplete: () => shockwave.destroy() });
        this.damageEnemiesInArea(x, heavyClass ? 145 : 118, damage, 110);
      }
      this.spawnInnateParticles(this.player.x + direction * 72, this.player.y, heavyClass ? 24 : 16, heavyClass ? 190 : 130);
      return;
    }
    if (definition.key === 'W') {
      if (skillId === 'flame-pillar') {
        this.castFlamePillar(damage);
        return;
      }
      if (this.characterId === 'ssaulabi' || this.characterId === 'kickfighter' || this.characterId === 'axereaver') {
        const startX = this.player.x;
        this.player.setVelocityX(direction * (this.characterId === 'kickfighter' ? 760 : 650));
        [0, 95, 190].forEach((delay, index) => this.time.delayedCall(delay, () => {
          const x = startX + direction * (80 + index * 95);
          this.showInnateSkillEffect(skillId, x, this.player.y, 142 + index * 12, 420, direction * index * 18);
          this.damageEnemiesInArea(x, 118, Math.max(1, Math.ceil(damage / 2)), 120);
        }));
      } else {
        [-135, 0, 135].forEach((offset, index) => this.time.delayedCall(index * 90, () => {
          const x = this.player.x + direction * 150 + offset;
          this.showInnateSkillEffect(skillId, x, this.player.y + 28, 176, 560, index * 28);
          this.damageEnemiesInArea(x, 125, Math.max(1, Math.ceil(damage / 2)), 135);
        }));
      }
      this.cameras.main.shake(260, heavyClass ? 0.012 : 0.007);
      return;
    }
    if (definition.key === 'E') {
      const centerX = this.player.x + direction * (mageClass ? 150 : 90);
      const count = mageClass ? 5 : 4;
      for (let index = 0; index < count; index += 1) {
        this.time.delayedCall(index * 85, () => {
          const angle = (index / count) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * (heavyClass ? 145 : 115);
          const y = this.player.y + Math.sin(angle) * 48;
          this.showInnateSkillEffect(skillId, x, y, 150 + index * 8, 540, index * 32);
          this.spawnInnateParticles(x, y, 12, 120);
        });
      }
      this.time.delayedCall(190, () => this.damageEnemiesInArea(centerX, heavyClass ? 310 : 260, damage, 160));
      this.cameras.main.shake(380, heavyClass ? 0.015 : 0.01);
      return;
    }
    if (skillId === 'world-anvil') {
      this.castWorldAnvil(damage, time);
      return;
    }
    if (skillId === 'solar-cataclysm') {
      this.castSolarCataclysm(damage);
      return;
    }
    if (skillId === 'skybreaker-combo') {
      this.castSkybreakerQuake(damage, time);
      return;
    }
    if (skillId === 'heaven-sever') {
      this.castCrimsonHeavenSever(damage, time);
      return;
    }
    if (skillId === 'deathbloom') {
      this.castVenomDeathbloom(damage);
      return;
    }
    if (skillId === 'ragnarok-cleaver') {
      this.castAnimatedUltimate('axereaver', damage);
      return;
    }
    if (definition.key === 'T') {
      const centerX = this.player.x + direction * 140;
      for (let index = 0; index < 7; index += 1) {
        this.time.delayedCall(index * 70, () => {
          const x = centerX + (index - 3) * 105;
          const y = this.player.y - 40 - Math.abs(index - 3) * 12;
          this.showInnateSkillEffect(skillId, x, y, 225 + index * 11, 760, index * 41);
          this.spawnInnateParticles(x, this.player.y, 22, 240);
        });
      }
      this.time.delayedCall(280, () => this.damageEnemiesInArea(centerX, 520, damage, 210));
      this.cameras.main.flash(160, mageClass && this.characterId === 'venomancer' ? 100 : 255, mageClass ? 120 : 210, heavyClass ? 45 : 95, false);
      this.cameras.main.shake(680, 0.021);
    }
  }

  private castAnimatedUltimate(character: 'spellblade' | 'archer' | 'dualblade' | 'brawler' | 'gunslinger' | 'ssaulabi' | 'kickfighter' | 'venomancer' | 'pyromancer' | 'hammerguard' | 'axereaver' | 'elementalist' | 'warlock' | 'assettycoon', damage: number): void {
    const view = this.cameras.main.worldView;
    const centerX = view.centerX;
    const colors: Readonly<Record<typeof character, number>> = {
      spellblade: 0xd62955, archer: 0x8ffff0, dualblade: 0x667cff, brawler: 0xffb23f, gunslinger: 0x63dcff,
      ssaulabi: 0xef294d, kickfighter: 0x45e6d1, venomancer: 0x80e83f, pyromancer: 0xff8a32, hammerguard: 0x9ac7ff,
      axereaver: 0xff294f, assettycoon: 0xffdf72,
      elementalist: 0xffe38a, warlock: 0xa86cff,
    };
    const sprite = this.add.sprite(this.scale.width / 2, this.scale.height / 2, `quest-${character}-ultimate-vfx`, 0)
      .setScrollFactor(0)
      .setDepth(28)
      .setDisplaySize(this.scale.width * 1.04, this.scale.height * 1.04)
      .setBlendMode(Phaser.BlendModes.ADD);
    sprite.play(`${character}-hq-ultimate`);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    for (let pulse = 0; pulse < 7; pulse += 1) this.time.delayedCall(210 + pulse * 155, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(centerX, view.width * (0.38 + pulse * 0.045), Math.max(1, Math.ceil(damage / 5)), 230);
      if (pulse === 2 || pulse === 5) this.cameras.main.shake(130, 0.009 + pulse * 0.001);
    });
    this.time.delayedCall(1_230, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(centerX, view.width * 0.72, damage, 460);
      this.spawnSkillImpactBurst(centerX, this.player.y + 10, colors[character], 2.25);
      this.cameras.main.flash(260, (colors[character] >> 16) & 255, (colors[character] >> 8) & 255, colors[character] & 255, false);
      this.cameras.main.shake(760, 0.028);
    });
  }

  private castNewMageClassSkill(skillId: string, key: 'Q' | 'W' | 'E' | 'R' | 'T' | 'Z' | 'X' | 'C' | 'V', damage: number, time: number): void {
    const elementalist = this.characterId === 'elementalist';
    const direction = this.player.flipX ? -1 : 1;
    if (elementalist) {
      this.castElementalistSkill(skillId, key, damage, time, direction);
      return;
    }
    if (key === 'R') {
      this.castInnateBuff(skillId, time);
      return;
    }
    if (key === 'T') {
      this.castAnimatedUltimate('warlock', damage);
      return;
    }
    if (key === 'Q') {
      this.castWarlockAbyssBolt(skillId, damage, time, direction);
      return;
    }
    if (key === 'E') {
      const count = 3;
      for (let index = 0; index < count; index += 1) {
        const angle = (index - 1) * 0.16;
        this.launchInnateProjectile(skillId, Math.max(1, Math.ceil(damage / 2)), 720, time, 120, angle);
      }
      this.spawnInnateParticles(this.player.x + direction * 72, this.player.y - 8, 22, 180);
      return;
    }
    const view = this.cameras.main.worldView;
    const centerX = key === 'W' ? this.player.x + direction * 150 : view.centerX;
    const pulses = key === 'C' ? 7 : key === 'Z' || key === 'X' ? 5 : 4;
    for (let pulse = 0; pulse < pulses; pulse += 1) this.time.delayedCall(pulse * 120, () => {
      if (this.finished) return;
      const x = centerX + Phaser.Math.Between(-90, 90);
      this.showInnateSkillEffect(skillId, x, this.player.y - 20, 150 + pulse * 18, 520, pulse * 37);
      this.spawnInnateParticles(x, this.player.y, 14, 150);
      this.damageEnemiesInArea(x, 150 + pulse * 14, Math.max(1, Math.ceil(damage / 3)), 230);
    });
    this.time.delayedCall(pulses * 120, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(centerX, key === 'C' ? view.width * 0.62 : 360, damage, 340);
      this.cameras.main.flash(180, 145, 80, 255, false);
      this.cameras.main.shake(520, 0.018);
    });
  }

  private castElementalistSkill(skillId: string, key: 'Q' | 'W' | 'E' | 'R' | 'T' | 'Z' | 'X' | 'C' | 'V', damage: number, time: number, direction: number): void {
    const view = this.cameras.main.worldView;
    if (key === 'V') {
      this.castAnimatedUltimate('elementalist', damage);
      return;
    }
    if (key === 'R') {
      this.castInnateBuff(skillId, time);
      [0x65d46e, 0xd7a54b, 0x70d9ff].forEach((color, index) => {
        const shield = this.add.ellipse(this.player.x, this.player.y, 105 + index * 28, 132 + index * 24, color, 0.08)
          .setStrokeStyle(4, color, 0.85).setDepth(15);
        this.tweens.add({ targets: shield, alpha: 0, scaleX: 1.45, scaleY: 1.3, duration: 760 + index * 120, onComplete: () => shield.destroy() });
      });
      return;
    }
    if (key === 'Q') {
      this.castElementalistFlameProjectile(skillId, damage, time, direction);
      return;
    }
    if (key === 'E') {
      [-26, 0, 26].forEach((offsetY, index) => this.time.delayedCall(index * 90, () => {
        const startX = this.player.x + direction * 55;
        const lance = this.add.polygon(startX, this.player.y + offsetY, [0, 0, 62, 10, 0, 20, 14, 10], 0xc9fbff, 0.95)
          .setStrokeStyle(3, 0x56dfff, 1).setDepth(16).setScale(direction, 1);
        this.tweens.add({ targets: lance, x: startX + direction * 650, alpha: 0.12, duration: 520, ease: 'Quad.easeIn', onUpdate: () => {
          this.spawnInnateParticles(lance.x, lance.y, 2, 42);
          this.damageEnemiesInArea(lance.x, 64, Math.max(1, Math.ceil(damage / 2)), 70);
        }, onComplete: () => lance.destroy() });
      }));
      return;
    }
    if (key === 'T') {
      const veil = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x46206f, 0.2)
        .setScrollFactor(0).setDepth(13);
      this.tweens.add({ targets: veil, alpha: 0, duration: 1_650, onComplete: () => veil.destroy() });
      for (let pulse = 0; pulse < 14; pulse += 1) this.time.delayedCall(pulse * 105, () => {
        if (this.finished) return;
        const x = view.left + ((pulse + 0.5) / 14) * view.width;
        const bolt = this.add.polygon(x, view.top - 20, [-18, 0, 22, 0, -8, view.height * 0.46, 28, view.height * 0.46, -24, view.height], 0xdca8ff, 0.88)
          .setStrokeStyle(5, 0xffffff, 0.92).setOrigin(0.5, 0).setDepth(17);
        this.tweens.add({ targets: bolt, alpha: 0, duration: 330, ease: 'Cubic.Out', onComplete: () => bolt.destroy() });
        this.spawnElementalBurst(x, view.top + view.height * 0.76, 0x9d5cff, 150);
        this.damageEnemiesInArea(x, view.width * 0.12, Math.max(1, Math.ceil(damage / 3)), view.height);
      });
      this.time.delayedCall(1_480, () => this.damageEnemiesInArea(view.centerX, view.width, damage, view.height));
      return;
    }
    const centerX = key === 'W' ? this.player.x + direction * 165 : view.centerX;
    if (key === 'W') {
      for (let ring = 0; ring < 4; ring += 1) {
        const wave = this.add.ellipse(centerX, this.player.y + 12, 90 + ring * 34, 42 + ring * 15, 0x43b7e8, 0.1)
          .setStrokeStyle(5, ring % 2 === 0 ? 0xbff8ff : 0x318dd7, 0.92).setDepth(15);
        this.tweens.add({ targets: wave, scaleX: 1.8, scaleY: 2.5, alpha: 0, duration: 650 + ring * 90, onComplete: () => wave.destroy() });
      }
      this.damageEnemiesInArea(centerX, 245, damage, 300);
      return;
    }
    if (key === 'Z') {
      const comet = this.add.circle(centerX + direction * 170, view.top - 80, 54, 0xc8f8ff, 0.95).setStrokeStyle(12, 0x64bfff, 0.9).setDepth(17);
      this.tweens.add({ targets: comet, x: centerX, y: this.player.y, scale: 1.65, duration: 720, ease: 'Cubic.In', onUpdate: () => this.spawnInnateParticles(comet.x, comet.y, 3, 62), onComplete: () => {
        this.spawnElementalBurst(centerX, this.player.y, 0x83dfff, 310);
        this.damageEnemiesInArea(centerX, 330, damage, 310);
        comet.destroy();
      } });
      return;
    }
    if (key === 'X') {
      for (let fissure = 0; fissure < 8; fissure += 1) this.time.delayedCall(fissure * 70, () => {
        const x = this.player.x + direction * (65 + fissure * 72);
        const crack = this.add.polygon(x, this.player.y + 48, [-42, 18, -18, -12, 0, 12, 24, -24, 46, 18], 0xff5a24, 0.82)
          .setStrokeStyle(4, 0xffd15c, 0.95).setDepth(15);
        this.tweens.add({ targets: crack, scaleY: 1.8, alpha: 0, duration: 520, onComplete: () => crack.destroy() });
        this.damageEnemiesInArea(x, 105, Math.max(1, Math.ceil(damage / 3)), 230);
      });
      return;
    }
    if (key === 'C') {
      const colors = [0xff6633, 0x54d8ff, 0x8fea77, 0xffdf68, 0xb27aff];
      colors.forEach((color, index) => {
        const angle = (Math.PI * 2 * index) / colors.length;
        const orb = this.add.circle(centerX + Math.cos(angle) * 220, this.player.y + Math.sin(angle) * 110, 26, color, 0.92).setDepth(16);
        this.tweens.add({ targets: orb, x: centerX, y: this.player.y, scale: 0.35, duration: 620 + index * 70, ease: 'Sine.easeIn', onComplete: () => orb.destroy() });
      });
      this.time.delayedCall(850, () => {
        this.spawnElementalBurst(centerX, this.player.y, 0xffffff, 410);
        this.damageEnemiesInArea(centerX, 430, damage, 370);
      });
    }
  }

  private castElementalistFlameProjectile(skillId: string, damage: number, time: number, direction: number): void {
    const startX = this.player.x + direction * 58;
    const startY = this.player.y - 10;
    const projectile = this.add.image(startX, startY, `quest-skill-icon-${skillId}`)
      .setDisplaySize(74, 74)
      .setDepth(16)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: projectile, scaleX: 1.35, scaleY: 1.18, duration: 520, ease: 'Sine.easeIn' });
    this.tweens.add({
      targets: projectile,
      x: startX + direction * 520,
      duration: 620,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        if (!projectile.active) return;
        this.spawnInnateParticles(projectile.x, projectile.y + Phaser.Math.Between(-14, 14), 3, 72);
        this.damageEnemiesInArea(projectile.x, 72, Math.max(1, Math.ceil(damage / 3)), 100);
      },
      onComplete: () => {
        this.spawnElementalBurst(projectile.x, projectile.y, 0xff6a2e, 220);
        this.damageEnemiesInArea(projectile.x, 190, damage, 240);
        projectile.destroy();
      },
    });
    this.spawnInnateParticles(startX, startY, 22, 170);
    this.lastSkillAt.set(skillId, time);
  }

  private spawnElementalBurst(x: number, y: number, color: number, radius: number): void {
    const core = this.add.circle(x, y, Math.max(18, radius * 0.12), color, 0.92).setStrokeStyle(6, 0xffffff, 0.78).setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add.ellipse(x, y, radius * 0.38, radius * 0.2, color, 0.08).setStrokeStyle(7, color, 0.95).setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: core, scale: 3.4, alpha: 0, duration: 520, ease: 'Cubic.Out', onComplete: () => core.destroy() });
    this.tweens.add({ targets: ring, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 620, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
    this.spawnInnateParticles(x, y, 28, radius * 0.62);
  }

  private castWarlockAbyssBolt(skillId: string, damage: number, time: number, direction: number): void {
    const startX = this.player.x + direction * 56;
    const startY = this.player.y - 12;
    const bolt = this.add.circle(startX, startY, 25, 0x25103e, 0.98)
      .setStrokeStyle(6, 0xb765ff, 0.95).setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.circle(startX, startY, 9, 0xf1c9ff, 0.95).setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: [bolt, core], scaleX: 1.32, scaleY: 0.82, duration: 170, yoyo: true, repeat: 3 });
    this.tweens.add({
      targets: [bolt, core], x: startX + direction * 610, duration: 680, ease: 'Sine.easeIn',
      onUpdate: () => {
        core.setPosition(bolt.x, bolt.y);
        const trail = this.add.circle(bolt.x - direction * Phaser.Math.Between(10, 38), bolt.y + Phaser.Math.Between(-18, 18), Phaser.Math.Between(4, 11), 0x7836b8, 0.56)
          .setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: trail, alpha: 0, scale: 0.15, y: trail.y + Phaser.Math.Between(-32, 32), duration: 360, onComplete: () => trail.destroy() });
        this.damageEnemiesInArea(bolt.x, 72, Math.max(1, Math.ceil(damage / 3)), 90);
      },
      onComplete: () => {
        this.spawnElementalBurst(bolt.x, bolt.y, 0x8e45d6, 235);
        this.damageEnemiesInArea(bolt.x, 205, damage, 260);
        bolt.destroy();
        core.destroy();
      },
    });
    this.lastSkillAt.set(skillId, time);
  }

  private castWorldAnvil(damage: number, time: number): void {
    this.castAnimatedUltimate('hammerguard', damage);
    return;
    const direction = this.player.flipX ? -1 : 1;
    const level = this.skillUpgradeLevels['world-anvil'] ?? 0;
    const startX = this.player.x;
    const startY = this.player.y;
    const impactX = Phaser.Math.Clamp(startX + direction * 105, 70, WORLD_WIDTH - 70);
    this.defenseUntil = Math.max(this.defenseUntil, time + 900);
    this.player.setVelocity(direction * 180, -650 - level * 12);

    const divineHammer = this.add.image(impactX, startY - 330, 'quest-skill-icon-world-anvil')
      .setDisplaySize(210 + level * 10, 210 + level * 10)
      .setDepth(16)
      .setAngle(direction * -24)
      .setAlpha(0.92)
      .setBlendMode(Phaser.BlendModes.ADD);
    const targetingRing = this.add.ellipse(impactX, startY + 38, 130, 34, 0x68a9ff, 0.2)
      .setStrokeStyle(5, 0xffd36a, 0.95)
      .setDepth(12)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: targetingRing, scaleX: 2.2, scaleY: 1.45, alpha: 0.62, duration: 360, yoyo: true, repeat: 1 });
    this.tweens.add({
      targets: divineHammer,
      x: impactX,
      y: startY + 28,
      angle: direction * 8,
      scaleX: divineHammer.scaleX * 1.34,
      scaleY: divineHammer.scaleY * 1.34,
      duration: 590,
      ease: 'Expo.In',
      onComplete: () => {
        divineHammer.destroy();
        targetingRing.destroy();
        const body = this.player.body;
        if (body instanceof Phaser.Physics.Arcade.Body) body.reset(impactX, startY);
        else this.player.setPosition(impactX, startY);
        this.player.setVelocity(0, 0);
        this.showInnateSkillEffect('world-anvil', impactX, startY + 20, 330 + level * 14, 820);
        this.spawnInnateParticles(impactX, startY + 28, 46 + level * 4, 300 + level * 16);
        for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
          this.time.delayedCall(ringIndex * 70, () => {
            const shockwave = this.add.ellipse(impactX, startY + 42, 90 + ringIndex * 35, 30 + ringIndex * 8, ringIndex % 2 === 0 ? 0x68a9ff : 0xffd36a, 0.22)
              .setStrokeStyle(5, ringIndex % 2 === 0 ? 0xe8f4ff : 0xffd36a, 0.94)
              .setDepth(14)
              .setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({ targets: shockwave, scaleX: 3.8, scaleY: 2, alpha: 0, duration: 520 + ringIndex * 80, ease: 'Cubic.Out', onComplete: () => shockwave.destroy() });
          });
        }
        this.damageEnemiesInArea(impactX, 500 + level * 18, damage, 235);
        this.cameras.main.flash(190, 195, 225, 255, false);
        this.cameras.main.shake(820, 0.028 + level * 0.001);
      },
    });
    this.time.delayedCall(300, () => {
      if (!this.finished) this.player.setVelocity(direction * 240, 790);
    });
  }

  private castCrimsonHeavenSever(damage: number, time: number): void {
    this.castAnimatedUltimate('ssaulabi', damage);
    return;
    const level = this.skillUpgradeLevels['heaven-sever'] ?? 0;
    const view = this.cameras.main.worldView;
    const centerX = view.centerX;
    const centerY = view.centerY;
    const direction = this.player.flipX ? -1 : 1;
    this.player.setVelocity(0, 0);
    this.defenseUntil = Math.max(this.defenseUntil, time + 1_050);
    const veil = this.add.rectangle(512, 260, 1_024, 520, 0x17070b, 0.7).setScrollFactor(0).setDepth(14);
    this.tweens.add({ targets: veil, fillAlpha: 0.9, duration: 250, yoyo: true, hold: 420, onComplete: () => veil.destroy() });

    for (let slash = 0; slash < 6; slash += 1) {
      this.time.delayedCall(180 + slash * 75, () => {
        if (this.finished) return;
        const offsetY = (slash - 2.5) * 58;
        const angle = direction * (slash % 2 === 0 ? -8 - slash * 2 : 11 + slash * 2);
        const blade = this.add.rectangle(centerX, centerY + offsetY, view.width * 1.25, 8 + level * 0.7, slash % 2 === 0 ? 0xffefe2 : 0xd71938, 0.96)
          .setDepth(17)
          .setAngle(angle)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.05, 1);
        this.tweens.add({ targets: blade, scaleX: 1, scaleY: 2.2, alpha: 0, duration: 430, ease: 'Expo.Out', onComplete: () => blade.destroy() });
        this.showInnateSkillEffect('heaven-sever', centerX + Phaser.Math.Between(-360, 360), centerY + offsetY, 210 + slash * 18, 520, angle);
      });
    }

    const leafCount = 54 + level * 5;
    for (let leaf = 0; leaf < leafCount; leaf += 1) {
      this.time.delayedCall(120 + leaf * 12, () => {
        if (this.finished) return;
        const startX = view.left - 40 + Phaser.Math.Between(0, Math.round(view.width * 0.45));
        const startY = view.top + Phaser.Math.Between(20, Math.round(view.height - 40));
        const petal = this.add.ellipse(startX, startY, Phaser.Math.Between(7, 15), Phaser.Math.Between(3, 7), leaf % 4 === 0 ? 0xff8a48 : leaf % 3 === 0 ? 0x8f1025 : 0xd9273f, 0.9)
          .setDepth(18)
          .setAngle(Phaser.Math.Between(-80, 80))
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: petal,
          x: startX + view.width * Phaser.Math.FloatBetween(0.75, 1.25),
          y: startY + Phaser.Math.Between(-100, 150),
          angle: petal.angle + Phaser.Math.Between(240, 720),
          alpha: 0,
          duration: Phaser.Math.Between(900, 1_500),
          ease: 'Sine.InOut',
          onComplete: () => petal.destroy(),
        });
      });
    }

    this.time.delayedCall(640, () => {
      if (this.finished) return;
      this.enemies.filter((enemy) => enemy.health > 0 && this.isEnemyOnScreen(enemy)).forEach((enemy) => this.damageEnemy(enemy, damage));
      this.spawnSkillImpactBurst(this.player.x, this.player.y, 0xef294d, 1.65 + level * 0.06);
      this.cameras.main.flash(210, 255, 232, 220, false);
      this.cameras.main.shake(760, 0.023 + level * 0.001);
    });
  }

  private castVenomDeathbloom(damage: number): void {
    this.castAnimatedUltimate('venomancer', damage);
    return;
    const level = this.skillUpgradeLevels['deathbloom'] ?? 0;
    const centerX = this.player.x;
    const centerY = this.player.y - 62;
    const skull = this.add.image(centerX, centerY + 95, 'quest-skill-icon-deathbloom')
      .setDisplaySize(96, 96)
      .setDepth(17)
      .setAlpha(0.95)
      .setBlendMode(Phaser.BlendModes.ADD);
    const sigil = this.add.ellipse(centerX, this.player.y + 38, 125, 42, 0x5c238c, 0.28)
      .setStrokeStyle(6, 0xb7ff54, 0.95)
      .setDepth(14)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: skull, y: centerY, displayWidth: 290 + level * 14, displayHeight: 290 + level * 14, angle: 18, duration: 540, ease: 'Back.Out' });
    this.tweens.add({ targets: skull, scaleX: skull.scaleX * 1.13, scaleY: skull.scaleY * 1.13, alpha: 0.72, duration: 170, yoyo: true, repeat: 8, ease: 'Sine.InOut' });
    this.tweens.add({ targets: sigil, scaleX: 3.5, scaleY: 2.1, angle: 240, alpha: 0.1, duration: 1_650, ease: 'Sine.Out' });

    for (let pulse = 0; pulse < 7; pulse += 1) {
      this.time.delayedCall(430 + pulse * 150, () => {
        if (this.finished) return;
        const wave = this.add.circle(centerX, centerY + 36, 42 + pulse * 10, pulse % 2 === 0 ? 0x80e83f : 0x672a9a, 0.2)
          .setStrokeStyle(6, pulse % 2 === 0 ? 0xcaff77 : 0xb66cff, 0.92)
          .setDepth(15)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: wave, scale: 5 + pulse * 0.42, angle: wave.angle + 130, alpha: 0, duration: 720, ease: 'Cubic.Out', onComplete: () => wave.destroy() });
        this.showInnateSkillEffect('deathbloom', centerX + Phaser.Math.Between(-280, 280), this.player.y + Phaser.Math.Between(-35, 35), 130 + pulse * 17, 540, pulse * 39);
        this.spawnInnateParticles(centerX, centerY, 18 + level * 2, 190 + pulse * 25);
        this.damageEnemiesInArea(centerX, 270 + pulse * 38 + level * 9, Math.max(1, Math.ceil(damage / 4)), 300);
        this.cameras.main.shake(150, 0.007 + pulse * 0.0012);
      });
    }

    this.time.delayedCall(1_520, () => {
      if (this.finished) return;
      skull.destroy();
      sigil.destroy();
      this.spawnSkillImpactBurst(centerX, this.player.y, 0x80e83f, 1.75 + level * 0.07);
      this.damageEnemiesInArea(centerX, 560 + level * 20, damage, 350);
      this.cameras.main.flash(230, 126, 255, 80, false);
      this.cameras.main.shake(780, 0.026 + level * 0.001);
    });
  }

  private castFlamePillar(damage: number): void {
    const level = this.skillUpgradeLevels['flame-pillar'] ?? 0;
    const centerX = this.player.x;
    const offsets = [-300, -200, -100, 0, 100, 200, 300];
    offsets.forEach((offset, index) => this.time.delayedCall(index * 72, () => {
      if (this.finished) return;
      const x = Phaser.Math.Clamp(centerX + offset, 55, WORLD_WIDTH - 55);
      const baseY = this.player.y + 38;
      const pillar = this.add.image(x, baseY, 'quest-skill-icon-flame-pillar')
        .setDisplaySize(108 + level * 5, 108 + level * 5)
        .setOrigin(0.5, 0.82)
        .setScale(0.42, 0.12)
        .setDepth(14)
        .setAlpha(0.9)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: pillar,
        scaleX: 1.05 + level * 0.035,
        scaleY: 2.15 + level * 0.08,
        y: baseY - 48 - level * 3,
        alpha: 0,
        duration: 610,
        ease: 'Back.Out',
        onComplete: () => pillar.destroy(),
      });
      const ignition = this.add.ellipse(x, baseY, 84, 24, 0xff542e, 0.34)
        .setStrokeStyle(4, 0xffd45c, 0.95)
        .setDepth(13)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ignition, scaleX: 2.15, scaleY: 1.5, alpha: 0, duration: 480, onComplete: () => ignition.destroy() });
      this.spawnInnateParticles(x, baseY - 30, 14 + level * 2, 120 + level * 10);
      this.damageEnemiesInArea(x, 92 + level * 4, Math.max(1, Math.ceil(damage / 2)), 175);
    }));
    this.cameras.main.flash(105, 255, 86, 30, false);
    this.cameras.main.shake(620, 0.013 + level * 0.0007);
  }

  private castSolarCataclysm(damage: number): void {
    this.castAnimatedUltimate('pyromancer', damage);
    return;
    const level = this.skillUpgradeLevels['solar-cataclysm'] ?? 0;
    const centerX = this.player.x;
    const centerY = this.player.y - 205;
    const sun = this.add.image(centerX, this.player.y + 20, 'quest-skill-icon-solar-cataclysm')
      .setDisplaySize(92, 92)
      .setDepth(16)
      .setAlpha(0.96)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: sun, y: centerY, displayWidth: 285 + level * 14, displayHeight: 285 + level * 14, angle: 240, duration: 620, ease: 'Back.Out' });
    this.tweens.add({ targets: sun, scaleX: sun.scaleX * 1.12, scaleY: sun.scaleY * 1.12, alpha: 0.78, duration: 180, yoyo: true, repeat: 7, ease: 'Sine.InOut' });

    for (let pulse = 0; pulse < 6; pulse += 1) {
      this.time.delayedCall(520 + pulse * 165, () => {
        if (this.finished) return;
        const ring = this.add.circle(centerX, centerY, 48 + pulse * 12, pulse % 2 === 0 ? 0xff6a25 : 0xffd85a, 0.22)
          .setStrokeStyle(6, pulse % 2 === 0 ? 0xfff0a0 : 0xff792e, 0.96)
          .setDepth(15)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: ring, scale: 5.2 + pulse * 0.35, alpha: 0, duration: 720, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
        this.showInnateSkillEffect('solar-cataclysm', centerX + Phaser.Math.Between(-240, 240), this.player.y + Phaser.Math.Between(-30, 35), 155 + pulse * 18, 560, pulse * 38);
        this.spawnInnateParticles(centerX, centerY, 18 + level * 2, 210 + pulse * 24);
        this.damageEnemiesInArea(centerX, 300 + pulse * 34 + level * 10, Math.max(1, Math.ceil(damage / 4)), 300);
        this.cameras.main.shake(180, 0.008 + pulse * 0.0015);
      });
    }

    this.time.delayedCall(1_520, () => {
      if (this.finished) return;
      sun.destroy();
      this.spawnSkillImpactBurst(centerX, this.player.y, 0xffd85a, 1.8 + level * 0.07);
      this.damageEnemiesInArea(centerX, 570 + level * 20, damage, 340);
      this.cameras.main.flash(260, 255, 214, 92, false);
      this.cameras.main.shake(760, 0.026 + level * 0.001);
    });
  }

  private castSkybreakerQuake(damage: number, time: number): void {
    this.castAnimatedUltimate('kickfighter', damage);
    return;
    const level = this.skillUpgradeLevels['skybreaker-combo'] ?? 0;
    const startX = this.player.x;
    const startY = this.player.y;
    const direction = this.player.flipX ? -1 : 1;
    const impactX = Phaser.Math.Clamp(startX + direction * 90, 70, WORLD_WIDTH - 70);
    this.defenseUntil = Math.max(this.defenseUntil, time + 850);
    this.player.setVelocity(direction * 150, -690 - level * 12);

    const sole = this.add.ellipse(0, 10, 104, 184, 0x45e6d1, 0.46).setStrokeStyle(7, 0xffd65a, 0.95);
    const heel = this.add.ellipse(-20, 82, 76, 70, 0x1d9f9c, 0.58).setStrokeStyle(5, 0xffffff, 0.88);
    const toes = [
      this.add.circle(-39, -79, 18, 0x45e6d1, 0.58),
      this.add.circle(-14, -91, 20, 0x45e6d1, 0.62),
      this.add.circle(14, -89, 19, 0x45e6d1, 0.6),
      this.add.circle(39, -75, 16, 0x45e6d1, 0.56),
    ];
    toes.forEach((toe) => toe.setStrokeStyle(4, 0xffe483, 0.94));
    const giantFoot = this.add.container(impactX, startY - 390, [sole, heel, ...toes])
      .setDepth(17)
      .setScale(1.15 + level * 0.045)
      .setAngle(direction * -12)
      .setAlpha(0.94)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: giantFoot,
      y: startY + 10,
      angle: direction * 4,
      scaleX: giantFoot.scaleX * 1.32,
      scaleY: giantFoot.scaleY * 1.32,
      duration: 610,
      ease: 'Expo.In',
      onComplete: () => {
        giantFoot.destroy(true);
        const body = this.player.body;
        if (body instanceof Phaser.Physics.Arcade.Body) body.reset(impactX, startY);
        else this.player.setPosition(impactX, startY);
        this.player.setVelocity(0, 0);
        this.showInnateSkillEffect('skybreaker-combo', impactX, startY + 12, 340 + level * 14, 760);
        const cracks = this.add.graphics({ x: impactX, y: startY + 40 }).setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
        cracks.lineStyle(7, 0xffd65a, 0.95);
        for (let ray = 0; ray < 14; ray += 1) {
          const angle = (Math.PI * 2 * ray) / 14;
          const length = 120 + (ray % 4) * 48 + level * 7;
          cracks.lineBetween(0, 0, Math.cos(angle) * length, Math.sin(angle) * length * 0.34);
        }
        this.tweens.add({ targets: cracks, scaleX: 1.55, scaleY: 1.3, alpha: 0, duration: 780, ease: 'Cubic.Out', onComplete: () => cracks.destroy() });
        for (let pulse = 0; pulse < 4; pulse += 1) {
          this.time.delayedCall(pulse * 95, () => {
            const quake = this.add.ellipse(impactX, startY + 42, 95 + pulse * 36, 30 + pulse * 9, pulse % 2 === 0 ? 0x45e6d1 : 0xffd65a, 0.22)
              .setStrokeStyle(5, pulse % 2 === 0 ? 0xffffff : 0xffd65a, 0.94)
              .setDepth(14)
              .setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({ targets: quake, scaleX: 4.3, scaleY: 2.1, alpha: 0, duration: 620 + pulse * 80, ease: 'Cubic.Out', onComplete: () => quake.destroy() });
            this.damageEnemiesInArea(impactX, 260 + pulse * 58 + level * 10, Math.max(1, Math.ceil(damage / 3)), 220);
          });
        }
        this.spawnInnateParticles(impactX, startY + 24, 48 + level * 4, 320 + level * 15);
        this.damageEnemiesInArea(impactX, 520 + level * 18, damage, 245);
        this.cameras.main.flash(180, 130, 245, 230, false);
        this.cameras.main.shake(850, 0.03 + level * 0.001);
      },
    });
    this.time.delayedCall(320, () => {
      if (!this.finished) this.player.setVelocity(direction * 210, 820);
    });
  }

  private castRagnarokCyclone(damage: number): void {
    const level = this.skillUpgradeLevels['ragnarok-cleaver'] ?? 0;
    const centerX = this.player.x;
    const centerY = this.player.y - 8;
    const axeCount = 4 + (level >= 4 ? 2 : 0);
    const axes = Array.from({ length: axeCount }, (_, index) => this.add.image(centerX, centerY, 'quest-skill-icon-ragnarok-cleaver')
      .setDisplaySize(128 + level * 6, 128 + level * 6)
      .setDepth(16)
      .setAlpha(0.96)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAngle(index * (360 / axeCount)));

    axes.forEach((axe, index) => {
      this.tweens.addCounter({
        from: 0,
        to: 720,
        duration: 1_250,
        ease: 'Cubic.InOut',
        onUpdate: (tween) => {
          const progress = tween.getValue() ?? 0;
          const angle = Phaser.Math.DegToRad(progress + index * (360 / axeCount));
          const radius = 92 + Math.sin(Phaser.Math.DegToRad(progress * 0.5)) * 58 + level * 4;
          axe.setPosition(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius * 0.62);
          axe.setAngle(progress * 1.7 + index * 45);
        },
        onComplete: () => axe.destroy(),
      });
    });

    for (let pulse = 0; pulse < 6; pulse += 1) {
      this.time.delayedCall(pulse * 145, () => {
        if (this.finished) return;
        const vortex = this.add.ellipse(centerX, centerY + 20, 105 + pulse * 32, 62 + pulse * 14, 0x8e1028, 0.18)
          .setStrokeStyle(5 + Math.min(level, 4), pulse % 2 === 0 ? 0xff304f : 0xffa047, 0.92)
          .setDepth(14)
          .setAngle(pulse * 28)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: vortex, scale: 2.25, angle: vortex.angle + 190, alpha: 0, duration: 620, ease: 'Cubic.Out', onComplete: () => vortex.destroy() });
        this.showInnateSkillEffect('blood-cyclone', centerX, centerY, 155 + pulse * 25, 520, pulse * 45);
        this.spawnInnateParticles(centerX, centerY, 16 + level * 2, 150 + pulse * 24);
        this.damageEnemiesInArea(centerX, 235 + pulse * 22, Math.max(1, Math.ceil(damage / 4)), 190);
      });
    }

    this.time.delayedCall(930, () => {
      if (this.finished) return;
      this.showInnateSkillEffect('ragnarok-cleaver', centerX, centerY, 390 + level * 15, 840);
      this.spawnSkillImpactBurst(centerX, centerY, 0xff243f, 1.55 + level * 0.06);
      this.damageEnemiesInArea(centerX, 470 + level * 18, damage, 230);
      this.cameras.main.flash(180, 180, 15, 35, false);
      this.cameras.main.shake(760, 0.025 + level * 0.001);
    });
  }

  private castAssetTycoonSkill(skillId: string, time: number): void {
    if (!isSecretCharacter(this.characterId)) return;
    const skill = assetTycoonSkills.find((entry) => entry.id === skillId);
    if (!skill) return;
    const damage = this.skillDamage(skillId, skill.damage + 7);
    const direction = this.player.flipX ? -1 : 1;
    this.showAssetTycoonCallout(skill.name);
    if (skill.key === 'T') {
      this.castAnimatedUltimate('assettycoon', damage);
      return;
    }

    if ('buff' in skill && skill.buff) {
      const duration = skillId === 'loss-recovery' ? 12_000 : 8_000;
      this.classPowerMultiplier = skillId === 'loss-recovery' ? 2.35 : 1.9;
      this.classMovementSpeed = 340;
      this.activeDefenseReduction = 5;
      this.classPowerUntil = time + duration;
      this.defenseUntil = time + duration;
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 12);
      this.healthBar.width = 200 * (this.playerHealth / this.playerMaxHealth);
      this.showInnateSkillEffect(skillId, this.player.x, this.player.y, 230, duration);
      this.spawnInnateParticles(this.player.x, this.player.y, 48, 250);
      return;
    }
    if (skill.key === 'Q' || skill.key === 'E') {
      const count = skill.key === 'E' ? 5 : 1;
      for (let index = 0; index < count; index += 1) {
        const angle = count === 1 ? 0 : (index - 2) * 0.14;
        this.launchInnateProjectile(skillId, Math.max(1, Math.ceil(damage / (count === 1 ? 1 : 2))), 920, time, skill.key === 'E' ? 88 : 125, angle);
      }
      return;
    }
    if (skill.key === 'W' || skill.key === 'Z') {
      const count = skill.key === 'Z' ? 6 : 4;
      for (let index = 0; index < count; index += 1) this.time.delayedCall(index * 75, () => {
        const x = this.player.x + direction * 160 + (index - (count - 1) / 2) * 125;
        this.showInnateSkillEffect(skillId, x, this.player.y + 28, 190, 620, index * 24);
        this.damageEnemiesInArea(x, 135, Math.max(1, Math.ceil(damage / 2)), 150);
      });
      return;
    }
    if (skill.key === 'C') {
      [0, 80, 160, 240, 320].forEach((delay, index) => this.time.delayedCall(delay, () => {
        const radius = 120 + index * 60;
        this.showInnateSkillEffect(skillId, this.player.x, this.player.y, radius * 2, 560, index * 48);
        this.damageEnemiesInArea(this.player.x, radius, Math.max(1, Math.ceil(damage / 3)), 210);
      }));
      return;
    }
    const radius = 850;
    const repeats = 5;
    for (let index = 0; index < repeats; index += 1) this.time.delayedCall(index * 95, () => {
      const x = Phaser.Math.Clamp(this.player.x + (index - (repeats - 1) / 2) * 150, 80, WORLD_WIDTH - 80);
      this.showInnateSkillEffect(skillId, x, this.player.y - 40, 245, 820, index * 39);
      this.spawnInnateParticles(x, this.player.y, 22, 230);
    });
    this.time.delayedCall(360, () => this.damageEnemiesInArea(this.player.x, radius, damage, 360));
    this.cameras.main.flash(260, 255, 216, 90, false);
    this.cameras.main.shake(620, 0.018);
  }

  private showAssetTycoonCallout(skillName: string): void {
    const label = this.add.text(0, 0, `${skillName}!`, {
      fontFamily: 'Pretendard, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffe071',
      stroke: '#1b1000', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5);
    const callout = this.add.container(this.player.x, this.player.y - 98, [label]).setDepth(30);
    this.tweens.add({ targets: label, y: -34, scale: 1.13, duration: 900, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: callout, alpha: 0, duration: 900, onUpdate: () => callout.setPosition(this.player.x, this.player.y - 98), onComplete: () => callout.destroy(true) });
  }

  private castShadowReversal(damage: number, time: number): void {
    const target = this.enemies
      .filter((enemy) => enemy.health > 0 && enemy.revealed && Math.abs(enemy.sprite.x - this.player.x) <= 580)
      .sort((left, right) => Math.abs(left.sprite.x - this.player.x) - Math.abs(right.sprite.x - this.player.x))[0];
    const startX = this.player.x;
    const startY = this.player.y;
    if (!target) {
      const direction = this.player.flipX ? -1 : 1;
      this.player.setX(Phaser.Math.Clamp(this.player.x + direction * 210, 40, WORLD_WIDTH - 40));
      this.showInnateSkillEffect('shadow-reversal', this.player.x, this.player.y, 145, 420);
      this.spawnInnateParticles((startX + this.player.x) / 2, startY, 22, 220);
      return;
    }
    const approachedFromLeft = this.player.x < target.sprite.x;
    const destination = Phaser.Math.Clamp(target.sprite.x + (approachedFromLeft ? 76 : -76), 40, WORLD_WIDTH - 40);
    const body = this.player.body;
    if (body instanceof Phaser.Physics.Arcade.Body) body.reset(destination, startY);
    else this.player.setPosition(destination, startY);
    this.player.setFlipX(approachedFromLeft);
    this.player.setVelocity(0, 0);
    this.defenseUntil = Math.max(this.defenseUntil, time + 700);
    this.showInnateSkillEffect('shadow-reversal', startX, startY, 120, 360);
    this.showInnateSkillEffect('shadow-reversal', destination, startY, 168, 520, approachedFromLeft ? -18 : 18);
    this.spawnInnateParticles((startX + destination) / 2, startY, 28, Math.abs(destination - startX));
    this.damageEnemy(target, damage);
    this.cameras.main.flash(80, 70, 215, 255, false);
  }

  private castInnateBuff(skillId: string, time: number): void {
    const level = this.skillUpgradeLevels[skillId] ?? 0;
    const duration = 5_000 + level * 500;
    this.classPowerMultiplier = 1.3 + level * 0.05;
    this.classMovementSpeed = 270 + level * 7;
    this.activeDefenseReduction = 1 + Math.floor(level / 3);
    this.classPowerUntil = time + duration;
    this.defenseUntil = Math.max(this.defenseUntil, time + duration);
    this.classBuffAura?.destroy();
    this.classBuffAura = this.add.ellipse(this.player.x, this.player.y + 18, 98, 124, this.skillAccentColor, 0.18)
      .setStrokeStyle(4, this.skillAccentColor, 0.9)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.classBuffAura, scaleX: 1.18, scaleY: 1.1, alpha: 0.36, duration: 420, yoyo: true, repeat: -1 });
    this.showInnateSkillEffect(skillId, this.player.x, this.player.y, 180, 780);
    this.spawnInnateParticles(this.player.x, this.player.y, 30, 170);
    const flash = this.characterId === 'dualblade' ? [55, 200, 255] : this.characterId === 'dragonknight' ? [255, 72, 35] : this.characterId === 'gunslinger' ? [80, 225, 255] : [255, 155, 45];
    this.cameras.main.flash(120, flash[0], flash[1], flash[2], false);
  }

  private castDraconicThrust(damage: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const level = this.skillUpgradeLevels['draconic-thrust'] ?? 0;
    this.player.setVelocityX(direction * (420 + level * 12));
    for (let index = 0; index < 3; index += 1) this.time.delayedCall(index * 58, () => {
      if (this.finished) return;
      const x = this.player.x + direction * (72 + index * 42);
      const spiral = this.add.ellipse(x, this.player.y - 6, 74 + index * 18, 126 + index * 16, 0xff4c26, 0.1)
        .setStrokeStyle(6, index === 1 ? 0xfff0a3 : 0xff6233, 0.96)
        .setDepth(15).setAngle(direction * (35 + index * 22)).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: spiral, scaleX: 2.6, scaleY: 1.25, angle: spiral.angle + direction * 90, alpha: 0, duration: 380, onComplete: () => spiral.destroy() });
      this.showInnateSkillEffect('draconic-thrust', x, this.player.y, 142 + index * 20, 360, direction * index * 22);
      this.spawnInnateParticles(x, this.player.y, 18 + level * 2, 150 + index * 25);
    });
    [-0.06, 0, 0.06].forEach((angle, index) => this.time.delayedCall(index * 54, () => {
      if (!this.finished) this.launchInnateProjectile('draconic-thrust', Math.max(1, Math.ceil(damage / 2)), 760 + index * 55, this.time.now, 138 + level * 5, angle);
    }));
    this.time.delayedCall(230, () => {
      if (this.finished) return;
      this.player.setVelocityX(0);
      this.cameras.main.flash(90, 255, 84, 34, false);
      this.cameras.main.shake(240, 0.012);
    });
  }

  private castCataclysmDragonBreath(damage: number): void {
    const level = this.skillUpgradeLevels['cataclysm-wyvern'] ?? 0;
    const camera = this.cameras.main;
    const dragon = this.add.sprite(camera.width * 0.39, camera.height * 0.43, 'quest-dragon-breath-vfx', 0)
      .setScrollFactor(0).setDepth(30).setDisplaySize(Math.min(camera.width * 0.96, 1_080), Math.min(camera.height * 0.7, 500))
      .setAlpha(0.98).setBlendMode(Phaser.BlendModes.ADD);
    dragon.play('dragon-hq-cataclysm-breath');
    dragon.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => dragon.destroy());
    for (let pulse = 0; pulse < 9; pulse += 1) this.time.delayedCall(420 + pulse * 145, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(camera.worldView.centerX, camera.worldView.width * 0.7, Math.max(1, Math.ceil(damage / 4)), 460);
      this.cameras.main.shake(150, 0.009 + pulse * 0.001);
    });
    this.time.delayedCall(1_720, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(camera.worldView.centerX, camera.worldView.width * 0.76, damage, 480);
      this.cameras.main.flash(260, 255, 103, 35, false);
      this.cameras.main.shake(720, 0.028 + level * 0.001);
    });
  }

  private castMoonlitDraw(damage: number, time: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const level = this.skillUpgradeLevels['moonlit-draw'] ?? 0;
    const slashCount = 3 + Math.min(2, Math.floor(level / 3));
    const startX = this.player.x;
    this.player.setVelocityX(direction * (610 + level * 18));
    this.defenseUntil = Math.max(this.defenseUntil, time + 360);

    for (let index = 0; index < slashCount; index += 1) {
      this.time.delayedCall(index * 62, () => {
        if (this.finished) return;
        const x = startX + direction * (72 + index * 50);
        const y = this.player.y + (index % 2 === 0 ? -12 : 14);
        this.showInnateSkillEffect('moonlit-draw', x, y, 132 + index * 12, 330, direction * (index % 2 === 0 ? 28 : -24));
        this.spawnInnateParticles(x, y, 12 + level * 2, 115 + level * 10);
        const arc = this.add.ellipse(x, y, 94 + index * 12, 150 + index * 8, 0xef5568, 0.04)
          .setStrokeStyle(5 + Math.min(level, 5), index % 2 === 0 ? 0xfff4dd : 0x8cecff, 0.94)
          .setDepth(14)
          .setAngle(direction * (index % 2 === 0 ? 42 : -38))
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: arc,
          scaleX: 1.8,
          scaleY: 1.15,
          alpha: 0,
          angle: arc.angle + direction * 54,
          duration: 270,
          ease: 'Cubic.Out',
          onComplete: () => arc.destroy(),
        });
      });
    }

    this.time.delayedCall(slashCount * 62, () => {
      if (this.finished) return;
      this.player.setVelocityX(0);
      this.launchInnateProjectile('moonlit-draw', damage, 820 + level * 20, this.time.now, 148 + level * 5);
      const finishX = this.player.x + direction * 84;
      this.spawnSkillImpactBurst(finishX, this.player.y, 0xef5568, 1.05 + level * 0.04);
      this.cameras.main.shake(170 + level * 12, 0.009 + level * 0.0008);
      this.cameras.main.flash(75, 239, 85, 104, false);
    });
  }

  private castVenomNeedle(damage: number, time: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const level = this.skillUpgradeLevels['venom-needle'] ?? 0;
    const needleCount = 3 + (level >= 3 ? 1 : 0) + (level >= 6 ? 1 : 0);
    const splitDamage = Math.max(1, Math.ceil(damage / 2));
    const destinationX = this.player.x + direction * (290 + level * 12);
    this.defenseUntil = Math.max(this.defenseUntil, time + 240);

    for (let index = 0; index < needleCount; index += 1) {
      this.time.delayedCall(index * 54, () => {
        if (this.finished) return;
        const center = (needleCount - 1) / 2;
        const angle = (index - center) * 0.055;
        this.launchInnateProjectile('venom-needle', splitDamage, 790 + index * 24, this.time.now, 82 + level * 4, angle);
        this.showInnateSkillEffect('venom-needle', this.player.x + direction * 70, this.player.y + (index - center) * 12, 92 + index * 4, 280, direction * index * 18);
      });
    }

    [0, 1, 2].forEach((segment) => this.time.delayedCall(90 + segment * 95, () => {
      if (this.finished) return;
      const x = this.player.x + direction * (105 + segment * 92);
      const pool = this.add.ellipse(x, this.player.y + 35, 92 + level * 7, 30 + level * 2, 0x72e63d, 0.22)
        .setStrokeStyle(3, segment % 2 === 0 ? 0xb8ff62 : 0x7132a8, 0.92)
        .setDepth(11)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: pool,
        scaleX: 1.65,
        scaleY: 1.3,
        alpha: 0,
        duration: 720 + level * 45,
        ease: 'Sine.Out',
        onComplete: () => pool.destroy(),
      });
      this.spawnInnateParticles(x, this.player.y + 12, 10 + level * 2, 82 + level * 8);
    }));

    this.time.delayedCall(330, () => {
      if (this.finished) return;
      this.showInnateSkillEffect('deathbloom', destinationX, this.player.y - 2, 150 + level * 8, 620, direction * 12);
      this.spawnSkillImpactBurst(destinationX, this.player.y, 0x80e83f, 0.95 + level * 0.05);
      const mist = this.add.circle(destinationX, this.player.y, 38 + level * 4, 0x5f298f, 0.3)
        .setStrokeStyle(4, 0xb8ff62, 0.86)
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: mist, scale: 3.2, alpha: 0, duration: 760, ease: 'Cubic.Out', onComplete: () => mist.destroy() });
      this.cameras.main.shake(150 + level * 10, 0.006 + level * 0.0006);
    });
  }

  private launchInnateProjectile(skillId: string, damage: number, speed: number, time: number, displaySize: number, angle = 0): void {
    const direction = this.player.flipX ? -1 : 1;
    const projectile = this.physics.add.image(this.player.x + direction * 66, this.player.y - 4, `quest-skill-icon-${skillId}`)
      .setDisplaySize(displaySize, displaySize)
      .setDepth(13)
      .setFlipX(direction < 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    projectile.body?.setAllowGravity(false);
    if (projectile.body instanceof Phaser.Physics.Arcade.Body) projectile.body.setSize(displaySize * 0.56, displaySize * 0.46, true);
    projectile.setVelocity(direction * Math.cos(angle) * speed, Math.sin(angle) * speed);
    const piercing = isSecretCharacter(this.characterId) || skillId === 'crescent-fang' || skillId === 'draconic-thrust' || skillId === 'ricochet-round' || skillId === 'quickdraw'
      || skillId === 'moonlit-draw' || skillId === 'venom-needle' || skillId === 'ember-lance' || skillId === 'rending-arc';
    this.playerSkillProjectiles.push({ sprite: projectile, expiresAt: time + PLAYER_SKILL_PROJECTILE_LIFETIME_MS, damage, skillId, piercing, hitEnemyIds: new Set<string>() });
    if (skillId === 'crescent-fang' || skillId === 'moonlit-draw' || skillId === 'rending-arc') {
      this.tweens.add({ targets: projectile, angle: direction * 360, duration: 520, repeat: -1 });
      this.tweens.add({ targets: projectile, scaleX: projectile.scaleX * 1.18, scaleY: projectile.scaleY * 0.82, duration: 125, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else if (skillId === 'venom-needle') {
      this.tweens.add({ targets: projectile, angle: direction * 360, scaleX: projectile.scaleX * 1.22, scaleY: projectile.scaleY * 1.22, duration: 230, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else if (skillId === 'ember-lance') {
      this.tweens.add({ targets: projectile, angle: direction * 75, scaleX: projectile.scaleX * 1.28, scaleY: projectile.scaleY * 0.78, duration: 145, yoyo: true, repeat: -1 });
    } else {
      projectile.setAngle(0);
    }
  }

  private showInnateSkillEffect(skillId: string, x: number, y: number, displaySize: number, duration: number, angle = 0): void {
    const effect = this.add.image(x, y, `quest-skill-icon-${skillId}`)
      .setDisplaySize(displaySize, displaySize)
      .setDepth(14)
      .setAngle(angle)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: effect, alpha: 0, scaleX: effect.scaleX * 1.4, scaleY: effect.scaleY * 1.4, angle: angle + 95, duration, ease: 'Cubic.Out', onComplete: () => effect.destroy() });
  }

  private spawnInnateParticles(x: number, y: number, count: number, spread: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Phaser.Math.FloatBetween(-0.22, 0.22);
      const distance = Phaser.Math.Between(Math.max(24, Math.round(spread * 0.35)), Math.max(30, spread));
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 6), index % 3 === 0 ? 0xffffff : this.skillAccentColor, Phaser.Math.FloatBetween(0.65, 1)).setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance * 0.72, alpha: 0, scale: 0.2, duration: Phaser.Math.Between(320, 680), ease: 'Cubic.Out', onComplete: () => particle.destroy() });
    }
  }

  private spawnClassProjectileTrail(projectile: PlayerSkillProjectile): void {
    const skillId = projectile.skillId;
    if (!skillId || !['moonlit-draw', 'venom-needle', 'ember-lance', 'rending-arc'].includes(skillId)) return;
    const config = skillId === 'moonlit-draw'
      ? { color: 0xef5568, edge: 0xfff4dd, width: 54, height: 18 }
      : skillId === 'venom-needle'
        ? { color: 0x7132a8, edge: 0xb8ff62, width: 34, height: 34 }
        : skillId === 'ember-lance'
          ? { color: 0xff542e, edge: 0xffd66b, width: 58, height: 24 }
          : { color: 0x9b172d, edge: 0xff9b42, width: 62, height: 22 };
    const mote = this.add.ellipse(projectile.sprite.x, projectile.sprite.y, config.width, config.height, config.color, 0.36)
      .setStrokeStyle(2, config.edge, 0.9)
      .setRotation(projectile.sprite.rotation)
      .setDepth(projectile.sprite.depth - 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: mote,
      scaleX: skillId === 'venom-needle' ? 1.6 : 0.35,
      scaleY: skillId === 'venom-needle' ? 1.6 : 0.7,
      angle: mote.angle + (skillId === 'venom-needle' ? 120 : 24),
      alpha: 0,
      duration: skillId === 'venom-needle' ? 360 : 240,
      ease: 'Sine.Out',
      onComplete: () => mote.destroy(),
    });
  }

  private spawnClassProjectileImpact(skillId: string, x: number, y: number): void {
    if (!['moonlit-draw', 'venom-needle', 'ember-lance', 'rending-arc'].includes(skillId)) return;
    const color = skillId === 'moonlit-draw' ? 0xef5568 : skillId === 'venom-needle' ? 0x80e83f : skillId === 'ember-lance' ? 0xff542e : 0x9b172d;
    const edge = skillId === 'venom-needle' ? 0x7132a8 : skillId === 'moonlit-draw' ? 0xfff4dd : 0xffd66b;
    const ringCount = skillId === 'venom-needle' ? 3 : 2;
    for (let index = 0; index < ringCount; index += 1) {
      this.time.delayedCall(index * 55, () => {
        if (this.finished) return;
        const ring = this.add.ellipse(x, y, 54 + index * 18, skillId === 'moonlit-draw' ? 112 : 54 + index * 18, color, 0.2)
          .setStrokeStyle(4, index % 2 === 0 ? edge : 0xffffff, 0.92)
          .setAngle(skillId === 'moonlit-draw' ? (index === 0 ? 42 : -42) : index * 35)
          .setDepth(15)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: ring, scale: 2.15, alpha: 0, angle: ring.angle + 90, duration: 360 + index * 70, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      });
    }
    if (skillId === 'venom-needle') this.showInnateSkillEffect('deathbloom', x, y, 118, 480);
    this.spawnInnateParticles(x, y, skillId === 'venom-needle' ? 22 : 16, skillId === 'moonlit-draw' ? 175 : 125);
  }

  private damageEnemiesInArea(x: number, radius: number, damage: number, verticalRange = 96): void {
    this.enemies
      .filter((enemy) => enemy.health > 0 && Math.abs(enemy.sprite.x - x) <= radius && this.combatFootDistance(enemy) <= verticalRange)
      .forEach((enemy) => this.damageEnemy(enemy, damage));
  }

  private castPoliticalStageSkill(skillId: string, time: number): void {
    if (!isPoliticalCharacter(this.characterId)) return;
    const skill = politicalFighters[this.characterId].skills.find((entry) => `${this.characterId}-${entry.key.toLowerCase()}` === skillId);
    if (!skill) return;
    const damage = this.skillDamage(skillId, skill.damage);
    const direction = this.player.flipX ? -1 : 1;
    const vfxAnimation = `quest-political-${skillId}-vfx`;
    const vfxTexture = `political-vfx-${skillId}`;
    this.showPoliticalSkillCallout(skill.name);

    if (skill.key === 'Q' || (skill.key === 'R' && this.characterId === 'conservative')) {
      const count = skill.key === 'R' ? 3 : 1;
      for (let index = 0; index < count; index += 1) {
        const verticalIndex = count === 1 ? 0 : index - (count - 1) / 2;
        const launchY = this.player.y + (skill.key === 'Q' ? 4 : -12) + verticalIndex * 24;
        const projectile = this.physics.add.sprite(this.player.x + direction * 72, launchY, vfxTexture)
          .setDisplaySize(skill.key === 'R' ? 184 : 162, skill.key === 'R' ? 184 : 162)
          .setDepth(13)
          .setAlpha(1)
          .setFlipX(direction < 0)
          .setBlendMode(Phaser.BlendModes.NORMAL);
        projectile.play(vfxAnimation);
        projectile.body?.setAllowGravity(false);
        const spreadIndex = count === 1 ? 0 : index - (count - 1) / 2;
        this.physics.velocityFromRotation((direction < 0 ? Math.PI : 0) + spreadIndex * 0.13, skill.key === 'R' ? 660 : 760, projectile.body?.velocity);
        this.playerSkillProjectiles.push({ sprite: projectile, expiresAt: time + PLAYER_SKILL_PROJECTILE_LIFETIME_MS, damage });
      }
      return;
    }

    if (skill.key === 'R') {
      this.castPoliticalArea(vfxTexture, vfxAnimation, damage, 235, this.player.x, 'center', 0.72, 1.55, 820);
      return;
    }

    if (skill.key === 'W') {
      if (this.characterId === 'conservative') {
        this.castPoliticalArea(vfxTexture, vfxAnimation, damage, 230, this.player.x, 'ground', 1.25);
        return;
      }
      [-240, 0, 240].forEach((offset, index) => this.time.delayedCall(index * 70, () => {
        this.castPoliticalArea(vfxTexture, vfxAnimation, damage, 140, this.player.x + offset, 'ground', 1.3, 1.45, 820);
      }));
      return;
    }

    if (skill.key === 'E') {
      if (this.characterId === 'conservative') {
        this.defenseUntil = time + 5_000;
      }
      else {
        this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 5);
        this.healthBar.width = 200 * (this.playerHealth / this.playerMaxHealth);
      }
      this.spinPoliticalBody();
      this.castPoliticalBodyBuff(vfxTexture, vfxAnimation, 4_800);
      return;
    }

    if (skill.key === 'Z') {
      [-320, -160, 0, 160, 320].forEach((offset, index) => this.time.delayedCall(index * 80, () => this.castPoliticalArea(vfxTexture, vfxAnimation, damage, 110, this.player.x + offset, 'ground', 1.45, 2.5, 900)));
      return;
    }

    if (skill.key === 'X') {
      if (this.characterId === 'conservative') {
        const bullSize = 260;
        const bull = this.physics.add.sprite(this.player.x + direction * 92, this.player.y + 58 - bullSize / 2, vfxTexture)
          .setDisplaySize(bullSize, bullSize)
          .setDepth(13)
          .setAlpha(1)
          .setFlipX(direction < 0)
          .setBlendMode(Phaser.BlendModes.NORMAL);
        bull.play(vfxAnimation);
        bull.body?.setAllowGravity(false);
        bull.body?.setSize(164, 82);
        bull.setVelocityX(direction * 650);
        this.playerSkillProjectiles.push({
          sprite: bull,
          expiresAt: time + PLAYER_SKILL_PROJECTILE_LIFETIME_MS,
          damage,
          horizontalHitRadius: 112,
          verticalHitRadius: 96,
          piercing: true,
          hitEnemyIds: new Set<string>(),
        });
        return;
      }
      this.castPoliticalArea(vfxTexture, vfxAnimation, damage, 245, this.player.x, 'ground');
      return;
    }

    if (skill.key === 'C') {
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 7);
      this.healthBar.width = 200 * (this.playerHealth / this.playerMaxHealth);
      this.castPoliticalOverhead(vfxTexture, vfxAnimation, 5_200);
      return;
    }

    this.cameras.main.flash(320, this.characterId === 'conservative' ? 255 : 40, this.characterId === 'progressive' ? 220 : 45, 65);
    this.cameras.main.shake(520, 0.013);
    this.castPoliticalArea(vfxTexture, vfxAnimation, damage, 520, this.player.x, 'ground');
  }

  private castPoliticalArea(vfxTexture: string, vfxAnimation: string, damage: number, radius: number, x: number, placement: 'ground' | 'center', visualScaleX = 1, visualScaleY = visualScaleX, duration = 620): void {
    const effectWidth = Math.min(radius * 2 * visualScaleX, 620);
    const effectHeight = Math.min(radius * 1.25 * visualScaleY, 360);
    const effectY = placement === 'ground' ? this.player.y + 58 - effectHeight / 2 : this.player.y - 12;
    const effect = this.add.sprite(Phaser.Math.Clamp(x, 40, WORLD_WIDTH - 40), effectY, vfxTexture)
      .setDisplaySize(effectWidth, effectHeight)
      .setDepth(13)
      .setAlpha(visualScaleX > 1 || visualScaleY > 1 ? 1 : 0.9);
    effect.play(vfxAnimation);
    const glow = this.add.sprite(effect.x, effect.y, vfxTexture)
      .setDisplaySize(effectWidth * 1.07, effectHeight * 1.07)
      .setDepth(14)
      .setAlpha(0.58)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play(vfxAnimation);
    this.spawnSkillImpactBurst(effect.x, placement === 'ground' ? this.player.y + 34 : this.player.y, this.skillAccentColor, Math.min(1.8, 0.75 + radius / 360));
    this.tweens.add({ targets: effect, scaleX: effect.scaleX * 1.18, scaleY: effect.scaleY * 1.42, y: effect.y - 42, alpha: 0, duration, onComplete: () => effect.destroy() });
    this.tweens.add({ targets: glow, scaleX: glow.scaleX * 1.24, scaleY: glow.scaleY * 1.48, y: glow.y - 42, alpha: 0, duration, onComplete: () => glow.destroy() });
    this.enemies.forEach((enemy) => {
      const horizontalHit = Math.abs(enemy.sprite.x - x) <= effectWidth / 2;
      const verticalHit = placement === 'ground'
        ? this.combatFootDistance(enemy) <= 40
        : Math.abs(enemy.sprite.y - this.player.y) <= Math.min(96, effectHeight / 2);
      if (enemy.health > 0 && horizontalHit && verticalHit) this.damageEnemy(enemy, damage);
    });
  }

  private showPoliticalSkillCallout(skillName: string): void {
    if (!isPoliticalCharacter(this.characterId)) return;
    const color = this.characterId === 'conservative' ? '#ff4d55' : '#42a5ff';
    const label = this.add.text(0, 0, `${skillName}!`, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color,
      stroke: '#080b12',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5);
    const callout = this.add.container(this.player.x, this.player.y - 92, [label]).setDepth(30).setAlpha(1);
    this.tweens.add({ targets: label, y: -28, scale: 1.08, duration: 850, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: callout,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeIn',
      onUpdate: () => callout.setPosition(this.player.x, this.player.y - 92),
      onComplete: () => callout.destroy(true),
    });
  }

  private castPoliticalAura(vfxTexture: string, vfxAnimation: string, duration: number): void {
    const aura = this.add.sprite(this.player.x, this.player.y - 14, vfxTexture).setDisplaySize(174, 174).setDepth(12).setAlpha(1).setBlendMode(Phaser.BlendModes.ADD);
    aura.play(vfxAnimation);
    this.tweens.add({
      targets: aura,
      angle: 360,
      alpha: 0,
      duration,
      onUpdate: () => aura.setPosition(this.player.x, this.player.y - 14),
      onComplete: () => aura.destroy(),
    });
  }

  private castPoliticalOverhead(vfxTexture: string, vfxAnimation: string, duration: number): void {
    const effect = this.add.sprite(this.player.x, this.player.y - 72, vfxTexture)
      .setDisplaySize(118, 118)
      .setDepth(14)
      .setAlpha(1);
    effect.play(vfxAnimation);
    const glow = this.add.sprite(this.player.x, this.player.y - 72, vfxTexture)
      .setDisplaySize(138, 138)
      .setDepth(15)
      .setAlpha(0.62)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play(vfxAnimation);
    this.tweens.add({
      targets: effect,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onUpdate: () => effect.setPosition(this.player.x, this.player.y - 72).setAngle(0),
      onComplete: () => effect.destroy(),
    });
    this.tweens.add({
      targets: glow,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onUpdate: () => glow.setPosition(this.player.x, this.player.y - 72).setAngle(0),
      onComplete: () => glow.destroy(),
    });
  }

  private castPoliticalBodyBuff(vfxTexture: string, vfxAnimation: string, duration: number): void {
    if (!isPoliticalCharacter(this.characterId)) return;
    const fighter = politicalFighters[this.characterId];
    const effect = this.add.sprite(0, -8, vfxTexture).setDisplaySize(154, 154).setAlpha(1).play(vfxAnimation);
    const effectGlow = this.add.sprite(0, -8, vfxTexture).setDisplaySize(166, 166).setAlpha(0.52).setBlendMode(Phaser.BlendModes.ADD).play(vfxAnimation);
    const lowerRing = this.add.ellipse(0, 48, 92, 25, fighter.color, 0.13).setStrokeStyle(3, fighter.color, 0.85);
    const upperRing = this.add.ellipse(0, 4, 68, 18, fighter.secondaryColor, 0.06).setStrokeStyle(2, fighter.secondaryColor, 0.72);
    const container = this.add.container(this.player.x, this.player.y, [effect, effectGlow, lowerRing, upperRing]).setDepth(12);
    this.tweens.add({ targets: lowerRing, scaleX: 1.28, scaleY: 1.14, alpha: 0.28, yoyo: true, repeat: -1, duration: 420 });
    this.tweens.add({ targets: upperRing, scaleX: 1.22, scaleY: 1.16, alpha: 0.18, yoyo: true, repeat: -1, duration: 330 });
    this.tweens.add({
      targets: container,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onUpdate: () => container.setPosition(this.player.x, this.player.y),
      onComplete: () => container.destroy(true),
    });
  }

  private spinPoliticalBody(): void {
    const duration = 520;
    this.playerPoseLockedUntil = Math.max(this.playerPoseLockedUntil, this.time.now + duration);
    this.tweens.killTweensOf(this.player);
    this.player.setAngle(0);
    this.tweens.add({
      targets: this.player,
      angle: this.player.flipX ? -360 : 360,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.player.active) this.player.setAngle(0);
      },
    });
  }

  private castIconProjectile(skillId: string, damage: number, speed: number, time: number, angleOffset = 0): void {
    const direction = this.player.flipX ? -1 : 1;
    const archerVfx = this.characterId === 'archer';
    const projectile = archerVfx
      ? this.physics.add.sprite(this.player.x + direction * 62, this.player.y - 8, `quest-archer-vfx-${skillId}`)
      : this.physics.add.image(this.player.x + direction * 62, this.player.y - 8, `quest-enhanced-${skillId}`);
    projectile
      .setDisplaySize(archerVfx ? (skillId === 'split-shot' ? 154 : 138) : 112, archerVfx ? 100 : 72)
      .setDepth(13)
      .setFlipX(direction < 0);
    if (projectile instanceof Phaser.Physics.Arcade.Sprite) projectile.play(`archer-vfx-${skillId}`);
    if (archerVfx) projectile.setBlendMode(Phaser.BlendModes.ADD);
    projectile.body?.setAllowGravity(false);
    this.physics.velocityFromRotation((direction < 0 ? Math.PI : 0) + angleOffset, speed, projectile.body?.velocity);
    this.playerSkillProjectiles.push({ sprite: projectile, expiresAt: time + PLAYER_SKILL_PROJECTILE_LIFETIME_MS, damage });
  }

  private castIconArea(skillId: string, damage: number, radius: number): void {
    const animatedClassVfx = this.characterId === 'archer' || this.characterId === 'spellblade';
    const effect = animatedClassVfx
      ? this.add.sprite(this.player.x, this.player.y + (this.characterId === 'archer' ? 24 : 0), `quest-${this.characterId}-vfx-${skillId}`).play(`${this.characterId}-vfx-${skillId}`)
      : this.add.image(this.player.x, this.player.y, `quest-enhanced-${skillId}`);
    effect.setDisplaySize(radius * 2, radius * 2).setDepth(13).setAlpha(0.94);
    if (this.characterId === 'archer') effect.setBlendMode(Phaser.BlendModes.ADD);
    else if (this.characterId === 'spellblade') effect.setBlendMode(Phaser.BlendModes.NORMAL).setAlpha(1);
    this.enemies.forEach((enemy) => {
      const horizontalHit = Math.abs(enemy.sprite.x - this.player.x) <= radius;
      const verticalHit = this.combatFootDistance(enemy) <= Math.min(40, radius * 0.35);
      if (enemy.health > 0 && horizontalHit && verticalHit) this.damageEnemy(enemy, damage);
    });
    this.tweens.add({ targets: effect, scaleX: effect.scaleX * 1.18, scaleY: effect.scaleY * 1.18, alpha: 0, duration: 570, onComplete: () => effect.destroy() });
  }

  private castMobilitySkill(skillId: string, damage: number): void {
    const direction = this.player.flipX ? -1 : 1;
    this.player.setVelocityX(direction * 620);
    this.castIconArea(skillId, damage, 125);
  }

  private castAbyssRush(skillId: string, damage: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const startX = this.player.x;
    const endX = Phaser.Math.Clamp(startX + direction * 250, 24, WORLD_WIDTH - 24);
    const effect = this.add.sprite((startX + endX) / 2, this.player.y - 4, `quest-spellblade-vfx-${skillId}`)
      .setDisplaySize(330, 120)
      .setFlipX(direction < 0)
      .setDepth(14)
      .setAlpha(0.98)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .play(`spellblade-vfx-${skillId}`);
    this.spawnSkillImpactBurst(this.player.x + direction * 74, this.player.y, 0xef294d, 0.9);
    this.player.setVelocityX(direction * 760);
    this.enemies.forEach((enemy) => {
      const withinPath = enemy.sprite.x >= Math.min(startX, endX) - 45 && enemy.sprite.x <= Math.max(startX, endX) + 45;
      if (enemy.health > 0 && withinPath && this.combatFootDistance(enemy) <= 40) this.damageEnemy(enemy, damage);
    });
    effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => effect.destroy());
  }

  private castBloodMoon(skillId: string, damage: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const centerX = this.player.x + direction * 105;
    const effect = this.add.sprite(centerX, this.player.y - 4, `quest-spellblade-vfx-${skillId}`)
      .setDisplaySize(310, 270)
      .setFlipX(direction < 0)
      .setDepth(13)
      .setAlpha(0.98)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .play(`spellblade-vfx-${skillId}`);
    this.spawnSkillImpactBurst(centerX, this.player.y + 12, 0xef294d, 1.15);
    this.enemies.forEach((enemy) => {
      const inFront = direction > 0 ? enemy.sprite.x >= this.player.x - 20 : enemy.sprite.x <= this.player.x + 20;
      if (enemy.health > 0 && inFront
        && Math.abs(enemy.sprite.x - centerX) <= 205
        && this.combatFootDistance(enemy) <= 40) {
        this.damageEnemy(enemy, damage);
      }
    });
    effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => effect.destroy());
  }

  private castForwardEruption(skillId: string, damage: number, distance: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const x = this.player.x + direction * distance;
    const effect = this.add.sprite(x, this.player.y + 12, `quest-spellblade-vfx-${skillId}`)
      .setDisplaySize(270, 300)
      .setDepth(13)
      .setOrigin(0.5, 0.72)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .play(`spellblade-vfx-${skillId}`);
    this.spawnSkillImpactBurst(x, this.player.y + 28, 0xef294d, 1.05);
    this.enemies.forEach((enemy) => {
      if (enemy.health > 0
        && Math.abs(enemy.sprite.x - x) <= 165
        && this.combatFootDistance(enemy) <= 40) this.damageEnemy(enemy, damage);
    });
    effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => effect.destroy());
    this.cameras.main.shake(150, 0.007);
  }

  private castClassBuff(skillId: string, time: number): void {
    const level = this.skillUpgradeLevels[skillId] ?? 0;
    const duration = 4_000 + level * 500;
    this.activeDefenseReduction = 1 + Math.floor(level / 3);
    this.defenseUntil = time + duration;
    const animatedClassVfx = this.characterId === 'archer' || this.characterId === 'spellblade';
    const aura = animatedClassVfx
      ? this.add.sprite(this.player.x, this.player.y - 8, `quest-${this.characterId}-vfx-${skillId}`).play(`${this.characterId}-vfx-${skillId}`)
      : this.add.image(this.player.x, this.player.y, `quest-enhanced-${skillId}`);
    aura
      .setDisplaySize(animatedClassVfx ? 230 : 170, animatedClassVfx ? 230 : 170)
      .setDepth(12)
      .setAlpha(0.9);
    if (this.characterId === 'archer') aura.setBlendMode(Phaser.BlendModes.ADD);
    else if (this.characterId === 'spellblade') {
      aura.setBlendMode(Phaser.BlendModes.NORMAL).setAlpha(1);
      this.spawnSkillImpactBurst(this.player.x, this.player.y + 18, 0xef294d, 1.05);
    }
    this.tweens.add({
      targets: aura,
      alpha: 0.18,
      duration,
      ease: 'Sine.InOut',
      onUpdate: () => aura.setPosition(this.player.x, this.player.y),
      onComplete: () => aura.destroy(),
    });
  }

  private castArrowRain(damage: number): void {
    const targets = this.enemies.filter((enemy) => enemy.health > 0
      && this.isEnemyOnScreen(enemy)
      && Math.abs(enemy.sprite.x - this.player.x) <= 340);
    const centerX = this.player.x;
    const storm = this.add.sprite(centerX, this.player.y - 70, 'quest-archer-vfx-emerald-rain')
      .setDisplaySize(660, 660)
      .setDepth(13)
      .setAlpha(0.96)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play('archer-vfx-emerald-rain');
    storm.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => storm.destroy());
    const targetImpacts = targets.map((enemy) => ({ enemy, x: enemy.sprite.x, y: enemy.sprite.y }));
    const impactPoints = Array.from({ length: 11 }, (_, index) => ({ x: centerX + (index - 5) * 68, y: 410 + Phaser.Math.Between(-18, 18) }));
    impactPoints.push(...targetImpacts.map(({ x, y }) => ({ x, y })));
    impactPoints.forEach(({ x, y }, index) => this.time.delayedCall(index * 34, () => {
      const targetY = y;
      const arrow = this.add.sprite(x, targetY - 330, 'quest-archer-vfx-gale-arrow')
        .setDisplaySize(98, 62)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(72)
        .setDepth(14)
        .setAlpha(0.95)
        .play('archer-vfx-gale-arrow');
      this.tweens.add({ targets: arrow, y: targetY, alpha: 0.15, duration: 310, ease: 'Cubic.In', onComplete: () => arrow.destroy() });
    }));
    this.time.delayedCall(330, () => {
      targetImpacts.forEach(({ enemy, x, y }) => {
        if (enemy.health > 0
          && Math.abs(enemy.sprite.x - x) <= 58
          && Math.abs(enemy.sprite.y - y) <= 62) this.damageEnemy(enemy, damage);
      });
      this.cameras.main.shake(220, 0.009);
    });
  }

  private skillDamage(skillId: string, baseDamage: number): number {
    const skillLevel = isSecretCharacter(this.characterId) ? 7 : (this.skillUpgradeLevels[skillId] ?? 0);
    const damage = baseDamage + skillLevel * 2;
    return this.time.now < this.classPowerUntil ? Math.ceil(damage * this.classPowerMultiplier) : damage;
  }

  private spawnEnhancedSkillEffect(skillId: string): void {
    const level = isSecretCharacter(this.characterId) ? 7 : (this.skillUpgradeLevels[skillId] ?? 0);
    if (level <= 0) return;
    const direction = this.player.flipX ? -1 : 1;
    const projectileSkills = ['arcane-bolt', 'magic-missile'];
    const forwardSkills = ['frost-nova', 'flame-wave', 'ice-storm', 'chain-lightning'];
    const centeredSkills = ['healing-light', 'starfall', 'healing-circle'];
    const startX = this.player.x + (centeredSkills.includes(skillId) ? 0 : direction * 64);
    const startY = this.player.y + (skillId === 'meteor' ? -150 : 0);
    const textureKey = isInnateCharacter(this.characterId) || isSecretCharacter(this.characterId) ? `quest-skill-icon-${skillId}` : `quest-enhanced-${skillId}`;
    const tier = Math.min(4, Math.ceil(level / 2));
    const effect = this.add.image(startX, startY, textureKey)
      .setDepth(14)
      .setFlipX(direction < 0)
      .setScale(0.38 + level * 0.085)
      .setAlpha(Math.min(1, 0.68 + level * 0.045))
      .setBlendMode(Phaser.BlendModes.ADD);
    const travel = projectileSkills.includes(skillId) ? 420 : forwardSkills.includes(skillId) ? 180 : 0;
    this.tweens.add({
      targets: effect,
      x: effect.x + direction * travel,
      y: skillId === 'meteor' ? this.player.y + 35 : effect.y,
      scale: effect.scale + 0.16 + level * 0.025,
      alpha: 0,
      duration: projectileSkills.includes(skillId) ? 720 : 580 + level * 35,
      ease: projectileSkills.includes(skillId) ? 'Linear' : 'Sine.Out',
      onComplete: () => effect.destroy(),
    });
    this.spawnInnateParticles(this.player.x, this.player.y, 8 + level * 3, 72 + level * 18);
    for (let ringIndex = 0; ringIndex < tier; ringIndex += 1) {
      this.time.delayedCall(ringIndex * 85, () => {
        if (this.finished) return;
        const ring = this.add.circle(this.player.x, this.player.y + 10, 34 + ringIndex * 9, this.skillAccentColor, 0.08)
          .setStrokeStyle(2 + level * 0.25, ringIndex % 2 === 0 ? this.skillAccentColor : 0xffffff, 0.88)
          .setDepth(13)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: ring,
          scale: 1.7 + level * 0.08,
          alpha: 0,
          duration: 420 + level * 45,
          ease: 'Cubic.Out',
          onComplete: () => ring.destroy(),
        });
      });
    }
  }

  private playAnimatedClassCastVfx(skillId: string): void {
    const direction = this.player.flipX ? -1 : 1;
    const skillIndex = Math.max(0, this.classSkillIds.indexOf(skillId));
    const ultimate = skillIndex === this.classSkillIds.length - 1;
    const buff = skillIndex === 3;
    const x = this.player.x + (buff || ultimate ? 0 : direction * (70 + skillIndex * 14));
    const y = this.player.y - (ultimate ? 28 : 4);
    const sprite = this.add.sprite(x, y, `quest-upgrade-vfx-${this.characterId}`, 0)
      .setDepth(17)
      .setDisplaySize(ultimate ? 330 : buff ? 245 : 205 + skillIndex * 18, ultimate ? 330 : buff ? 245 : 205 + skillIndex * 18)
      .setFlipX(direction < 0)
      .setAlpha(0.95)
      .setBlendMode(Phaser.BlendModes.ADD);
    sprite.play(`class-cast-vfx-${this.characterId}`);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
  }

  private spawnSkillProjectile(effect: 'slash' | 'fireball' | 'wind', damage: number, speed: number, scale: number, time: number, tint?: number, customTexture?: string, customAnimation?: string, invertVisual = false): void {
    const direction = this.player.flipX ? -1 : 1;
    const projectile = customTexture
      ? this.physics.add.sprite(this.player.x + direction * 72, this.player.y - 12, customTexture)
      : this.physics.add.sprite(this.player.x + direction * 72, this.player.y - 12, 'quest-skill-sheet', `vfx-${effect}-0`);
    projectile.setDepth(11).setScale(scale).setFlipX(invertVisual ? direction > 0 : direction < 0);
    if (customTexture) projectile.setBlendMode(Phaser.BlendModes.ADD);
    if (tint !== undefined) projectile.setTint(tint);
    projectile.body?.setAllowGravity(false); projectile.setVelocityX(direction * speed);
    projectile.play(customAnimation ?? `vfx-${effect}`);
    this.playerSkillProjectiles.push({ sprite: projectile, expiresAt: time + PLAYER_SKILL_PROJECTILE_LIFETIME_MS, damage });
  }

  private castDefense(skillId: string, time: number): void {
    const level = this.skillUpgradeLevels[skillId] ?? 0;
    const duration = 4_000 + level * 500;
    this.activeDefenseReduction = 1 + Math.floor(level / 2);
    this.defenseUntil = time + duration;
    const shield = this.add.sprite(this.player.x, this.player.y, 'quest-warrior-vfx-v2', 'warrior-vfx-shield-0').setDepth(12).setScale(0.78).setBlendMode(Phaser.BlendModes.ADD);
    shield.play('warrior-vfx-shield');
    this.spawnSkillImpactBurst(this.player.x, this.player.y + 14, 0xffc857, 0.82);
    this.tweens.add({
      targets: shield,
      alpha: 0.24,
      scale: 0.95 + level * 0.025,
      duration,
      ease: 'Sine.InOut',
      onUpdate: () => shield.setPosition(this.player.x, this.player.y),
      onComplete: () => shield.destroy(),
    });
    this.playWarriorHqVfx(skillId, this.player.x, this.player.y, 285);
    this.spawnInnateParticles(this.player.x, this.player.y, 28 + level * 2, 175);
    this.cameras.main.flash(110, 255, 218, 110, false);
  }

  private castWarriorPowerSlash(damage: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const startX = this.player.x;
    this.player.setVelocityX(direction * 510);
    this.playWarriorHqVfx('arcane-bolt', startX + direction * 145, this.player.y - 4, 330, direction < 0);
    [0, 70, 140].forEach((delay, index) => this.time.delayedCall(delay, () => {
      if (this.finished) return;
      const x = startX + direction * (82 + index * 58);
      this.spawnSkillImpactBurst(x, this.player.y, index === 1 ? 0xffffff : 0xffa02c, 0.75 + index * 0.12);
      this.damageEnemiesInArea(x, 135 + index * 18, Math.max(1, Math.ceil(damage / 2)), 125);
    }));
    this.time.delayedCall(190, () => {
      if (this.finished) return;
      this.player.setVelocityX(0);
      this.spawnSkillProjectile('slash', damage, 690, 1.08, this.time.now, 0xffc857, 'quest-warrior-vfx-v2', 'warrior-vfx-power-slash', true);
      this.cameras.main.shake(220, 0.011);
    });
  }

  private castWarriorBladeCyclone(damage: number): void {
    this.playWarriorHqVfx('frost-nova', this.player.x, this.player.y, 390);
    for (let pulse = 0; pulse < 5; pulse += 1) this.time.delayedCall(pulse * 90, () => {
      if (this.finished) return;
      this.spawnSkillImpactBurst(this.player.x, this.player.y, pulse % 2 === 0 ? 0xffc857 : 0xff5730, 0.72 + pulse * 0.08);
      this.damageEnemiesInArea(this.player.x, 190 + pulse * 28, Math.max(1, Math.ceil(damage / 3)), 150);
    });
    this.cameras.main.shake(520, 0.014);
  }

  private castWarriorEarthbreaker(damage: number): void {
    const direction = this.player.flipX ? -1 : 1;
    this.playWarriorHqVfx('flame-wave', this.player.x + direction * 270, this.player.y + 12, 480, direction < 0);
    for (let segment = 0; segment < 6; segment += 1) this.time.delayedCall(segment * 88, () => {
      if (this.finished) return;
      const x = this.player.x + direction * (85 + segment * 92);
      const impactY = this.player.y + 42;
      this.spawnSkillImpactBurst(x, impactY - 8, 0xff6b2e, 0.8 + segment * 0.06);
      this.damageEnemiesInArea(x, 115 + segment * 5, Math.max(1, Math.ceil(damage / 2)), 145);
    });
    this.cameras.main.shake(720, 0.021);
    this.cameras.main.flash(120, 255, 105, 42, false);
  }

  private playWarriorHqVfx(skillId: string, x: number, y: number, size: number, flipX = false, fixedToCamera = false): Phaser.GameObjects.Sprite {
    const sprite = this.add.sprite(x, y, 'quest-warrior-hq-vfx', 0).setDepth(28).setDisplaySize(size, size).setFlipX(flipX).setBlendMode(Phaser.BlendModes.ADD);
    if (fixedToCamera) sprite.setScrollFactor(0);
    sprite.play(`warrior-hq-${skillId}`);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    return sprite;
  }

  private castVioletJudgment(damage: number): void {
    const view = this.cameras.main.worldView;
    const centerX = view.centerX;
    const lightning = this.add.sprite(centerX, this.player.y - 78, 'quest-mage-special-vfx', 8)
      .setDepth(25).setDisplaySize(Math.min(720, view.width * 0.72), 510).setBlendMode(Phaser.BlendModes.ADD);
    lightning.play('mage-hq-violet-judgment');
    lightning.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => lightning.destroy());
    for (let pulse = 0; pulse < 6; pulse += 1) this.time.delayedCall(230 + pulse * 105, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(centerX, view.width * 0.58, Math.max(1, Math.ceil(damage / 3)), 390);
      this.spawnSkillImpactBurst(centerX + Phaser.Math.Between(-280, 280), this.player.y + 22, 0xb457ff, 0.9 + pulse * 0.08);
      this.cameras.main.shake(115, 0.008 + pulse * 0.0015);
    });
    this.time.delayedCall(770, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(centerX, view.width * 0.65, damage, 430);
      this.cameras.main.flash(220, 175, 78, 255, false);
    });
  }

  private castStarfall(damage: number): void {
    this.cameras.main.flash(240, 165, 105, 255);
    this.cameras.main.shake(180, 0.006);
    const direction = this.player.flipX ? -1 : 1;
    const castBeam = this.add.sprite(this.player.x + direction * 145, this.player.y - 18, 'quest-mage-vfx-v2', 'mage-vfx-chain-lightning-0').setDepth(13).setScale(1.35).setFlipX(direction < 0).setBlendMode(Phaser.BlendModes.ADD);
    castBeam.play('mage-vfx-chain-lightning');
    this.tweens.add({ targets: castBeam, alpha: 0, scaleX: 1.65, duration: 620, onComplete: () => castBeam.destroy() });
    this.enemies.filter((enemy) => enemy.health > 0 && this.isEnemyOnScreen(enemy)).forEach((enemy, index) => {
      this.time.delayedCall(index * 70, () => {
        if (enemy.health <= 0) return;
        const strike = this.add.sprite(enemy.sprite.x, enemy.sprite.y - 28, 'quest-mage-vfx-v2', 'mage-vfx-chain-lightning-0').setDepth(12).setScale(1.18).setBlendMode(Phaser.BlendModes.ADD);
        strike.play('mage-vfx-chain-lightning');
        this.spawnSkillImpactBurst(enemy.sprite.x, enemy.sprite.y, 0xb478ff, 0.72);
        this.tweens.add({ targets: strike, alpha: 0, scaleX: 1.55, duration: 620, onComplete: () => strike.destroy() }); this.damageEnemy(enemy, damage);
      });
    });
  }

  private castAreaSkill(effect: 'fireball' | 'wind', damage: number, range: number, scale: number, tint?: number): void {
    const visual = this.add.sprite(this.player.x, this.player.y - 10, 'quest-skill-sheet', `vfx-${effect}-0`).setDepth(12).setScale(scale);
    if (tint !== undefined) visual.setTint(tint);
    visual.play(`vfx-${effect}`); visual.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => visual.destroy());
    this.enemies.filter((enemy) => enemy.health > 0 && Math.abs(enemy.sprite.x - this.player.x) <= range && this.combatFootDistance(enemy) <= 40)
      .forEach((enemy) => this.damageEnemy(enemy, damage));
  }

  private castClassAreaSkill(textureKey: string, animationKey: string, damage: number, range: number, scale: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const impactX = this.player.x + direction * 105;
    const visual = this.add.sprite(impactX, this.player.y + 8, textureKey, `${animationKey}-0`).setDepth(12).setScale(scale).setFlipX(direction > 0).setBlendMode(Phaser.BlendModes.ADD);
    visual.play(animationKey);
    this.spawnSkillImpactBurst(impactX + direction * 52, this.player.y + 22, 0xffb13b, 0.9);
    this.tweens.add({ targets: visual, x: impactX + direction * 135, alpha: 0, scale: scale * 1.18, duration: 620, onComplete: () => visual.destroy() });
    this.enemies.filter((enemy) => enemy.health > 0 && Math.abs(enemy.sprite.x - impactX) <= range && this.combatFootDistance(enemy) <= 40)
      .forEach((enemy) => this.damageEnemy(enemy, damage));
  }

  private castWarriorRoar(damage: number, time: number): void {
    const invulnerabilityDuration = 3_000 + (this.skillUpgradeLevels.starfall ?? 0) * 200;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + invulnerabilityDuration);
    this.cameras.main.shake(260, 0.01);
    this.player.setTint(0xff5035);
    this.time.delayedCall(650, () => this.restorePlayerTint());
    const aura = this.add.sprite(this.player.x, this.player.y + 5, 'quest-warrior-vfx-v2', 'warrior-vfx-roar-0').setDepth(12).setScale(0.85).setBlendMode(Phaser.BlendModes.ADD);
    aura.play('warrior-vfx-roar');
    this.spawnSkillImpactBurst(this.player.x, this.player.y + 18, 0xff593d, 1.45);
    this.tweens.add({
      targets: aura, alpha: 0, scale: 1.15, duration: 720,
      onUpdate: () => aura.setPosition(this.player.x, this.player.y + 5),
      onComplete: () => aura.destroy(),
    });
    const camera = this.cameras.main;
    const centerX = camera.width * 0.5;
    const centerY = camera.height * 0.42;
    this.playWarriorHqVfx('starfall', centerX, centerY, Math.min(camera.width * 0.68, 680), false, true);
    for (let pulse = 0; pulse < 6; pulse += 1) this.time.delayedCall(280 + pulse * 145, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(camera.worldView.centerX, camera.worldView.width * 0.62, Math.max(1, Math.ceil(damage / 3)), 420);
      this.cameras.main.shake(170, 0.012 + pulse * 0.0015);
    });
    this.time.delayedCall(1_080, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(camera.worldView.centerX, camera.worldView.width * 0.72, damage, 460);
      this.cameras.main.flash(240, 255, 116, 55, false);
    });
  }

  private castIceStorm(damage: number): void {
    const direction = this.player.flipX ? -1 : 1;
    const castX = this.player.x;
    const castY = this.player.y;
    [95, 190, 285].forEach((distance, index) => {
      this.time.delayedCall(index * 115, () => {
        const effectX = castX + direction * distance;
        const iceEffect = this.add.sprite(effectX, castY - 12, 'quest-mage-vfx-v2', 'mage-vfx-ice-storm-0').setDepth(12).setScale(0.88).setFlipX(direction < 0).setBlendMode(Phaser.BlendModes.ADD);
        iceEffect.play('mage-vfx-ice-storm');
        this.spawnSkillImpactBurst(effectX, castY + 24, 0x72dcff, 0.78 + index * 0.08);
        this.tweens.add({ targets: iceEffect, alpha: 0, y: iceEffect.y - 8, duration: 720, onComplete: () => iceEffect.destroy() });
      });
    });
    this.time.delayedCall(180, () => {
      this.enemies.filter((enemy) => {
        const forwardDistance = (enemy.sprite.x - castX) * direction;
        return enemy.health > 0 && this.isEnemyOnScreen(enemy)
          && forwardDistance >= 35 && forwardDistance <= 355 && this.combatFootDistance(enemy) <= 40;
      }).forEach((enemy) => this.damageEnemy(enemy, damage));
    });
  }

  private castHealingCircle(skillId: string): void {
    const level = this.skillUpgradeLevels[skillId] ?? 0;
    this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 4 + level);
    this.healthBar.width = 200 * (this.playerHealth / this.playerMaxHealth);
    const circle = this.add.circle(this.player.x, this.player.y + 38, 54, 0x62ff8a, 0.3).setDepth(6);
    this.tweens.add({ targets: circle, scale: 1.8, alpha: 0, duration: 700, onComplete: () => circle.destroy() });
    const healEffect = this.add.sprite(this.player.x, this.player.y + 28, 'quest-mage-vfx-v2', 'mage-vfx-healing-circle-0').setDepth(12).setScale(0.82).setBlendMode(Phaser.BlendModes.ADD);
    healEffect.play('mage-vfx-healing-circle');
    this.spawnSkillImpactBurst(this.player.x, this.player.y + 32, 0x66ffb0, 1.05);
    this.tweens.add({ targets: healEffect, alpha: 0, scale: 1.05, duration: 700, onComplete: () => healEffect.destroy() });
  }

  private castMeteor(damage: number): void {
    const view = this.cameras.main.worldView;
    const impactX = view.centerX;
    const impactY = this.player.y - 72;
    const startX = impactX - 190;
    const startY = view.top - 70;
    const aura = this.add.circle(startX, startY, 82, 0xff4b16, 0.46)
      .setStrokeStyle(18, 0xffc35a, 0.7).setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.circle(startX, startY, 38, 0xfff0b0, 0.96)
      .setStrokeStyle(10, 0xff6a20, 0.95).setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    const meteor = this.add.sprite(startX, startY, 'quest-mage-special-vfx', 0)
      .setDepth(28).setDisplaySize(520, 520);
    meteor.play('mage-hq-grand-meteor');
    this.tweens.add({ targets: aura, x: impactX, y: impactY, scale: 1.7, alpha: 0.72, duration: 1_350, ease: 'Cubic.In', onComplete: () => aura.destroy() });
    this.tweens.add({ targets: core, x: impactX, y: impactY, scale: 1.45, duration: 1_350, ease: 'Cubic.In', onComplete: () => core.destroy() });
    this.tweens.add({
      targets: meteor,
      x: impactX,
      y: impactY,
      displayWidth: 650,
      displayHeight: 650,
      duration: 1_350,
      ease: 'Cubic.In',
      onComplete: () => meteor.destroy(),
    });
    for (let trail = 0; trail < 8; trail += 1) this.time.delayedCall(180 + trail * 125, () => {
      if (!meteor.active) return;
      const ember = this.add.circle(meteor.x - Phaser.Math.Between(18, 66), meteor.y - Phaser.Math.Between(20, 74), Phaser.Math.Between(10, 24), trail % 2 === 0 ? 0xffd36b : 0xff4b1f, 0.72)
        .setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ember, alpha: 0, scale: 0.15, x: ember.x - 55, y: ember.y - 70, duration: 520, onComplete: () => ember.destroy() });
    });
    this.time.delayedCall(1_300, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(impactX, view.width * 0.68, damage, 500);
      this.spawnSkillImpactBurst(impactX, this.player.y + 26, 0xff5b24, 2.35);
      this.spawnInnateParticles(impactX, this.player.y + 10, 68, 430);
      this.cameras.main.flash(320, 255, 112, 34, false);
      this.cameras.main.shake(1_000, 0.036);
    });
  }

  private castDarkSwordRain(damage: number): void {
    this.castAnimatedUltimate('spellblade', damage);
    return;
    const view = this.cameras.main.worldView;
    const swordCount = 13;
    const veil = this.add.rectangle(view.centerX, view.centerY, view.width, view.height, 0x260812, 0.24).setDepth(17).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.tweens.add({ targets: veil, alpha: 0, delay: 1_050, duration: 520, onComplete: () => veil.destroy() });
    for (let index = 0; index < swordCount; index += 1) this.time.delayedCall(index * 72, () => {
      if (this.finished) return;
      const x = view.left + 55 + ((index * 197) % Math.max(100, view.width - 110));
      const impactY = this.player.y + 38;
      const blade = this.add.rectangle(0, 0, 18, 142, index % 2 === 0 ? 0x3b1225 : 0x6d1630, 0.98).setStrokeStyle(4, 0xff345c, 0.95);
      const tip = this.add.triangle(0, 84, -9, 61, 9, 61, 0xff274c, 1);
      const guard = this.add.rectangle(0, -72, 68, 13, 0x1a0710, 1).setStrokeStyle(4, 0xd62c55, 0.96);
      const pommel = this.add.circle(0, -94, 12, 0xff2c55, 0.98).setStrokeStyle(3, 0xffb05d, 0.9);
      const sword = this.add.container(x, view.top - 150 - (index % 4) * 44, [blade, tip, guard, pommel]).setDepth(22).setAngle(index % 2 === 0 ? -7 : 7).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: sword, y: impactY, angle: 0, duration: 360 + (index % 3) * 45, ease: 'Expo.In', onComplete: () => {
        sword.destroy(true);
        const blast = this.add.ellipse(x, impactY, 58, 24, 0x8f1434, 0.38).setStrokeStyle(6, 0xff385e, 0.96).setDepth(20).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: blast, scaleX: 4.2, scaleY: 2.5, alpha: 0, duration: 520, onComplete: () => blast.destroy() });
        this.spawnSkillImpactBurst(x, impactY, 0xd31f4a, 0.95);
        this.damageEnemiesInArea(x, 130, Math.max(1, Math.ceil(damage / 3)), 190);
        this.cameras.main.shake(110, 0.009);
      } });
    });
    this.time.delayedCall(1_280, () => {
      if (this.finished) return;
      this.damageEnemiesInArea(view.centerX, view.width * 0.72, damage, 440);
      this.spawnSkillImpactBurst(view.centerX, this.player.y, 0xff294f, 2.1);
      this.cameras.main.flash(240, 125, 10, 38, false);
      this.cameras.main.shake(760, 0.028);
    });
  }

  private castEmeraldTempest(damage: number): void {
    this.castAnimatedUltimate('archer', damage);
    return;
    const view = this.cameras.main.worldView;
    const centerX = view.centerX;
    const centerY = this.player.y - 15;
    const core = this.add.circle(centerX, centerY, 42, 0x8ffff0, 0.38).setStrokeStyle(8, 0xeaffff, 0.98).setDepth(19).setScale(0.1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: core, scale: 1.6, alpha: 0.88, duration: 420, ease: 'Back.Out' });
    for (let pulse = 0; pulse < 8; pulse += 1) this.time.delayedCall(360 + pulse * 125, () => {
      if (this.finished) return;
      const ring = this.add.ellipse(centerX, centerY, 96 + pulse * 14, 58 + pulse * 8, 0x42e8ba, 0.12)
        .setStrokeStyle(6, pulse % 2 === 0 ? 0xc8fff3 : 0x5bff9a, 0.96).setDepth(18).setAngle(pulse * 28).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ring, scaleX: 7.2 + pulse * 0.45, scaleY: 3.7 + pulse * 0.25, angle: ring.angle + 170, alpha: 0, duration: 720, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      for (let gust = 0; gust < 8; gust += 1) {
        const angle = (Math.PI * 2 * gust) / 8 + pulse * 0.22;
        const mote = this.add.triangle(centerX, centerY, -16, -6, 18, 0, -16, 6, gust % 2 === 0 ? 0xd8fff4 : 0x5cffb0, 0.92)
          .setDepth(20).setRotation(angle).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: mote, x: centerX + Math.cos(angle) * (view.width * 0.62), y: centerY + Math.sin(angle) * 170, alpha: 0, scaleX: 2.3, duration: 620, onComplete: () => mote.destroy() });
      }
      this.damageEnemiesInArea(centerX, 220 + pulse * 65, Math.max(1, Math.ceil(damage / 4)), 330);
      this.cameras.main.shake(120, 0.007 + pulse * 0.001);
    });
    this.time.delayedCall(1_420, () => {
      if (this.finished) return;
      core.destroy();
      this.damageEnemiesInArea(centerX, view.width * 0.72, damage, 460);
      this.spawnSkillImpactBurst(centerX, centerY, 0x7fffd4, 2.2);
      this.cameras.main.flash(260, 126, 255, 216, false);
      this.cameras.main.shake(700, 0.025);
    });
  }

  private updatePlayerSkillProjectiles(time: number): void {
    this.playerSkillProjectiles = this.playerSkillProjectiles.filter((projectile) => {
      if (!projectile.sprite.active) return false;
      if (time - (projectile.lastTrailAt ?? 0) >= 64) {
        projectile.lastTrailAt = time;
        const trail = this.add.image(projectile.sprite.x, projectile.sprite.y, projectile.sprite.texture.key, projectile.sprite.frame.name)
          .setDisplaySize(projectile.sprite.displayWidth * 0.84, projectile.sprite.displayHeight * 0.84)
          .setDepth(projectile.sprite.depth - 1)
          .setAlpha(0.34)
          .setRotation(projectile.sprite.rotation)
          .setFlipX(projectile.sprite.flipX)
          .setTint(this.skillAccentColor)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: trail,
          alpha: 0,
          scaleX: trail.scaleX * 0.62,
          scaleY: trail.scaleY * 0.62,
          duration: 220,
          onComplete: () => trail.destroy(),
        });
        if (projectile.skillId) this.spawnClassProjectileTrail(projectile);
      }
      if (time >= projectile.expiresAt || projectile.sprite.x < 0 || projectile.sprite.x > WORLD_WIDTH) {
        projectile.sprite.destroy();
        return false;
      }
      const enemy = this.enemies.find((candidate) => {
        if (candidate.health <= 0) return false;
        if (projectile.hitEnemyIds?.has(candidate.id)) return false;
        const horizontalLimit = projectile.horizontalHitRadius ?? (candidate.boss ? 72 : 42);
        const verticalLimit = projectile.verticalHitRadius ?? (candidate.boss ? 66 : 38);
        return Math.abs(projectile.sprite.x - candidate.sprite.x) <= horizontalLimit
          && Math.abs(projectile.sprite.y - candidate.sprite.y) <= verticalLimit;
      });
      if (enemy) {
        this.spawnSkillImpactBurst(enemy.sprite.x, enemy.sprite.y, this.skillAccentColor, enemy.boss ? 0.78 : 0.55);
        if (projectile.skillId) this.spawnClassProjectileImpact(projectile.skillId, enemy.sprite.x, enemy.sprite.y);
        this.damageEnemy(enemy, projectile.damage);
        if (projectile.piercing) {
          projectile.hitEnemyIds?.add(enemy.id);
          return true;
        }
        projectile.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  private isEnemyOnScreen(enemy: EnemyState): boolean {
    const view = this.cameras.main.worldView;
    const margin = enemy.boss ? 80 : 35;
    return enemy.sprite.x >= view.left - margin
      && enemy.sprite.x <= view.right + margin
      && enemy.sprite.y >= view.top - margin
      && enemy.sprite.y <= view.bottom + margin;
  }

  private combatFootDistance(enemy: EnemyState): number {
    const playerBody = this.player.body;
    const enemyBody = enemy.sprite.body;
    const playerFootY = playerBody instanceof Phaser.Physics.Arcade.Body ? playerBody.bottom : this.player.y;
    const enemyFootY = enemyBody instanceof Phaser.Physics.Arcade.Body ? enemyBody.bottom : enemy.sprite.y;
    return Math.abs(enemyFootY - playerFootY);
  }

  private damageEnemy(enemy: EnemyState, damage = 1): void {
    enemy.health = Math.max(0, enemy.health - damage);
    enemy.sprite.setTintFill(0xffffff);
    if (enemy.boss) {
      enemy.bossMotion = enemy.health > 0 ? 'hit' : 'dead';
      enemy.bossMotionUntil = this.time.now + 150;
    }
    if (enemy.boss && this.usesAnimatedBossSheet) enemy.sprite.play(this.bossAnimationKey('hit'), true);
    else if (!enemy.boss) enemy.sprite.play(this.minionAnimationKey('hit'), true);
    this.time.delayedCall(90, () => {
      enemy.sprite.clearTint();
      if (enemy.boss && enemy.health > 0) enemy.sprite.setTint(this.bossTint);
    });
    enemy.sprite.setVelocityX((enemy.sprite.x > this.player.x ? 1 : -1) * 170);
    enemy.healthBar.width = (enemy.boss ? 138 : 44) * (enemy.health / enemy.maxHealth);
    if (enemy.health === 0) {
      enemy.healthBar.destroy();
      enemy.sprite.setVelocity(0, 0);
      const body = enemy.sprite.body;
      if (body instanceof Phaser.Physics.Arcade.Body) body.enable = false;
      if (enemy.boss && this.usesAnimatedBossSheet) enemy.sprite.play(this.bossAnimationKey('death'));
      else if (!enemy.boss) enemy.sprite.play(this.minionAnimationKey('death'));
      else this.tweens.add({ targets: enemy.sprite, alpha: 0, angle: 12, y: enemy.sprite.y + 18, duration: 700 });
      this.time.delayedCall(enemy.boss ? 900 : 620, () => enemy.sprite.setActive(false).setVisible(false));
      this.recordCheckpoint(`defeated:${enemy.id}`);
      if (enemy.boss) {
        this.recordCheckpoint('boss-defeated');
        this.beginVictorySequence();
      }
      this.cameras.main.shake(enemy.boss ? 220 : 90, enemy.boss ? 0.009 : 0.003);
    }
  }

  private handleEnemyContact(time: number): void {
    if (time < this.invulnerableUntil) return;
    const enemy = this.enemies.find((candidate) => candidate.health > 0 && this.physics.overlap(this.player, candidate.sprite));
    if (!enemy) return;
    if (enemy.boss) {
      enemy.bossMotion = 'cast';
      enemy.bossMotionUntil = time + 260;
      if (this.usesAnimatedBossSheet) enemy.sprite.play(this.bossAnimationKey('attack'), true);
    } else enemy.sprite.play(this.minionAnimationKey('attack'), true).setFlipX(this.player.x < enemy.sprite.x);
    this.damagePlayer(time, enemy.boss && this.stage.number > 5 ? 2 : 1, enemy.sprite.x);
  }

  private damagePlayer(time: number, damage: number, sourceX: number): void {
    if (time < this.invulnerableUntil || this.finished) return;
    this.invulnerableUntil = time + DAMAGE_INVULNERABILITY_MS;
    const totalReduction = (this.armorEquipped ? 1 : 0) + (time < this.defenseUntil ? this.activeDefenseReduction : 0) + Math.floor(this.defenseLevel / 2) + Math.floor(this.armorLevel / 2);
    const mitigatedDamage = Math.max(1, damage - totalReduction);
    this.playerHealth = Math.max(0, this.playerHealth - mitigatedDamage);
    this.healthBar.width = 200 * (this.playerHealth / this.playerMaxHealth);
    this.playPlayerAnimation('hit');
    this.player.setTintFill(0xff6f78).setVelocity(this.player.x < sourceX ? -260 : 260, -190);
    this.cameras.main.shake(120, 0.007);
    this.time.delayedCall(160, () => this.restorePlayerTint());
    if (this.playerHealth === 0) this.failStage();
  }

  private updateObjective(): void {
    if (!this.objectiveText) return;
    const boss = this.enemies.find((enemy) => enemy.boss);
    this.objectiveText.setText(boss && boss.health > 0 ? `BOSS VITALITY: ${boss.health} / ${boss.maxHealth}` : 'BOSS DEFEATED');
  }

  private failStage(): void {
    if (this.finished) return;
    this.finished = true;
    this.playPlayerAnimation('death');
    this.player.setAcceleration(0, 0).setVelocity(0, 0);
    this.physics.pause();
    this.audioDirector.stop();
    this.events.emit('stage-failed', {
      attemptId: this.attemptId, stageId: this.stage.id, durationMs: this.elapsedMs(), reason: 'player-defeated', events: [...this.telemetry],
    });
  }

  private completeStage(): void {
    if (this.finished) return;
    this.finished = true;
    this.recordCheckpoint('run-completed', 'run-completed');
    this.player.setAcceleration(0, 0).setVelocity(0, 0);
    this.physics.pause();
    this.audioDirector.stop();
    this.cameras.main.flash(380, 223, 255, 98);
    const result: StageResult = { attemptId: this.attemptId, stageId: this.stage.id, durationMs: this.elapsedMs(), events: [...this.telemetry] };
    this.events.emit('stage-completed', result);
  }

  private beginVictorySequence(): void {
    if (this.victorySequenceStarted || this.finished) return;
    this.victorySequenceStarted = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.shake(420, 0.011);
    this.time.delayedCall(520, () => {
      const veil = this.add.rectangle(512, 260, 1_024, 520, 0x05070b, 0).setScrollFactor(0).setDepth(40);
      const label = this.add.text(512, 228, 'STAGE CLEAR', {
        color: '#f4e6b8',
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '42px',
        fontStyle: 'bold',
        stroke: '#3b2710',
        strokeThickness: 8,
        letterSpacing: 8,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(41).setAlpha(0).setScale(0.72);
      const subtitle = this.add.text(512, 282, `${this.stage.name.toUpperCase()} CONQUERED`, {
        color: `#${this.stage.accentColor.toString(16).padStart(6, '0')}`,
        fontFamily: 'monospace',
        fontSize: '13px',
        letterSpacing: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(41).setAlpha(0);
      this.tweens.add({ targets: veil, fillAlpha: 0.42, duration: 520, ease: 'Sine.Out' });
      this.tweens.add({ targets: label, alpha: 1, scale: 1, duration: 620, ease: 'Back.Out' });
      this.tweens.add({ targets: subtitle, alpha: 1, y: 274, duration: 620, delay: 180, ease: 'Cubic.Out' });
    });
    this.time.delayedCall(2_350, () => this.completeStage());
  }

  private recordCheckpoint(checkpoint: string, type: StageTelemetryEvent['type'] = 'checkpoint'): void {
    this.telemetry.push({ type, elapsedMs: this.elapsedMs(), checkpoint });
  }

  private elapsedMs(): number {
    return Math.max(0, Math.round(this.time.now - this.startedAt));
  }

  private get playerMaxHealth(): number {
    const introductoryHealthBonus = Math.max(0, 6 - this.stage.number);
    return PLAYER_MAX_HEALTH + introductoryHealthBonus + (this.armorEquipped ? 3 : 0) + this.vitalityLevel * 2 + this.armorLevel;
  }

  private get attackLevel(): number { return isSecretCharacter(this.characterId) ? 20 : this.upgradeLevels.attack; }
  private get vitalityLevel(): number { return isSecretCharacter(this.characterId) ? 20 : this.upgradeLevels.vitality; }
  private get defenseLevel(): number { return isSecretCharacter(this.characterId) ? 20 : this.upgradeLevels.defense; }

  private get bossSkillCooldownMs(): number {
    return this.stage.number <= 5 ? 3_800 - this.stage.number * 300 : BOSS_SKILL_COOLDOWN_MS;
  }

  private get bossEnragedSkillCooldownMs(): number {
    return this.stage.number <= 5 ? 2_800 - this.stage.number * 220 : BOSS_ENRAGED_SKILL_COOLDOWN_MS;
  }

  private get classSkillIds(): readonly string[] {
    if (this.characterId === 'warrior') return ['arcane-bolt', 'frost-nova', 'flame-wave', 'healing-light', 'starfall'];
    if (this.characterId === 'mage') return ['magic-missile', 'ice-storm', 'chain-lightning', 'healing-circle', 'meteor'];
    if (this.characterId === 'spellblade') return ['arcane-cleave', 'twin-phantom', 'rune-step', 'astral-counter', 'constellation-storm'];
    if (isSecretCharacter(this.characterId)) return assetTycoonSkills.map((skill) => skill.id);
    if (isInnateCharacter(this.characterId)) return innateClasses[this.characterId].skills.map((skill) => skill.id);
    if (isPoliticalCharacter(this.characterId)) return politicalFighters[this.characterId].skills.map((skill) => `${this.characterId}-${skill.key.toLowerCase()}`);
    return ['gale-arrow', 'split-shot', 'verdant-snare', 'feather-step', 'emerald-rain'];
  }

  private skillCooldownMs(skillId: string): number {
    if (AWAKENING_SKILL_IDS.has(skillId)) return AWAKENING_COOLDOWN_MS;
    if (isPoliticalCharacter(this.characterId)) {
      const skill = politicalFighters[this.characterId].skills.find((entry) => `${this.characterId}-${entry.key.toLowerCase()}` === skillId);
      if (skill) return skill.cooldownMs;
    }
    if (isInnateCharacter(this.characterId)) {
      const skill = innateClasses[this.characterId].skills.find((entry) => entry.id === skillId);
      if (skill) return skill.cooldownMs;
    }
    if (isSecretCharacter(this.characterId)) {
      const skill = assetTycoonSkills.find((entry) => entry.id === skillId);
      if (skill) return skill.cooldownMs;
    }
    return SKILL_COOLDOWNS[skillId] ?? 1_000;
  }

  private isSpellbladeSkill(skillId: string): boolean {
    return ['arcane-cleave', 'twin-phantom', 'rune-step', 'astral-counter', 'constellation-storm'].includes(skillId);
  }

  private alignHeroAnimationBaseline(animation: string): void {
    if (this.characterId !== 'warrior' && this.characterId !== 'mage' && this.characterId !== 'brawler') return;
    const warriorBaselines: Readonly<Record<string, number>> = {
      idle: 149, walk: 145, run: 133, dash: 133, jump: 138, attack: 142, skill: 130, hit: 122, death: 120,
    };
    const mageBaselines: Readonly<Record<string, number>> = {
      idle: 145, walk: 146, run: 143, dash: 143, jump: 140, attack: 140, skill: 143, hit: 130, death: 125,
    };
    const brawlerBaselines: Readonly<Record<string, number>> = {
      idle: 144, walk: 130, run: 110, dash: 144, jump: 144, attack: 118, skill: 129, hit: 135, death: 125,
    };
    const targetBaseline = this.characterId === 'warrior' ? 149 : this.characterId === 'mage' ? 145 : 144;
    const baselines = this.characterId === 'warrior' ? warriorBaselines : this.characterId === 'mage' ? mageBaselines : brawlerBaselines;
    const baseline = baselines[animation] ?? targetBaseline;
    const downwardFrameOffset = targetBaseline - baseline;
    this.player.setOrigin(0.5, (78 - downwardFrameOffset) / 156);
    const body = this.player.body;
    if (body instanceof Phaser.Physics.Arcade.Body) body.setOffset(43, 23 - downwardFrameOffset);
  }

  private playPlayerAnimation(animation: string): void {
    if (isPoliticalCharacter(this.characterId)) {
      const politicalAnimation = animation === 'skill' ? 'cast'
        : animation === 'dash' ? 'run'
          : animation === 'death' ? 'knockdown'
            : animation;
      const politicalKey = `${this.characterId}-${politicalAnimation}`;
      if (this.anims.exists(politicalKey)) this.player.play(politicalKey, true).setAngle(0);
      if (animation === 'attack') this.playerPoseLockedUntil = this.time.now + 260;
      if (animation === 'skill') this.playerPoseLockedUntil = this.time.now + 420;
      if (animation === 'dash') this.playerPoseLockedUntil = this.time.now + DASH_DURATION_MS;
      return;
    }
    const key = `${this.characterId}-${animation}`;
    if (this.anims.exists(key)) {
      this.alignHeroAnimationBaseline(animation);
      this.player.play(key, true).setAngle(0);
      return;
    }
    const pose = animation === 'walk' ? 'run'
      : animation === 'death' || animation === 'hit' ? 'idle'
        : animation;
    const poseKey = `quest-${this.characterId}-${pose}`;
    if (!this.textures.exists(poseKey)) return;
    this.player.setTexture(poseKey).setDisplaySize(92, 100);
    if (animation === 'jump') this.player.setAngle(Phaser.Math.Clamp((this.player.body?.velocity.y ?? 0) / 40, -8, 8));
    else this.player.setAngle(0);
    if (animation === 'attack') this.playerPoseLockedUntil = this.time.now + 260;
    if (animation === 'skill') this.playerPoseLockedUntil = this.time.now + 420;
    if (animation === 'dash') this.playerPoseLockedUntil = this.time.now + DASH_DURATION_MS;
  }

  private stabilizePlayerVisualSize(): void {
    if (isPoliticalCharacter(this.characterId)) {
      if (Math.abs(this.player.scaleX) !== 0.38 || this.player.scaleY !== 0.38) this.player.setScale(0.38);
      return;
    }
    if (this.characterId === 'warrior' || this.characterId === 'mage' || isInnateCharacter(this.characterId) || isSecretCharacter(this.characterId)) {
      if (Math.abs(this.player.scaleX) !== 0.64 || this.player.scaleY !== 0.64) this.player.setScale(0.64);
      return;
    }
    if (Math.round(this.player.displayWidth) !== 92 || Math.round(this.player.displayHeight) !== 100) this.player.setDisplaySize(92, 100);
  }

  private get bossAssetKey(): string {
    return ['goblin-warlord', 'mist-wolf', 'rune-golem', 'lava-dragon', 'ice-queen', 'desert-scorpion', 'wind-harpy', 'vampire-lord', 'deep-kraken', 'thunder-minotaur', 'plague-necromancer', 'crystal-hydra', 'clockwork-titan', 'sand-wyrm', 'celestial-griffin', 'void-witch', 'frost-mammoth', 'inferno-phoenix', 'abyss-leviathan', 'avalanche-emperor', 'obsidian-behemoth', 'spectral-broker', 'iron-seraph', 'toxic-singularity', 'solar-devourer', 'gravity-colossus', 'ruin-sovereign', 'chaos-auditor', 'extinction-dragon', 'compound-overlord'][this.stage.number - 1] ?? 'goblin-warlord';
  }

  private get bossEffectKey(): string {
    return this.bossAssetKey;
  }

  private get usesAnimatedBossSheet(): boolean {
    return true;
  }

  private get bossTint(): number {
    return this.stage.number >= 21 ? Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(this.stage.accentColor), 100, 28).color : 0xffffff;
  }

  private get skillAccentColor(): number {
    if (this.characterId === 'warrior') return 0xffb13b;
    if (this.characterId === 'mage') return 0x9b7cff;
    if (this.characterId === 'spellblade') return 0xef294d;
    if (this.characterId === 'archer') return 0x8dff66;
    if (this.characterId === 'dualblade') return 0x55ddff;
    if (this.characterId === 'brawler') return 0xffad33;
    if (this.characterId === 'dragonknight') return 0xff5a36;
    if (this.characterId === 'gunslinger') return 0x65e7ff;
    if (this.characterId === 'ssaulabi') return 0xef5568;
    if (this.characterId === 'kickfighter') return 0x45e6d1;
    if (this.characterId === 'venomancer') return 0x80e83f;
    if (this.characterId === 'pyromancer') return 0xff6a25;
    if (this.characterId === 'hammerguard') return 0x68a9ff;
    if (this.characterId === 'axereaver') return 0xa7e63f;
    if (this.characterId === 'assettycoon') return 0xf2c94c;
    if (this.characterId === 'conservative') return 0xff4d55;
    return 0x42a5ff;
  }

  private restorePlayerTint(): void {
    this.player.clearTint();
    this.applyEquipmentTint();
  }

  private registerNewClassAnimations(): void {
    const runKey = `${this.characterId}-run`;
    if (!this.anims.exists(runKey)) {
      this.anims.create({
        key: runKey,
        frames: Array.from({ length: 4 }, (_, index) => ({ key: `quest-${this.characterId}-run-${index}` })),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  private registerPoliticalClassAssets(): void {
    if (!isPoliticalCharacter(this.characterId)) return;
    const faction = this.characterId;
    const textureKey = `political-${faction}-sheet`;
    const animationDefinitions = [
      { name: 'idle', frames: [0], rate: 2, repeat: -1 },
      { name: 'walk', frames: [0, 1], rate: 6, repeat: -1 },
      { name: 'run', frames: [1, 2], rate: 9, repeat: -1 },
      { name: 'jump', frames: [3], rate: 2, repeat: 0 },
      { name: 'attack', frames: [0, 4, 0], rate: 12, repeat: 0 },
      { name: 'cast', frames: [0, 5, 5, 0], rate: 10, repeat: 0 },
      { name: 'hit', frames: [6, 0], rate: 8, repeat: 0 },
      { name: 'knockdown', frames: [6, 7], rate: 5, repeat: 0 },
    ] as const;
    animationDefinitions.forEach((definition) => {
      const key = `${faction}-${definition.name}`;
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: definition.frames.map((frame) => ({ key: textureKey, frame })),
        frameRate: definition.rate,
        repeat: definition.repeat,
      });
    });
    const reference = this.textures.get('political-reference');
    politicalFighters[faction].skills.forEach((skill) => {
      const skillId = `${faction}-${skill.key.toLowerCase()}`;
      const frameName = `political-stage-${skillId}`;
      if (!reference.has(frameName)) reference.add(frameName, 0, skill.frame.x, skill.frame.y, skill.frame.width, skill.frame.height);
      const vfxKey = `quest-political-${skillId}-vfx`;
      if (!this.anims.exists(vfxKey)) {
        const textureKey = `political-vfx-${skillId}`;
        const projectileFrames = skill.key === 'Q' || (faction === 'conservative' && skill.key === 'R');
        this.anims.create({
          key: vfxKey,
          frames: (projectileFrames ? [0, 1, 2, 3, 2, 1] : [0, 1, 2, 3]).map((frame) => ({ key: textureKey, frame })),
          frameRate: 11,
          repeat: projectileFrames || skill.key === 'E' || skill.key === 'R' || skill.key === 'X' || skill.key === 'C' ? -1 : 0,
        });
      }
    });
  }

  private createBasicArrowTexture(): void {
    if (this.textures.exists('quest-basic-arrow')) return;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x8b5a2b, 1).fillRect(7, 5, 30, 3);
    graphics.fillStyle(0xd8c28d, 1).fillTriangle(37, 1, 48, 6, 37, 11);
    graphics.fillStyle(0x496b3c, 1).fillTriangle(8, 6, 0, 1, 3, 6).fillTriangle(8, 6, 0, 11, 3, 6);
    graphics.generateTexture('quest-basic-arrow', 48, 12);
    graphics.destroy();
  }

  private registerHeroFramesAndAnimations(): void {
    const textureKey = `quest-${this.characterId}-sheet`;
    const texture = this.textures.get(textureKey);
    const fixedBrawlerJumpTextureKey = 'quest-brawler-jump-sheet';
    if (this.characterId === 'brawler') {
      const jumpTexture = this.textures.get(fixedBrawlerJumpTextureKey);
      for (let column = 0; column < 8; column += 1) {
        const frameName = `brawler-jump-fixed-${column}`;
        if (!jumpTexture.has(frameName)) jumpTexture.add(frameName, 0, column * 156, 0, 156, 156);
      }
    }
    const animations = ['idle', 'walk', 'run', 'jump', 'attack', 'skill', 'hit', 'death'] as const;
    animations.forEach((animation, row) => {
      for (let column = 0; column < 8; column += 1) {
        const frameName = `${this.characterId}-${animation}-${column}`;
        const frameOffset = isInnateCharacter(this.characterId) || isSecretCharacter(this.characterId) ? 0 : 3;
        if (!texture.has(frameName)) texture.add(frameName, 0, frameOffset + column * 156, frameOffset + row * 156, 156, 156);
      }
      const key = `${this.characterId}-${animation}`;
      if (!this.anims.exists(key)) {
        const usesKickfighterStrip = this.characterId === 'kickfighter'
          && (animation === 'run' || animation === 'jump' || animation === 'skill' || animation === 'hit');
        const usesGunslingerSkillStrip = this.characterId === 'gunslinger' && animation === 'skill';
        this.anims.create({
          key,
          frames: animation === 'idle'
            ? [{ key: textureKey, frame: `${this.characterId}-idle-0` }]
            : this.characterId === 'brawler' && animation === 'jump'
              ? Array.from({ length: 8 }, (_, index) => ({ key: fixedBrawlerJumpTextureKey, frame: `brawler-jump-fixed-${index}` }))
            : usesKickfighterStrip
              ? Array.from({ length: 8 }, (_, index) => ({ key: `quest-kickfighter-${animation}-strip`, frame: index }))
            : usesGunslingerSkillStrip
              ? Array.from({ length: 8 }, (_, index) => ({ key: 'quest-gunslinger-skill-strip', frame: index }))
            : Array.from({ length: 8 }, (_, index) => ({ key: textureKey, frame: `${this.characterId}-${animation}-${index}` })),
          frameRate: animation === 'run' ? 13 : animation === 'attack' ? 14 : 9,
          repeat: animation === 'idle' || animation === 'walk' || animation === 'run' ? -1 : 0,
        });
      }
    });
    const dashKey = `${this.characterId}-dash`;
    if (!this.anims.exists(dashKey)) {
      const dashAnimation = isInnateCharacter(this.characterId) || isSecretCharacter(this.characterId) ? 'jump' : 'run';
      this.anims.create({
        key: dashKey,
        frames: this.characterId === 'brawler'
          ? Array.from({ length: 8 }, (_, index) => ({ key: fixedBrawlerJumpTextureKey, frame: `brawler-jump-fixed-${index}` }))
          : this.characterId === 'kickfighter'
            ? Array.from({ length: 8 }, (_, index) => ({ key: 'quest-kickfighter-jump-strip', frame: index }))
          : Array.from({ length: 8 }, (_, index) => ({ key: textureKey, frame: `${this.characterId}-${dashAnimation}-${index}` })),
        frameRate: 22,
        repeat: -1,
      });
    }
  }

  private registerEnemyFramesAndAnimations(): void {
    this.registerSheetAnimations('quest-goblin-sheet', 'goblin', ['idle', 'walk', 'attack', 'hit', 'death'], 198, 198, 1, 1);
    this.registerSheetAnimations('quest-boss-sheet', 'boss', ['idle', 'walk', 'attack-1', 'attack-2', 'hit', 'death'], 181, 181, 0, 0);
  }

  private registerSkillEffectAnimations(): void {
    this.registerSheetAnimations('quest-skill-sheet', 'vfx', ['slash', 'fireball', 'wind', 'defense', 'lightning'], 198, 198, 1, 1);
  }

  private registerClassVfxAnimations(): void {
    const definitions = [
      { texture: 'quest-warrior-vfx-v2', prefix: 'warrior-vfx', names: ['power-slash', 'spin-slash', 'earth-slam', 'shield', 'roar'] },
      { texture: 'quest-mage-vfx-v2', prefix: 'mage-vfx', names: ['missile', 'ice-storm', 'chain-lightning', 'healing-circle', 'meteor'] },
    ] as const;
    definitions.forEach(({ texture, prefix, names }) => {
      const source = this.textures.get(texture);
      names.forEach((name, row) => {
        for (let column = 0; column < 6; column += 1) {
          const frameName = `${prefix}-${name}-${column}`;
          if (!source.has(frameName)) source.add(frameName, 0, column * 192, row * 192, 192, 192);
        }
        const animationKey = `${prefix}-${name}`;
        if (!this.anims.exists(animationKey)) this.anims.create({
          key: animationKey,
          frames: Array.from({ length: 6 }, (_, index) => ({ key: texture, frame: `${prefix}-${name}-${index}` })),
          frameRate: 14,
          repeat: -1,
        });
      });
    });
  }

  private registerSheetAnimations(textureKey: string, prefix: string, animations: readonly string[], frameWidth: number, frameHeight: number, startX: number, startY: number): void {
    const texture = this.textures.get(textureKey);
    animations.forEach((animation, row) => {
      for (let column = 0; column < 8; column += 1) {
        const frameName = `${prefix}-${animation}-${column}`;
        if (!texture.has(frameName)) texture.add(frameName, 0, startX + column * frameWidth, startY + row * frameHeight, frameWidth, frameHeight);
      }
      const key = `${prefix}-${animation}`;
      if (!this.anims.exists(key)) this.anims.create({ key, frames: Array.from({ length: 8 }, (_, index) => ({ key: textureKey, frame: `${prefix}-${animation}-${index}` })), frameRate: animation.startsWith('attack') ? 12 : 8, repeat: animation === 'idle' || animation === 'walk' ? -1 : 0 });
    });
  }

  private generatePlayerTexture(key: string): void {
    if (this.textures.exists(key)) return;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x5b3425).fillRoundedRect(8, 17, 22, 25, 6);
    if (this.armorEquipped) {
      graphics.fillStyle(0x71859a).fillRoundedRect(5, 16, 28, 30, 5);
      graphics.fillStyle(0xc7d7e2).fillTriangle(7, 18, 2, 28, 9, 32).fillTriangle(31, 18, 38, 28, 31, 32);
      graphics.lineStyle(2, 0xeaf7ff, 0.8).lineBetween(9, 21, 29, 21);
    }
    graphics.fillStyle(0xd9b28c).fillCircle(19, 12, 10);
    graphics.fillStyle(0x2a1b16).fillCircle(16, 10, 2).fillCircle(23, 10, 2);
    graphics.fillStyle(0xf0dfbd).fillCircle(16, 9, 0.8).fillCircle(23, 9, 0.8);
    graphics.lineStyle(5, 0xd9b28c).lineBetween(8, 23, 2, 34).lineBetween(30, 23, 35, 33);
    graphics.lineStyle(6, 0x44342d).lineBetween(13, 40, 11, 51).lineBetween(25, 40, 27, 51);
    graphics.fillStyle(0x2b211d).fillRoundedRect(5, 48, 10, 4, 2).fillRoundedRect(23, 48, 11, 4, 2);
    graphics.fillStyle(0xc39a4a).fillTriangle(28, 19, 38, 26, 29, 29);
    graphics.generateTexture(key, 40, 54);
    graphics.destroy();
  }

  private createSwordSlash(): Phaser.GameObjects.Container {
    const slash = this.add.graphics();
    slash.lineStyle(9, this.stage.accentColor, 0.13);
    slash.beginPath();
    slash.arc(0, 0, 62, -1.1, 0.95, false);
    slash.strokePath();
    slash.lineStyle(3, 0xfff4d1, 0.72);
    slash.beginPath();
    slash.arc(0, 0, 67, -1.06, 0.88, false);
    slash.strokePath();

    const sword = this.add.graphics();
    sword.fillStyle(0x6d4826).fillRoundedRect(3, -4, 22, 8, 3);
    sword.fillStyle(0xd7a84b).fillRect(21, -11, 6, 22);
    sword.fillStyle(0xf8ead0).fillTriangle(25, -6, 74, 0, 25, 6);
    sword.lineStyle(2, 0x9aa6a3, 1).lineBetween(28, 0, 68, 0);
    sword.fillStyle(0xffffff, 0.7).fillTriangle(31, -3, 67, -1, 31, 0);

    const container = this.add.container(this.player.x, this.player.y, [slash, sword]);
    container.setDepth(12).setScale(this.player.flipX ? -1 : 1, 1).setRotation(-1.15);
    this.tweens.add({
      targets: container,
      rotation: 0.9,
      duration: 155,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: 70,
          onComplete: () => container.destroy(),
        });
      },
    });
    return container;
  }

  private generateEnemyTexture(key: string, boss: boolean): void {
    if (this.textures.exists(key)) return;
    const width = boss ? 94 : 48;
    const height = boss ? 96 : 50;
    const bodyColor = boss ? this.stage.accentColor : this.stage.groundColor;
    const graphics = this.add.graphics();
    const eyeColor = this.stage.accentColor;

    if (boss) {
      graphics.fillStyle(0x332319).fillTriangle(8, 28, 20, 0, 34, 28);
      graphics.fillTriangle(60, 28, 74, 0, 88, 28);
      graphics.fillStyle(bodyColor).fillRoundedRect(8, 18, 78, 68, 25);
      graphics.fillStyle(0x251a16).fillRoundedRect(0, 51, 18, 12, 5);
      graphics.fillRoundedRect(76, 51, 18, 12, 5);
      graphics.fillRoundedRect(18, 80, 20, 14, 5);
      graphics.fillRoundedRect(56, 80, 20, 14, 5);
      graphics.fillStyle(0x2a1814).fillTriangle(17, 40, 38, 34, 35, 43);
      graphics.fillTriangle(77, 40, 56, 34, 59, 43);
      graphics.fillStyle(eyeColor).fillCircle(31, 43, 6).fillCircle(63, 43, 6);
      graphics.fillStyle(0x17110f).fillCircle(33, 44, 2).fillCircle(61, 44, 2);
      graphics.lineStyle(4, 0x2a1814).beginPath().moveTo(34, 65).lineTo(47, 70).lineTo(61, 65).strokePath();
      graphics.fillStyle(eyeColor, 0.35).fillCircle(47, 69, 5);
    } else {
      graphics.fillStyle(bodyColor).fillRoundedRect(5, 11, 38, 34, 14);
      graphics.fillStyle(this.stage.accentColor)
        .fillTriangle(8, 17, 14, 1, 22, 15)
        .fillTriangle(27, 15, 35, 1, 41, 17);
      graphics.fillRoundedRect(0, 29, 12, 8, 4).fillRoundedRect(36, 29, 12, 8, 4);
      graphics.fillStyle(eyeColor).fillCircle(17, 26, 4).fillCircle(31, 26, 4);
      graphics.fillStyle(0x17110f).fillCircle(18, 27, 1.5).fillCircle(30, 27, 1.5);
      graphics.lineStyle(2, 0x251814).lineBetween(19, 37, 29, 37);
      graphics.fillStyle(0x251814).fillRoundedRect(8, 42, 12, 7, 3).fillRoundedRect(28, 42, 12, 7, 3);
    }

    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  private generateBossProjectileTexture(key: string): void {
    if (this.textures.exists(key)) return;
    const graphics = this.add.graphics();
    graphics.fillStyle(this.stage.accentColor, 0.18).fillCircle(18, 9, 9);
    graphics.fillStyle(this.stage.accentColor, 0.55).fillTriangle(0, 9, 18, 3, 18, 15);
    graphics.fillStyle(0xfff4d1, 0.95).fillCircle(20, 9, 5);
    graphics.fillStyle(0xffffff, 0.9).fillCircle(22, 7, 1.5);
    graphics.generateTexture(key, 28, 18);
    graphics.destroy();
  }

  private generatePlayerSkillTexture(key: string, color: number): void {
    if (this.textures.exists(key)) return;
    const graphics = this.add.graphics();
    graphics.fillStyle(color, 0.18).fillEllipse(14, 8, 28, 16);
    graphics.fillStyle(color, 0.55).fillTriangle(0, 8, 18, 2, 18, 14);
    graphics.fillStyle(0xeafaff, 1).fillCircle(20, 8, 5);
    graphics.fillStyle(0xffffff, 0.95).fillCircle(22, 6, 1.5);
    graphics.generateTexture(key, 28, 16);
    graphics.destroy();
  }
}
