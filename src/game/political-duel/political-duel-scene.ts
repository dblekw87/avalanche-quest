import * as Phaser from 'phaser';

import { QuestAudioDirector } from '@/game/audio/quest-audio-director';
import type { MobileGameAction } from '@/game/mobile-game-controls';

import { opposingFaction, politicalFighters, type PoliticalFaction, type PoliticalSkill } from './definitions';

const WIDTH = 1120;
const HEIGHT = 520;
const FLOOR_Y = 450;
const MAX_HEALTH = 180;
const PLAYER_SPEED = 270;

type FighterState = {
  faction: PoliticalFaction;
  sprite: Phaser.Physics.Arcade.Sprite;
  health: number;
  shieldUntil: number;
  powerUntil: number;
  nextActionAt: number;
  patternIndex: number;
};

type Hazard = { body: Phaser.Physics.Arcade.Sprite; expiresAt: number; damage: number; owner: 'player' | 'boss'; hitRadius?: number; piercing?: boolean; hasHit?: boolean };

export class PoliticalDuelScene extends Phaser.Scene {
  private readonly audioDirector: QuestAudioDirector;
  private player!: FighterState;
  private boss!: FighterState;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private skillKeys = new Map<string, Phaser.Input.Keyboard.Key>();
  private cooldowns = new Map<string, number>();
  private hazards: Hazard[] = [];
  private playerHealthBar!: Phaser.GameObjects.Rectangle;
  private bossHealthBar!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private ended = false;
  private dashReadyAt = 0;
  private dashUntil = 0;
  private dashDirection = 1;
  private mobileLeft = false;
  private mobileRight = false;
  private mobileJumpQueued = false;
  private mobileDashQueued = false;
  private mobileAttackQueued = false;
  private readonly mobileSkillQueue = new Set<string>();

  constructor(private readonly selectedFaction: PoliticalFaction) {
    super('PoliticalDuelScene');
    this.audioDirector = new QuestAudioDirector(selectedFaction === 'conservative' ? 19 : 20);
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

  triggerMobileSkill(skillKey: string): void {
    if (politicalFighters[this.player.faction].skills.some((skill) => skill.key === skillKey)) this.mobileSkillQueue.add(skillKey);
  }

  preload(): void {
    this.load.image('political-reference', '/assets/political-duel/skill-reference.png');
    (['conservative', 'progressive'] as const).forEach((faction) => {
      politicalFighters[faction].skills.forEach((skill) => {
        const skillId = `${faction}-${skill.key.toLowerCase()}`;
        this.load.spritesheet(`political-vfx-${skillId}`, `/assets/political-duel/skill-vfx/${skillId}.png`, { frameWidth: 256, frameHeight: 256 });
      });
    });
    this.load.spritesheet('political-conservative-sheet', '/assets/political-duel/political-conservative-sheet.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('political-progressive-sheet', '/assets/political-duel/political-progressive-sheet.png', { frameWidth: 256, frameHeight: 256 });
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audioDirector.stop());
    this.physics.world.setBounds(0, 0, WIDTH, FLOOR_Y);
    this.createArena();
    this.createAtlasFrames();
    this.createFighterAnimations();
    this.createSkillVfxAnimations();
    this.createFighters();
    this.createHud();
    this.createInput();
    this.statusText.setText(`HARD DUEL · ${politicalFighters[this.selectedFaction].label} VS ${politicalFighters[this.boss.faction].label}`);
  }

  update(time: number): void {
    if (this.ended) return;
    this.updatePlayer(time);
    this.updateBoss(time);
    this.updateHazards(time);
    this.resolveContact(time);
  }

  private createArena(): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x16080b, 0x071427, 0x26090d, 0x061a27, 1);
    graphics.fillRect(0, 0, WIDTH, HEIGHT);
    for (let index = 0; index < 14; index += 1) {
      const x = index * 90;
      graphics.lineStyle(1, index < 7 ? 0x6d151c : 0x123f75, 0.38);
      graphics.lineBetween(x, 90, WIDTH / 2, FLOOR_Y);
    }
    graphics.fillStyle(0x11141b, 1).fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
    graphics.lineStyle(3, 0xe8d9ad, 0.7).lineBetween(0, FLOOR_Y, WIDTH, FLOOR_Y);
    graphics.lineStyle(2, 0xffffff, 0.18).lineBetween(WIDTH / 2, 90, WIDTH / 2, FLOOR_Y);
    this.add.text(72, 104, 'CONSERVATIVE CAMP', { fontFamily: 'monospace', fontSize: '20px', color: '#ff5960', fontStyle: 'bold' }).setAlpha(0.7);
    this.add.text(WIDTH - 72, 104, 'PROGRESSIVE CAMP', { fontFamily: 'monospace', fontSize: '20px', color: '#4ca6ff', fontStyle: 'bold' }).setOrigin(1, 0).setAlpha(0.7);
    this.add.text(WIDTH / 2, 70, 'SPECIAL ARENA · NO OBSTACLES', { fontFamily: 'monospace', fontSize: '13px', color: '#e9dfca' }).setOrigin(0.5).setAlpha(0.8);
  }

  private createAtlasFrames(): void {
    const texture = this.textures.get('political-reference');
    (['conservative', 'progressive'] as const).forEach((faction) => {
      politicalFighters[faction].skills.forEach((skill) => {
        const key = `${faction}-${skill.key}`;
        if (!texture.has(key)) texture.add(key, 0, skill.frame.x, skill.frame.y, skill.frame.width, skill.frame.height);
      });
    });
  }

  private createFighterAnimations(): void {
    (['conservative', 'progressive'] as const).forEach((faction) => {
      const textureKey = `political-${faction}-sheet`;
      const definitions = [
        { name: 'idle', frames: [0], rate: 2, repeat: -1 },
        { name: 'walk', frames: [0, 1], rate: 6, repeat: -1 },
        { name: 'run', frames: [1, 2], rate: 9, repeat: -1 },
        { name: 'jump', frames: [3], rate: 2, repeat: 0 },
        { name: 'attack', frames: [0, 4, 0], rate: 12, repeat: 0 },
        { name: 'cast', frames: [0, 5, 5, 0], rate: 10, repeat: 0 },
        { name: 'hit', frames: [6, 0], rate: 8, repeat: 0 },
        { name: 'knockdown', frames: [6, 7], rate: 5, repeat: 0 },
      ] as const;
      definitions.forEach((definition) => {
        const key = `${faction}-${definition.name}`;
        if (this.anims.exists(key)) return;
        this.anims.create({
          key,
          frames: definition.frames.map((frame) => ({ key: textureKey, frame })),
          frameRate: definition.rate,
          repeat: definition.repeat,
        });
      });
    });
  }

  private createSkillVfxAnimations(): void {
    (['conservative', 'progressive'] as const).forEach((faction) => {
      politicalFighters[faction].skills.forEach((skill) => {
        const key = `${faction}-${skill.key}-vfx`;
        if (this.anims.exists(key)) return;
        const textureKey = `political-vfx-${faction}-${skill.key.toLowerCase()}`;
        const projectileFrames = skill.key === 'Q' || (faction === 'conservative' && skill.key === 'R');
        this.anims.create({
          key,
          frames: (projectileFrames ? [0, 1, 2, 3, 2, 1] : [0, 1, 2, 3]).map((frame) => ({ key: textureKey, frame })),
          frameRate: 11,
          repeat: projectileFrames || skill.key === 'E' || skill.key === 'R' || skill.key === 'X' || skill.key === 'C' ? -1 : 0,
        });
      });
    });
  }

  private createFighters(): void {
    const bossFaction = opposingFaction(this.selectedFaction);
    this.player = this.makeFighter(this.selectedFaction, 170, false);
    this.boss = this.makeFighter(bossFaction, 950, true);
  }

  private makeFighter(faction: PoliticalFaction, x: number, boss: boolean): FighterState {
    const scale = boss ? 0.46 : 0.38;
    const spriteY = FLOOR_Y - (boss ? 55 : 47);
    const textureKey = `political-${faction}-sheet`;
    const sprite = this.physics.add.sprite(x, spriteY, textureKey, 0)
      .setScale(scale)
      .setCollideWorldBounds(true)
      .setDepth(8)
      .setFlipX(faction === 'conservative');
    const body = sprite.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setSize(82, 146).setOffset(87, 96);
      body.setMaxVelocity(520, 720);
    }
    sprite.play(`${faction}-idle`);
    return { faction, sprite, health: MAX_HEALTH, shieldUntil: 0, powerUntil: 0, nextActionAt: 1_000, patternIndex: 0 };
  }

  private createHud(): void {
    this.add.rectangle(24, 22, 420, 22, 0x111111, 0.9).setOrigin(0).setDepth(20);
    this.add.rectangle(WIDTH - 24, 22, 420, 22, 0x111111, 0.9).setOrigin(1, 0).setDepth(20);
    this.playerHealthBar = this.add.rectangle(28, 26, 412, 14, politicalFighters[this.player.faction].color).setOrigin(0).setDepth(21);
    this.bossHealthBar = this.add.rectangle(WIDTH - 28, 26, 412, 14, politicalFighters[this.boss.faction].color).setOrigin(1, 0).setDepth(21);
    this.add.text(26, 48, `PLAYER · ${politicalFighters[this.player.faction].label}`, { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff' }).setDepth(21);
    this.add.text(WIDTH - 26, 48, `HARD BOSS · ${politicalFighters[this.boss.faction].label}`, { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff' }).setOrigin(1, 0).setDepth(21);
    this.statusText = this.add.text(WIDTH / 2, 24, '', { fontFamily: 'monospace', fontSize: '12px', color: '#f2e7ce', fontStyle: 'bold' }).setOrigin(0.5).setDepth(21);
    const skills = politicalFighters[this.player.faction].skills;
    skills.forEach((skill, index) => {
      const x = 28 + index * 74;
      this.add.image(x, HEIGHT - 54, 'political-reference', `${this.player.faction}-${skill.key}`).setDisplaySize(62, 62).setOrigin(0).setDepth(20);
      this.add.text(x + 4, HEIGHT - 50, skill.key, { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', backgroundColor: '#111827' }).setDepth(21);
    });
    this.add.text(WIDTH - 18, HEIGHT - 23, '← → MOVE · ↑ JUMP · SHIFT DASH · SPACE ATTACK · Q W E R Z X C V SKILLS', { fontFamily: 'monospace', fontSize: '11px', color: '#e6d7ba' }).setOrigin(1).setDepth(21);
  }

  private createInput(): void {
    if (!this.input.keyboard) return;
    this.input.keyboard.once('keydown', () => void this.audioDirector.unlock());
    this.input.once('pointerdown', () => void this.audioDirector.unlock());
    this.cursors = this.input.keyboard.createCursorKeys();
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    politicalFighters[this.player.faction].skills.forEach((skill) => {
      this.skillKeys.set(skill.key, this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes[skill.key]));
    });
  }

  private updatePlayer(time: number): void {
    const body = this.player.sprite.body;
    if (!(body instanceof Phaser.Physics.Arcade.Body)) return;
    const direction = (this.cursors.left?.isDown || this.mobileLeft ? -1 : 0) + (this.cursors.right?.isDown || this.mobileRight ? 1 : 0);
    const dashRequested = Phaser.Input.Keyboard.JustDown(this.dashKey) || this.mobileDashQueued;
    this.mobileDashQueued = false;
    if (dashRequested && time >= this.dashReadyAt) {
      this.dashDirection = direction || (this.player.sprite.flipX ? -1 : 1);
      this.dashUntil = time + 180;
      this.dashReadyAt = time + 900;
      this.player.sprite.setFlipX(this.dashDirection < 0).setVelocity(this.dashDirection * 720, 0);
      this.motion(this.player, 'run');
      this.spawnDashAfterimages();
    }
    if (time < this.dashUntil) {
      this.player.sprite.setVelocityX(this.dashDirection * 720);
      return;
    }
    this.player.sprite.setVelocityX(direction * PLAYER_SPEED);
    if (direction !== 0) {
      this.player.sprite.setFlipX(direction < 0);
      this.motion(this.player, 'run');
    } else if (body.blocked.down) this.motion(this.player, 'idle');
    const jumpRequested = Phaser.Input.Keyboard.JustDown(this.cursors.up!) || this.mobileJumpQueued;
    this.mobileJumpQueued = false;
    if (jumpRequested && body.blocked.down) {
      this.player.sprite.setVelocityY(-560);
      this.motion(this.player, 'jump');
    }
    const attackRequested = Phaser.Input.Keyboard.JustDown(this.attackKey) || this.mobileAttackQueued;
    this.mobileAttackQueued = false;
    if (attackRequested) this.basicAttack(this.player, this.boss, false);
    politicalFighters[this.player.faction].skills.forEach((skill) => {
      const key = this.skillKeys.get(skill.key);
      const mobileRequested = this.mobileSkillQueue.delete(skill.key);
      if (((key && Phaser.Input.Keyboard.JustDown(key)) || mobileRequested) && time >= (this.cooldowns.get(skill.key) ?? 0)) {
        this.cooldowns.set(skill.key, time + skill.cooldownMs);
        this.castSkill(this.player, this.boss, skill, false, time);
      }
    });
  }

  private spawnDashAfterimages(): void {
    [0, 55, 110].forEach((delay, index) => {
      this.time.delayedCall(delay, () => {
        if (!this.player.sprite.active) return;
        const ghost = this.add.image(this.player.sprite.x, this.player.sprite.y, this.player.sprite.texture.key, this.player.sprite.frame.name)
          .setScale(this.player.sprite.scaleX, this.player.sprite.scaleY)
          .setFlipX(this.player.sprite.flipX)
          .setTint(politicalFighters[this.player.faction].secondaryColor)
          .setAlpha(0.42 - index * 0.09)
          .setDepth(7);
        this.tweens.add({ targets: ghost, alpha: 0, x: ghost.x - this.dashDirection * 46, duration: 230, onComplete: () => ghost.destroy() });
      });
    });
  }

  private updateBoss(time: number): void {
    const distance = this.player.sprite.x - this.boss.sprite.x;
    const body = this.boss.sprite.body;
    if (!(body instanceof Phaser.Physics.Arcade.Body)) return;
    if (time < this.boss.nextActionAt) {
      const direction = Math.sign(distance);
      this.boss.sprite.setVelocityX(Math.abs(distance) > 230 ? direction * 155 : -direction * 75);
      this.boss.sprite.setFlipX(direction < 0);
      this.motion(this.boss, 'run');
      return;
    }
    const pattern = this.boss.patternIndex % 12;
    this.boss.patternIndex += 1;
    this.boss.nextActionAt = time + Phaser.Math.Between(850, 1_250);
    const skills = politicalFighters[this.boss.faction].skills;
    if (pattern < 8) this.castSkill(this.boss, this.player, skills[pattern]!, true, time);
    else if (pattern === 8) this.bossDashCombo(time);
    else if (pattern === 9) this.bossLeapSlam(time);
    else if (pattern === 10) this.bossCrossfire(time);
    else this.bossTeleportBurst(time);
  }

  private basicAttack(source: FighterState, target: FighterState, boss: boolean): void {
    const direction = target.sprite.x >= source.sprite.x ? 1 : -1;
    source.sprite.setFlipX(direction < 0);
    this.motion(source, 'attack');
    const color = politicalFighters[source.faction].color;
    const slash = this.add.arc(source.sprite.x + direction * 62, source.sprite.y, 48, direction > 0 ? 290 : 110, direction > 0 ? 70 : 250, false, color, 0.72).setDepth(12);
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.5, duration: 220, onComplete: () => slash.destroy() });
    if (Phaser.Math.Distance.Between(source.sprite.x, source.sprite.y, target.sprite.x, target.sprite.y) < 126) this.damage(target, boss ? 8 : 6, source.sprite.x);
  }

  private castSkill(source: FighterState, target: FighterState, skill: PoliticalSkill, boss: boolean, time: number): void {
    void this.audioDirector.unlock().then(() => this.audioDirector.playSkill(source.faction, skill.key));
    this.motion(source, 'cast');
    if (skill.key !== 'C') this.showSkillBanner(source, skill);
    const direction = target.sprite.x >= source.sprite.x ? 1 : -1;
    const key = skill.key;
    if (key === 'E') {
      source.shieldUntil = time + 3_200;
      this.bodyBuff(source, skill, 4_000);
      this.spinWholeBody(source);
      return;
    }
    if (key === 'R') {
      if (source.faction === 'conservative') {
        source.shieldUntil = time + 4_500;
        this.aura(source, politicalFighters[source.faction].secondaryColor, 4_000);
        this.projectileVolley(source, target, skill, boss, 1);
      } else this.centerAttack(source, target, skill, 300, 430, 235);
      return;
    }
    if (key === 'C') {
      source.powerUntil = time + 5_000;
      this.overheadSkill(source, skill, 3_200);
      return;
    }
    if (key === 'W') {
      source.powerUntil = time + 5_000;
      this.aura(source, politicalFighters[source.faction].secondaryColor, 3_200);
      if (source.faction === 'conservative') this.selfAreaBurst(source, target, skill);
      else this.sideAreaBurst(source, target, skill);
      return;
    }
    if (key === 'X') {
      if (source.faction === 'conservative') this.projectileVolley(source, target, skill, boss, 1);
      else this.zoneBurst(source, target, skill, boss, 2);
      return;
    }
    if (key === 'Q') {
      source.sprite.setVelocityX(direction * 480);
      this.projectileVolley(source, target, skill, boss, boss ? 3 : 1);
      return;
    }
    if (key === 'Z') {
      this.centeredPillars(source, target, skill);
      return;
    }
    this.ultimate(source, target, skill, boss);
  }

  private projectileVolley(source: FighterState, target: FighterState, skill: PoliticalSkill, boss: boolean, count: number): void {
    const direction = target.sprite.x >= source.sprite.x ? 1 : -1;
    for (let index = 0; index < count; index += 1) {
      this.time.delayedCall(index * 100, () => {
        const isBull = source.faction === 'conservative' && skill.key === 'X';
        const displaySize = isBull ? 230 : skill.key === 'Q' || skill.key === 'R' ? 138 : 124;
        const projectile = this.physics.add.sprite(
          source.sprite.x + direction * 50,
          isBull ? FLOOR_Y - displaySize / 2 : source.sprite.y - 12 + (index - 1) * 28,
          `political-vfx-${source.faction}-${skill.key.toLowerCase()}`,
        ).setDisplaySize(displaySize, displaySize).setDepth(11).setAlpha(1).setFlipX(direction < 0);
        projectile.play(`${source.faction}-${skill.key}-vfx`);
        projectile.body.setAllowGravity(false).setVelocity(direction * (isBull ? 610 : boss ? 430 : 540), 0).setSize(isBull ? 164 : 62, isBull ? 82 : 62);
        if (!isBull && skill.key !== 'Q') this.tweens.add({ targets: projectile, angle: direction * 8, yoyo: true, repeat: -1, duration: 150 });
        this.hazards.push({
          body: projectile,
          expiresAt: this.time.now + 1_900,
          damage: this.powerDamage(source, skill.damage),
          owner: boss ? 'boss' : 'player',
          ...(isBull ? { hitRadius: 118, piercing: true } : {}),
        });
      });
    }
  }

  private zoneBurst(source: FighterState, target: FighterState, skill: PoliticalSkill, boss: boolean, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const x = Phaser.Math.Clamp(target.sprite.x + (index - Math.floor(count / 2)) * 105, 50, WIDTH - 50);
      const warning = this.add.circle(x, FLOOR_Y - 8, 46, politicalFighters[source.faction].color, 0.18).setScale(1, 0.25).setDepth(5);
      this.time.delayedCall(420 + index * 55, () => {
        warning.destroy();
        const blastSize = skill.key === 'Z' ? 210 : 124;
        const blast = this.add.sprite(x, FLOOR_Y - (skill.key === 'Z' ? 96 : 62), `political-vfx-${source.faction}-${skill.key.toLowerCase()}`)
          .setDisplaySize(blastSize, blastSize)
          .setDepth(11)
          .setAlpha(0.96);
        blast.play(`${source.faction}-${skill.key}-vfx`);
        this.tweens.add({ targets: blast, y: FLOOR_Y - 112, scaleX: 1.35, scaleY: 1.65, alpha: 0, duration: 520, onComplete: () => blast.destroy() });
        if (Math.abs(target.sprite.x - x) < 76) this.damage(target, this.powerDamage(source, skill.damage), source.sprite.x);
      });
    }
  }

  private selfAreaBurst(source: FighterState, target: FighterState, skill: PoliticalSkill): void {
    const effect = this.add.sprite(source.sprite.x, FLOOR_Y - 150, `political-vfx-${source.faction}-${skill.key.toLowerCase()}`)
      .setDisplaySize(420, 300)
      .setDepth(11)
      .setAlpha(1);
    effect.play(`${source.faction}-${skill.key}-vfx`);
    this.tweens.add({
      targets: effect,
      scaleX: effect.scaleX * 1.18,
      scaleY: effect.scaleY * 1.22,
      alpha: 0,
      duration: 760,
      onUpdate: () => effect.setX(source.sprite.x),
      onComplete: () => effect.destroy(),
    });
    if (Phaser.Math.Distance.Between(source.sprite.x, source.sprite.y, target.sprite.x, target.sprite.y) <= 235) {
      this.damage(target, this.powerDamage(source, skill.damage), source.sprite.x);
    }
  }

  private sideAreaBurst(source: FighterState, target: FighterState, skill: PoliticalSkill): void {
    [-240, 0, 240].forEach((offset, index) => {
      this.time.delayedCall(index * 70, () => {
        const x = Phaser.Math.Clamp(source.sprite.x + offset, 60, WIDTH - 60);
        const effect = this.add.sprite(x, FLOOR_Y - 120, `political-vfx-${source.faction}-${skill.key.toLowerCase()}`)
          .setDisplaySize(300, 240)
          .setDepth(11)
          .setAlpha(1);
        effect.play(`${source.faction}-${skill.key}-vfx`);
        this.tweens.add({ targets: effect, scaleX: 1.16, scaleY: 1.28, y: effect.y - 32, alpha: 0, duration: 820, onComplete: () => effect.destroy() });
        if (Math.abs(target.sprite.x - x) <= 145) this.damage(target, this.powerDamage(source, skill.damage), source.sprite.x);
      });
    });
  }

  private centerAttack(source: FighterState, target: FighterState, skill: PoliticalSkill, displayWidth: number, displayHeight: number, radius: number): void {
    const effect = this.add.sprite(source.sprite.x, source.sprite.y - 16, `political-vfx-${source.faction}-${skill.key.toLowerCase()}`)
      .setDisplaySize(displayWidth, displayHeight)
      .setDepth(11)
      .setAlpha(1)
      .setAngle(0);
    effect.play(`${source.faction}-${skill.key}-vfx`);
    this.tweens.add({
      targets: effect,
      scaleX: effect.scaleX * 1.18,
      scaleY: effect.scaleY * 1.18,
      alpha: 0,
      duration: 820,
      onUpdate: () => effect.setPosition(source.sprite.x, source.sprite.y - 16).setAngle(0),
      onComplete: () => effect.destroy(),
    });
    if (Phaser.Math.Distance.Between(source.sprite.x, source.sprite.y, target.sprite.x, target.sprite.y) <= radius) {
      this.damage(target, this.powerDamage(source, skill.damage), source.sprite.x);
    }
  }

  private centeredPillars(source: FighterState, target: FighterState, skill: PoliticalSkill): void {
    [-320, -160, 0, 160, 320].forEach((offset, index) => {
      const x = Phaser.Math.Clamp(source.sprite.x + offset, 50, WIDTH - 50);
      const warning = this.add.ellipse(x, FLOOR_Y - 8, 104, 22, politicalFighters[source.faction].color, 0.2).setDepth(5);
      this.time.delayedCall(360 + index * 70, () => {
        warning.destroy();
        const pillar = this.add.sprite(x, FLOOR_Y - 150, `political-vfx-${source.faction}-${skill.key.toLowerCase()}`)
          .setDisplaySize(190, 300)
          .setDepth(11)
          .setAlpha(1);
        pillar.play(`${source.faction}-${skill.key}-vfx`);
        this.tweens.add({ targets: pillar, y: FLOOR_Y - 220, scaleX: 1.16, scaleY: 1.45, alpha: 0, duration: 900, onComplete: () => pillar.destroy() });
        if (Math.abs(target.sprite.x - x) <= 92) this.damage(target, this.powerDamage(source, skill.damage), source.sprite.x);
      });
    });
  }

  private ultimate(source: FighterState, target: FighterState, skill: PoliticalSkill, boss: boolean): void {
    this.cameras.main.flash(300, source.faction === 'conservative' ? 255 : 60, source.faction === 'progressive' ? 220 : 40, 70);
    this.cameras.main.shake(650, 0.014);
    const wave = this.add.sprite(WIDTH / 2, FLOOR_Y - 118, `political-vfx-${source.faction}-${skill.key.toLowerCase()}`)
      .setDisplaySize(680, 190)
      .setDepth(14)
      .setAlpha(0.92);
    wave.play(`${source.faction}-${skill.key}-vfx`);
    this.tweens.add({ targets: wave, scaleX: 1.28, scaleY: 1.45, alpha: 0, duration: 900, onComplete: () => wave.destroy() });
    this.time.delayedCall(360, () => this.damage(target, this.powerDamage(source, skill.damage), source.sprite.x));
    if (boss) [-2, -1, 0, 1, 2].forEach((offset, index) => this.time.delayedCall(index * 100, () => this.zoneBurst(source, target, { ...skill, damage: 5 }, true, Math.abs(offset) + 1)));
  }

  private bossDashCombo(time: number): void {
    this.statusText.setText('PATTERN 09 · 연속 돌진 베기');
    [0, 180, 360].forEach((delay) => this.time.delayedCall(delay, () => {
      if (this.ended) return;
      this.boss.sprite.setVelocityX((this.player.sprite.x > this.boss.sprite.x ? 1 : -1) * 560);
      this.basicAttack(this.boss, this.player, true);
    }));
    this.boss.nextActionAt = time + 1_150;
  }

  private bossLeapSlam(time: number): void {
    this.statusText.setText('PATTERN 10 · 도약 광역 강타');
    this.boss.sprite.setVelocityY(-620);
    this.motion(this.boss, 'jump');
    this.time.delayedCall(620, () => this.zoneBurst(this.boss, this.player, { ...politicalFighters[this.boss.faction].skills[4]!, damage: 12 }, true, 5));
    this.boss.nextActionAt = time + 1_450;
  }

  private bossCrossfire(time: number): void {
    this.statusText.setText('PATTERN 11 · 교차 탄막');
    [0, 150, 300, 450].forEach((delay) => this.time.delayedCall(delay, () => this.projectileVolley(this.boss, this.player, { ...politicalFighters[this.boss.faction].skills[0]!, damage: 7 }, true, 3)));
    this.boss.nextActionAt = time + 1_500;
  }

  private bossTeleportBurst(time: number): void {
    this.statusText.setText('PATTERN 12 · 순간 이동 폭발');
    this.boss.sprite.setAlpha(0.15);
    this.time.delayedCall(220, () => {
      this.boss.sprite.setPosition(Phaser.Math.Clamp(this.player.sprite.x + Phaser.Math.RND.pick([-160, 160]), 80, WIDTH - 80), FLOOR_Y - 62).setAlpha(1);
      this.zoneBurst(this.boss, this.player, { ...politicalFighters[this.boss.faction].skills[7]!, damage: 14 }, true, 3);
    });
    this.boss.nextActionAt = time + 1_350;
  }

  private aura(source: FighterState, color: number, duration: number): void {
    const aura = this.add.circle(source.sprite.x, source.sprite.y, 54, color, 0.22).setStrokeStyle(3, color, 0.8).setDepth(6);
    this.tweens.add({ targets: aura, scale: 1.45, alpha: 0, duration, onUpdate: () => aura.setPosition(source.sprite.x, source.sprite.y), onComplete: () => aura.destroy() });
  }

  private bodyBuff(source: FighterState, skill: PoliticalSkill, duration: number): void {
    const color = politicalFighters[source.faction].color;
    const effect = this.add.sprite(0, -8, `political-vfx-${source.faction}-${skill.key.toLowerCase()}`)
      .setDisplaySize(138, 138)
      .setAlpha(0.72)
      .play(`${source.faction}-${skill.key}-vfx`);
    const glow = this.add.rectangle(0, 4, 76, 116, color, 0.1).setStrokeStyle(2, color, 0.35);
    const lowerRing = this.add.ellipse(0, 48, 92, 25, color, 0.13).setStrokeStyle(3, color, 0.85);
    const upperRing = this.add.ellipse(0, 4, 68, 18, color, 0.06).setStrokeStyle(2, politicalFighters[source.faction].secondaryColor, 0.72);
    const container = this.add.container(source.sprite.x, source.sprite.y, [glow, effect, lowerRing, upperRing]).setDepth(9);
    this.tweens.add({ targets: lowerRing, scaleX: 1.28, scaleY: 1.14, alpha: 0.28, yoyo: true, repeat: -1, duration: 420 });
    this.tweens.add({ targets: upperRing, scaleX: 1.22, scaleY: 1.16, alpha: 0.18, yoyo: true, repeat: -1, duration: 330 });
    this.tweens.add({
      targets: container,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onUpdate: () => container.setPosition(source.sprite.x, source.sprite.y),
      onComplete: () => container.destroy(true),
    });
  }

  private overheadSkill(source: FighterState, skill: PoliticalSkill, duration: number): void {
    const effect = this.add.sprite(source.sprite.x, source.sprite.y - 72, `political-vfx-${source.faction}-${skill.key.toLowerCase()}`)
      .setDisplaySize(118, 118)
      .setDepth(15)
      .setAlpha(0.96);
    effect.play(`${source.faction}-${skill.key}-vfx`);
    this.tweens.add({
      targets: effect,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onUpdate: () => effect.setPosition(source.sprite.x, source.sprite.y - 72).setAngle(0),
      onComplete: () => effect.destroy(),
    });
  }

  private showSkillBanner(source: FighterState, skill: PoliticalSkill): void {
    const icon = this.add.image(source.sprite.x, source.sprite.y - 105, 'political-reference', `${source.faction}-${skill.key}`).setDisplaySize(72, 72).setDepth(18).setAlpha(0);
    const label = this.add.text(source.sprite.x, source.sprite.y - 154, `${skill.key} · ${skill.name}`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', backgroundColor: '#090d16cc', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(19);
    this.tweens.add({ targets: [icon, label], alpha: 1, y: '-=16', yoyo: true, hold: 260, duration: 160, onComplete: () => { icon.destroy(); label.destroy(); } });
  }

  private spinWholeBody(fighter: FighterState): void {
    const duration = 520;
    fighter.sprite.setData('bodySpinUntil', this.time.now + duration);
    this.tweens.killTweensOf(fighter.sprite);
    fighter.sprite.setAngle(0);
    this.tweens.add({
      targets: fighter.sprite,
      angle: fighter.sprite.flipX ? -360 : 360,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        fighter.sprite.setAngle(0);
        fighter.sprite.setData('bodySpinUntil', 0);
      },
    });
  }

  private motion(fighter: FighterState, motion: 'idle' | 'run' | 'jump' | 'attack' | 'cast'): void {
    if ((motion === 'idle' || motion === 'run') && this.time.now < Number(fighter.sprite.getData('bodySpinUntil') ?? 0)) return;
    const repeatingMotion = motion === 'idle' || motion === 'run';
    if (repeatingMotion && fighter.sprite.getData('motion') === motion) return;
    fighter.sprite.setData('motion', motion);
    this.tweens.killTweensOf(fighter.sprite);
    fighter.sprite.setAngle(0).play(`${fighter.faction}-${motion}`, true);
    if (motion === 'jump') this.tweens.add({ targets: fighter.sprite, angle: fighter.sprite.flipX ? -7 : 7, yoyo: true, duration: 180 });
  }

  private updateHazards(time: number): void {
    this.hazards = this.hazards.filter((hazard) => {
      const target = hazard.owner === 'boss' ? this.player : this.boss;
      if (time >= hazard.expiresAt || hazard.body.x < -50 || hazard.body.x > WIDTH + 50) { hazard.body.destroy(); return false; }
      if (!hazard.hasHit && Phaser.Math.Distance.Between(hazard.body.x, hazard.body.y, target.sprite.x, target.sprite.y) < (hazard.hitRadius ?? 52)) {
        this.damage(target, hazard.damage, hazard.body.x);
        if (hazard.piercing) {
          hazard.hasHit = true;
          return true;
        }
        hazard.body.destroy();
        return false;
      }
      return true;
    });
  }

  private resolveContact(time: number): void {
    if (Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.boss.sprite.x, this.boss.sprite.y) < 72 && time >= this.boss.nextActionAt - 100) {
      this.damage(this.player, 5, this.boss.sprite.x);
    }
  }

  private powerDamage(source: FighterState, damage: number): number {
    return this.time.now < source.powerUntil ? Math.ceil(damage * 1.35) : damage;
  }

  private damage(target: FighterState, amount: number, sourceX: number): void {
    const finalDamage = this.time.now < target.shieldUntil ? Math.max(1, Math.ceil(amount * 0.42)) : amount;
    target.health = Math.max(0, target.health - finalDamage);
    target.sprite.setTintFill(0xffffff).setVelocityX(target.sprite.x > sourceX ? 190 : -190);
    target.sprite.setData('motion', 'hit').play(`${target.faction}-hit`, true);
    this.time.delayedCall(90, () => target.sprite.clearTint());
    this.playerHealthBar.width = 412 * (this.player.health / MAX_HEALTH);
    this.bossHealthBar.width = 412 * (this.boss.health / MAX_HEALTH);
    if (target.health === 0) this.finish(target === this.boss);
  }

  private finish(playerWon: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.audioDirector.stop();
    const defeated = playerWon ? this.boss : this.player;
    const victor = playerWon ? this.player : this.boss;
    defeated.sprite.play(`${defeated.faction}-knockdown`, true);
    victor.sprite.play(`${victor.faction}-idle`, true);
    this.physics.pause();
    const title = playerWon ? 'SPECIAL DUEL VICTORY' : 'HARD BOSS DEFEAT';
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 560, 210, 0x080b12, 0.94).setStrokeStyle(2, playerWon ? politicalFighters[this.player.faction].color : politicalFighters[this.boss.faction].color).setDepth(30);
    this.add.text(WIDTH / 2, HEIGHT / 2 - 45, title, { fontFamily: 'monospace', fontSize: '30px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(31);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 12, playerWon ? '12개 하드 패턴을 돌파했습니다.' : '상대 진영의 패턴을 읽고 다시 도전하세요.', { fontFamily: 'sans-serif', fontSize: '16px', color: '#d8cdb8' }).setOrigin(0.5).setDepth(31);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 62, '화면 아래의 나가기 버튼으로 진영을 다시 선택할 수 있습니다.', { fontFamily: 'sans-serif', fontSize: '12px', color: '#9e9586' }).setOrigin(0.5).setDepth(31);
    panel.setInteractive();
  }
}
