import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import sharp from 'sharp';

import { getStageDifficulty } from '../src/game/config/difficulty.js';
import {
  DUALBLADE_FRAME_BASELINES_PX,
  DUALBLADE_TARGET_BASELINE_PX,
} from '../src/game/config/character-visuals.js';
import { STAGE_COMBAT_PRESENTATIONS } from '../src/game/content/combat-presentation-manifest.js';
import {
  canonicalBossFingerprint,
  canonicalBossMechanicalFingerprint,
  canonicalEnemyFingerprint,
  STAGE_COMBAT_PROFILES,
} from '../src/game/content/stage-combat-catalog.js';
import { stageIds, stages } from '../src/game/config/stages.js';

describe('stage combat catalog', () => {
  it('defines one ordered combat identity for every stage', () => {
    assert.equal(STAGE_COMBAT_PROFILES.length, 50);
    assert.deepEqual(
      STAGE_COMBAT_PROFILES.map((profile) => profile.stageNumber),
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
    assert.equal(new Set(STAGE_COMBAT_PROFILES.map((profile) => profile.stageId)).size, 50);
    assert.equal(new Set(STAGE_COMBAT_PROFILES.map((profile) => profile.boss.id)).size, 50);
  });

  it('gives every boss three, four, or five phases with 12 named patterns per phase', () => {
    STAGE_COMBAT_PROFILES.forEach((profile) => {
      assert.equal(profile.boss.phases.length, profile.stageNumber >= 41 ? 5 : profile.stageNumber >= 31 ? 4 : 3);
      const mechanicFamilies = new Set(profile.boss.phases.flatMap((phase) => (
        phase.firstCycle.map((entry) => entry.executorId)
      )));
      assert.ok(mechanicFamilies.size >= 8);
      profile.boss.phases.forEach((phase) => {
        assert.ok(phase.firstCycle.length >= 12 && phase.firstCycle.length <= 15);
        assert.ok(phase.repeatDeck.length >= 12 && phase.repeatDeck.length <= 15);
        assert.equal(new Set(phase.firstCycle.map((entry) => entry.id)).size, phase.firstCycle.length);
        phase.firstCycle.forEach((entry) => {
          assert.ok(entry.name.length > 8);
          assert.ok(entry.telegraphMs >= 700);
          assert.ok(entry.recoveryMs >= (profile.stageNumber >= 41 ? 320 : 500));
          assert.match(entry.presentationId, new RegExp(`boss\\.s${String(profile.stageNumber).padStart(2, '0')}\\.`));
        });
      });
    });
  });

  it('rejects speed, health, count, or tint-only stage identities', () => {
    const bossFingerprints = STAGE_COMBAT_PROFILES.map(canonicalBossFingerprint);
    const mechanicalFingerprints = STAGE_COMBAT_PROFILES.map(canonicalBossMechanicalFingerprint);
    const enemyFingerprints = STAGE_COMBAT_PROFILES.map(canonicalEnemyFingerprint);
    assert.equal(new Set(bossFingerprints).size, 50);
    assert.equal(new Set(mechanicalFingerprints).size, 50);
    assert.equal(new Set(enemyFingerprints).size, 50);
  });

  it('keeps ordinary locomotion slow and makes charge a named mechanic only', () => {
    STAGE_COMBAT_PROFILES.forEach((profile) => {
      assert.ok(profile.boss.baselineSpeedPxPerSec >= 70);
      assert.ok(profile.boss.baselineSpeedPxPerSec <= 105);
      profile.boss.phases.forEach((phase) => {
        phase.firstCycle.forEach((entry) => {
          assert.doesNotMatch(entry.id, /speed|faster|projectile-count|tint-only/);
        });
      });
    });
  });

  it('defines unique enemy skills and teach-test-combine encounters', () => {
    const skillIds = new Set<string>();
    const presentationIds = new Set<string>();
    STAGE_COMBAT_PROFILES.forEach((profile) => {
      const { signature, encounters } = profile.enemies;
      assert.ok(signature.telegraphMs >= 700);
      assert.ok(signature.recoveryMs >= (profile.stageNumber >= 41 ? 350 : 500));
      assert.deepEqual(encounters.map((encounter) => encounter.lesson), ['teach', 'test', 'combine']);
      assert.equal(new Set(encounters.map((encounter) => encounter.seed)).size, 3);
      assert.ok(encounters.every((encounter) => encounter.signatureSkillId === signature.id));
      assert.ok(encounters.every((encounter) => encounter.maxAlive <= (profile.stageNumber >= 31 ? 4 : 3)));
      assert.equal(skillIds.has(signature.id), false);
      assert.equal(presentationIds.has(signature.presentationId), false);
      skillIds.add(signature.id);
      presentationIds.add(signature.presentationId);
    });
    assert.equal(skillIds.size, 50);
    assert.equal(presentationIds.size, 50);
  });

  it('links production actor/projectile art and keeps projectile art unique', () => {
    assert.equal(STAGE_COMBAT_PRESENTATIONS.length, 50);
    assert.equal(new Set(STAGE_COMBAT_PRESENTATIONS.map((manifest) => manifest.telegraphShapeSignature)).size, 50);
    STAGE_COMBAT_PRESENTATIONS.forEach((manifest) => {
      assert.equal(manifest.stageNumber >= 1 && manifest.stageNumber <= 50, true);
      assert.equal(existsSync(join(process.cwd(), 'public', manifest.bossActorSrc.slice(1))), true);
      assert.equal(existsSync(join(process.cwd(), 'public', manifest.minionActorSrc.slice(1))), true);
      assert.equal(existsSync(join(process.cwd(), 'public', manifest.guardianActorSrc.slice(1))), true);
      assert.equal(existsSync(join(process.cwd(), 'public', manifest.heraldActorSrc.slice(1))), true);
      assert.equal(existsSync(join(process.cwd(), 'public', manifest.bossProjectileSrc.slice(1))), true);
      assert.equal(existsSync(join(process.cwd(), 'public', manifest.minionProjectileSrc.slice(1))), true);
      assert.equal(manifest.bossActorStatus, 'production');
      assert.equal(manifest.minionActorStatus, 'production');
      assert.equal(manifest.telegraphMode, 'procedural-geometry');
    });
    const projectileHashes = STAGE_COMBAT_PRESENTATIONS
      .map((manifest) => createHash('sha256')
        .update(readFileSync(join(process.cwd(), 'public', manifest.bossProjectileSrc.slice(1))))
        .digest('hex'));
    const minionProjectileHashes = STAGE_COMBAT_PRESENTATIONS
      .map((manifest) => createHash('sha256')
        .update(readFileSync(join(process.cwd(), 'public', manifest.minionProjectileSrc.slice(1))))
        .digest('hex'));
    assert.equal(new Set(projectileHashes).size, 50);
    assert.equal(new Set(minionProjectileHashes).size, 50);
  });

  it('keeps every boss, mid-boss, and minion projectile frame off a rectangular background', async () => {
    const assertTransparentFrameEdges = async (assetPath: string, frameCount: number) => {
      const { data, info } = await sharp(assetPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(info.width % frameCount, 0);
      const frameWidth = info.width / frameCount;
      for (let frame = 0; frame < frameCount; frame += 1) {
        const left = frame * frameWidth;
        const edgePoints = [
          [left, 0],
          [left + frameWidth - 1, 0],
          [left, info.height - 1],
          [left + frameWidth - 1, info.height - 1],
        ] as const;
        edgePoints.forEach(([x, y]) => {
          assert.equal(data[(y * info.width + x) * 4 + 3], 0);
        });
        let transparentPixels = 0;
        for (let y = 0; y < info.height; y += 1) {
          for (let x = left; x < left + frameWidth; x += 1) {
            if (data[(y * info.width + x) * 4 + 3] === 0) transparentPixels += 1;
          }
        }
        assert.ok(transparentPixels >= frameWidth * info.height * 0.12);
      }
    };

    await Promise.all(STAGE_COMBAT_PRESENTATIONS.flatMap((manifest) => [
      assertTransparentFrameEdges(
        join(process.cwd(), 'public', manifest.bossProjectileSrc.slice(1)),
        1,
      ),
      assertTransparentFrameEdges(
        join(process.cwd(), 'public', manifest.minionProjectileSrc.slice(1)),
        4,
      ),
    ]));
  });

  it('exports stage 31-50 boss and minion sheets on the runtime frame grid', async () => {
    const specialPresentations = STAGE_COMBAT_PRESENTATIONS.filter((manifest) => manifest.stageNumber >= 31);
    await Promise.all(specialPresentations.flatMap(async (manifest) => {
      const bossPath = join(process.cwd(), 'public', manifest.bossActorSrc.slice(1));
      const minionPath = join(process.cwd(), 'public', manifest.minionActorSrc.slice(1));
      const [boss, minion] = await Promise.all([
        sharp(bossPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(minionPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      ]);
      assert.equal(boss.info.width, 2_048);
      assert.equal(boss.info.height, 256);
      assert.equal(minion.info.width, 1_024);
      assert.equal(minion.info.height, 256);
      [boss, minion].forEach(({ data, info }) => {
        for (let x = 0; x < info.width; x += 1) {
          assert.equal(data[x * 4 + 3], 0);
          assert.equal(data[((info.height - 1) * info.width + x) * 4 + 3], 0);
        }
      });
    }));
  });

  it('uses bounded movement speeds and long-form placements', () => {
    stageIds.forEach((stageId) => {
      const stage = stages[stageId];
      const normalEnemies = stage.enemies.filter((enemy) => !enemy.boss && !enemy.elite);
      const boss = stage.enemies.find((enemy) => enemy.boss);
      assert.ok(boss);
      assert.ok(normalEnemies.length >= 5 && normalEnemies.length <= (stage.number >= 41 ? 98 : 12));
      normalEnemies.forEach((enemy) => {
        assert.ok(enemy.speed >= 38 && enemy.speed <= 70);
        assert.ok(enemy.archetypeId);
        assert.ok(enemy.encounterId);
        assert.match(enemy.combatDefinitionId, /^enemy\.skill\.s\d{2}\./);
      });
      assert.ok(boss.speed >= 70 && boss.speed <= 105);
      assert.match(boss.combatDefinitionId, /^boss\.s\d{2}\./);
    });
  });

  it('builds stages 41-50 as five-times-long routes with dense monsters, two mid-bosses, and one final boss', () => {
    stageIds.filter((stageId) => stages[stageId].number >= 41).forEach((stageId) => {
      const stage = stages[stageId];
      const elites = stage.enemies.filter((enemy) => enemy.elite);
      const boss = stage.enemies.find((enemy) => enemy.boss);
      const normalEnemies = stage.enemies.filter((enemy) => !enemy.boss && !enemy.elite);
      assert.equal(stage.worldWidth, 58_000);
      assert.equal(stage.bossArenaStartX, 56_000);
      assert.equal(elites.length, 2);
      assert.ok(elites[0]!.x > 18_000 && elites[0]!.x < 20_000);
      assert.ok(elites[1]!.x > 37_000 && elites[1]!.x < 39_000);
      assert.ok(boss && boss.x > stage.bossArenaStartX);
      assert.ok(normalEnemies.length >= 80 && normalEnemies.length <= 98);
      assert.ok(stage.platforms.length > 120);
      assert.equal(
        existsSync(join(process.cwd(), 'public', 'assets', 'maps-special', `stage-${stage.number}-v2.png`)),
        true,
      );
      assert.equal(
        existsSync(join(process.cwd(), 'public', 'assets', 'platforms-special', `stage-${stage.number}.png`)),
        true,
      );
    });
  });

  it('applies the requested progression tiers, health floors, damage, and faster cadence', () => {
    assert.equal(getStageDifficulty(1).recommendedSkillLevel, 2);
    assert.equal(getStageDifficulty(11).recommendedSkillLevel, 4);
    assert.equal(getStageDifficulty(21).tier, 'hard');
    assert.equal(getStageDifficulty(31).tier, 'extreme');
    assert.equal(getStageDifficulty(37).tier, 'cataclysm');
    assert.equal(getStageDifficulty(41).tier, 'apocalypse');
    assert.equal(getStageDifficulty(50).tier, 'apocalypse');

    stageIds.forEach((stageId) => {
      const stage = stages[stageId];
      const difficulty = getStageDifficulty(stage.number);
      const normalEnemies = stage.enemies.filter((enemy) => !enemy.boss && !enemy.elite);
      const elites = stage.enemies.filter((enemy) => enemy.elite);
      const boss = stage.enemies.find((enemy) => enemy.boss);
      assert.ok(boss);
      assert.ok(normalEnemies.every((enemy) => enemy.health >= difficulty.minimumNormalHealth));
      assert.ok(elites.every((enemy) => enemy.health >= difficulty.minimumEliteHealth));
      assert.ok(boss.health >= difficulty.minimumBossHealth);
      assert.ok(difficulty.incomingDamagePermille >= 1_250);
      assert.ok(difficulty.minionCastCadenceMs <= 2_200);
      assert.ok(difficulty.hostileProjectileSpeedPxPerSec >= 225);
      assert.ok(difficulty.hostileProjectileSpeedPxPerSec <= 250);
    });
    const questSceneSource = readFileSync(
      join(process.cwd(), 'src', 'game', 'scenes', 'quest-scene.ts'),
      'utf8',
    );
    assert.doesNotMatch(questSceneSource, /Math\.ceil\(enemy\.maxHealth\s*\/\s*3\)/);
  });

  it('grounds every dualblade animation against the same 149px foot line', () => {
    assert.equal(DUALBLADE_TARGET_BASELINE_PX, 149);
    assert.deepEqual(
      Object.keys(DUALBLADE_FRAME_BASELINES_PX),
      ['idle', 'walk', 'run', 'dash', 'jump', 'attack', 'skill', 'hit', 'death'],
    );
    Object.values(DUALBLADE_FRAME_BASELINES_PX).forEach((baseline) => {
      assert.ok(baseline <= DUALBLADE_TARGET_BASELINE_PX);
      assert.ok(DUALBLADE_TARGET_BASELINE_PX - baseline <= 42);
    });
    assert.equal(
      DUALBLADE_TARGET_BASELINE_PX - DUALBLADE_FRAME_BASELINES_PX.idle!,
      10,
    );
  });
});
