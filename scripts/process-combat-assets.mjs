import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import sharp from 'sharp';

const root = process.cwd();
const cellSize = 256;
const bossKeys = [
  'goblin-warlord', 'mist-wolf', 'rune-golem', 'lava-dragon', 'ice-queen',
  'desert-scorpion', 'wind-harpy', 'vampire-lord', 'deep-kraken', 'thunder-minotaur',
  'plague-necromancer', 'crystal-hydra', 'clockwork-titan', 'sand-wyrm', 'celestial-griffin',
  'void-witch', 'frost-mammoth', 'inferno-phoenix', 'abyss-leviathan', 'avalanche-emperor',
  'obsidian-behemoth', 'spectral-broker', 'iron-seraph', 'toxic-singularity', 'solar-devourer',
  'gravity-colossus', 'ruin-sovereign', 'chaos-auditor', 'extinction-dragon', 'compound-overlord',
  'eclipse-executioner', 'paradox-machinist', 'blood-moon-tyrant', 'infinite-tempest', 'godfall-arbiter',
  'chronos-warden', 'astral-gravekeeper', 'hellfire-origin', 'absolute-zero', 'eternity-devourer',
  'unwritten-sovereign', 'shattered-halo', 'bone-tide-leviathan', 'clockwork-oracle',
  'crimson-moon-beast', 'storm-executioner', 'void-archivist', 'glacial-war-engine',
  'reality-duelist', 'apocalypse-dragon-emperor',
];

function packArguments() {
  const entries = process.argv.slice(2).filter((value) => value.startsWith('--pack='));
  return new Map(entries.map((entry) => {
    const value = entry.slice('--pack='.length);
    const separator = value.indexOf('=');
    if (separator < 0) throw new Error(`Invalid pack argument: ${entry}`);
    return [Number(value.slice(0, separator)), value.slice(separator + 1)];
  }));
}

async function writePng(buffer, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(outputPath);
}

async function clearAlphaMargins(buffer, margins) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const top = margins.top ?? 0;
  const right = margins.right ?? 0;
  const bottom = margins.bottom ?? 0;
  const left = margins.left ?? 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const localX = x % cellSize;
      if (
        y < top
        || y >= info.height - bottom
        || localX < left
        || localX >= cellSize - right
      ) {
        data[(y * info.width + x) * 4 + 3] = 0;
      }
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

function floodBackground(data, width, height, matchesBackground) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (pixelIndex) => {
    if (visited[pixelIndex] === 1) return;
    const offset = pixelIndex * 4;
    if (!matchesBackground(data[offset], data[offset + 1], data[offset + 2])) return;
    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  for (let pixelIndex = 0; pixelIndex < visited.length; pixelIndex += 1) {
    if (visited[pixelIndex] === 1) data[pixelIndex * 4 + 3] = 0;
  }
}

async function removeFlatBackground(inputPath, outputPath, mode) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (mode === 'green') {
    for (let offset = 0; offset < data.length; offset += 4) {
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const greenDominance = green - Math.max(red, blue);
      if (green > 145 && greenDominance > 45) {
        data[offset + 3] = greenDominance > 100
          ? 0
          : Math.min(data[offset + 3], Math.round(255 * (1 - (greenDominance - 45) / 55)));
      }
    }
  } else if (mode === 'dark') {
    floodBackground(data, info.width, info.height, (red, green, blue) => (
      Math.max(red, green, blue) <= 58
    ));
  } else {
    floodBackground(data, info.width, info.height, (red, green, blue) => (
      Math.min(red, green, blue) >= 198
      && Math.max(red, green, blue) - Math.min(red, green, blue) <= 34
    ));
  }

  await writePng(
    await sharp(data, { raw: info }).png().toBuffer(),
    outputPath,
  );
}

async function splitStagePack(stageNumber, inputPath) {
  const bossKey = bossKeys[stageNumber - 1];
  if (!bossKey) throw new Error(`Missing boss key for stage ${stageNumber}.`);

  const transparentPack = await sharp(inputPath)
    .resize(1_024, 1_024, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const data = transparentPack.data;
  for (let offset = 0; offset < data.length; offset += 4) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const greenDominance = green - Math.max(red, blue);
    if (green > 145 && greenDominance > 45) {
      data[offset + 3] = greenDominance > 100
        ? 0
        : Math.min(data[offset + 3], Math.round(255 * (1 - (greenDominance - 45) / 55)));
    }
  }
  const transparentPng = await sharp(data, { raw: transparentPack.info }).png().toBuffer();

  const bossFrames = [];
  for (let frame = 0; frame < 8; frame += 1) {
    bossFrames.push({
      input: await sharp(transparentPng).extract({
        left: (frame % 4) * cellSize,
        top: Math.floor(frame / 4) * cellSize,
        width: cellSize,
        height: cellSize,
      }).png().toBuffer(),
      left: frame * cellSize,
      top: 0,
    });
  }
  const bossSheet = await sharp({
    create: { width: 2_048, height: cellSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(bossFrames).png().toBuffer();
  const minionSheet = await sharp(transparentPng)
    .extract({ left: 0, top: cellSize * 2, width: 1_024, height: cellSize })
    .png()
    .toBuffer();
  const projectileSheet = await sharp(transparentPng)
    .extract({ left: 0, top: cellSize * 3, width: 1_024, height: cellSize })
    .png()
    .toBuffer();

  await writePng(
    await clearAlphaMargins(bossSheet, { top: 70, right: 16, bottom: 12, left: 16 }),
    join(root, 'public', 'assets', 'boss-animation-sheets-special', `${bossKey}.png`),
  );
  await writePng(
    await clearAlphaMargins(minionSheet, { top: 70, right: 16, bottom: 12, left: 16 }),
    join(root, 'public', 'assets', 'minions-special', `${bossKey}.png`),
  );
  await writePng(
    await clearAlphaMargins(projectileSheet, { top: 70, right: 16, bottom: 12, left: 16 }),
    join(root, 'public', 'assets', 'projectiles-special', `${bossKey}.png`),
  );
}

async function splitStage41MidbossPack(inputPath) {
  const transparentPack = await sharp(inputPath)
    .resize(1_024, 1_024, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer();

  const writeMidbossSheet = async (key, rowOffset) => {
    const frames = [];
    for (let frame = 0; frame < 8; frame += 1) {
      frames.push({
        input: await sharp(transparentPack).extract({
          left: (frame % 4) * cellSize,
          top: (rowOffset + Math.floor(frame / 4)) * cellSize,
          width: cellSize,
          height: cellSize,
        }).png().toBuffer(),
        left: frame * cellSize,
        top: 0,
      });
    }
    const sheet = await sharp({
      create: { width: 2_048, height: cellSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite(frames).png().toBuffer();
    await writePng(
      await clearAlphaMargins(sheet, { top: 16, right: 16, bottom: 12, left: 16 }),
      join(root, 'public', 'assets', 'midbosses-special', `${key}.png`),
    );
  };

  await writeMidbossSheet('null-choir-sentinel', 0);
  await writeMidbossSheet('axiom-butcher', 2);
}

async function writeStage41Platform(inputPath) {
  const outputPath = join(root, 'public', 'assets', 'platforms-special', 'stage-41.png');
  await writePng(
    await sharp(inputPath)
      .resize(1_776, 888, { fit: 'fill' })
      .png()
      .toBuffer(),
    outputPath,
  );
}

async function writeStage41BossProjectile(inputPath) {
  const outputPath = join(
    root,
    'public',
    'assets',
    'boss-projectiles-special-alpha',
    'unwritten-sovereign.png',
  );
  const metadata = await sharp(inputPath).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Stage 41 boss projectile has no dimensions.');
  const cropSize = Math.round(Math.min(metadata.width, metadata.height) * 0.75);
  const cropLeft = Math.round((metadata.width - cropSize) / 2);
  const cropTop = Math.round((metadata.height - cropSize) / 2);
  await writePng(
    await sharp(inputPath)
      .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
      .resize(420, 420, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: 46,
        bottom: 46,
        left: 46,
        right: 46,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer(),
    outputPath,
  );
}

async function writeApexCampaignBossAssets(inputPath) {
  const atlas = await sharp(inputPath)
    .resize(1_536, 1_536, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer();
  const minionSource = join(root, 'public', 'assets', 'minions-special', 'unwritten-sovereign.png');
  const minionProjectileSource = join(root, 'public', 'assets', 'projectiles-special', 'unwritten-sovereign.png');
  const bossProjectileSource = join(
    root,
    'public',
    'assets',
    'boss-projectiles-special-alpha',
    'unwritten-sovereign.png',
  );
  const bobOffsets = [2, -2, -5, -2, 1, -1, -4, 0];
  const angles = [-1.2, -0.4, 0.5, 1.1, 0.6, -0.2, -0.8, 0];

  for (let stageNumber = 42; stageNumber <= 50; stageNumber += 1) {
    const atlasIndex = stageNumber - 42;
    const key = bossKeys[stageNumber - 1];
    if (!key) throw new Error(`Missing apex boss key for stage ${stageNumber}.`);
    const extractedCell = await sharp(atlas)
      .extract({
        left: (atlasIndex % 3) * 512,
        top: Math.floor(atlasIndex / 3) * 512,
        width: 512,
        height: 512,
      })
      .png()
      .toBuffer();
    const cell = await sharp(extractedCell)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(206, 216, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const frames = [];
    for (let frameIndex = 0; frameIndex < 8; frameIndex += 1) {
      const actor = await sharp(cell)
        .rotate(angles[frameIndex], { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize(
          Math.round(206 * (1 + (frameIndex % 4) * 0.006)),
          Math.round(216 * (1 + (frameIndex % 3) * 0.005)),
          { fit: 'fill' },
        )
        .png()
        .toBuffer();
      const actorMetadata = await sharp(actor).metadata();
      frames.push({
        input: actor,
        left: frameIndex * cellSize + Math.round((cellSize - (actorMetadata.width ?? 206)) / 2),
        top: Math.max(8, 20 + bobOffsets[frameIndex]),
      });
    }
    const bossSheet = await sharp({
      create: {
        width: cellSize * 8,
        height: cellSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(frames).png().toBuffer();
    await writePng(
      await clearAlphaMargins(bossSheet, { top: 8, right: 18, bottom: 8, left: 18 }),
      join(root, 'public', 'assets', 'boss-animation-sheets-special', `${key}.png`),
    );

    const hue = ((stageNumber - 41) * 34) % 360;
    await writePng(
      await sharp(minionSource).modulate({ hue, saturation: 1.04 }).png().toBuffer(),
      join(root, 'public', 'assets', 'minions-special', `${key}.png`),
    );
    await writePng(
      await sharp(minionProjectileSource).modulate({ hue, saturation: 1.12 }).png().toBuffer(),
      join(root, 'public', 'assets', 'projectiles-special', `${key}.png`),
    );
    await writePng(
      await sharp(bossProjectileSource)
        .rotate((stageNumber - 41) * 17, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .modulate({ hue, saturation: 1.08 })
        .png()
        .toBuffer(),
      join(root, 'public', 'assets', 'boss-projectiles-special-alpha', `${key}.png`),
    );
  }
}

async function writeApexCampaignMaps(inputPath) {
  const atlas = await sharp(inputPath)
    .resize(1_536, 1_536, { fit: 'fill' })
    .png()
    .toBuffer();
  const platformSource = join(root, 'public', 'assets', 'platforms-special', 'stage-41.png');
  for (let stageNumber = 42; stageNumber <= 50; stageNumber += 1) {
    const atlasIndex = stageNumber - 42;
    await writePng(
      await sharp(atlas)
        .extract({
          left: (atlasIndex % 3) * 512,
          top: Math.floor(atlasIndex / 3) * 512,
          width: 512,
          height: 512,
        })
        .resize(1_776, 888, { fit: 'fill' })
        .png()
        .toBuffer(),
      join(root, 'public', 'assets', 'maps-special', `stage-${stageNumber}-v2.png`),
    );
    await writePng(
      await sharp(platformSource)
        .modulate({ hue: ((stageNumber - 41) * 34) % 360, saturation: 1.06 })
        .png()
        .toBuffer(),
      join(root, 'public', 'assets', 'platforms-special', `stage-${stageNumber}.png`),
    );
  }
}

async function cleanRuntimeProjectiles() {
  for (let stageNumber = 1; stageNumber <= 30; stageNumber += 1) {
    const stageKey = String(stageNumber).padStart(2, '0');
    await removeFlatBackground(
      join(root, 'public', 'assets', 'projectiles-hd', `stage-${stageKey}.png`),
      join(root, 'public', 'assets', 'projectiles-alpha', `stage-${stageKey}.png`),
      'dark',
    );
  }

  for (let stageNumber = 1; stageNumber <= 40; stageNumber += 1) {
    const bossKey = bossKeys[stageNumber - 1];
    const special = stageNumber >= 31;
    const inputDirectory = special ? 'boss-projectiles-special' : 'boss-projectiles';
    const outputDirectory = special ? 'boss-projectiles-special-alpha' : 'boss-projectiles-alpha';
    await removeFlatBackground(
      join(root, 'public', 'assets', inputDirectory, `${bossKey}.png`),
      join(root, 'public', 'assets', outputDirectory, `${bossKey}.png`),
      stageNumber >= 21 ? 'light' : 'dark',
    );
  }

  // Stages 21-30 previously reused the stage 11-20 normal-projectile files.
  // Build four-frame stage-specific sheets from each stage's distinct combat
  // motif so the runtime identity changes in silhouette and motion, not tint.
  for (let stageNumber = 21; stageNumber <= 30; stageNumber += 1) {
    const bossKey = bossKeys[stageNumber - 1];
    const sourcePath = join(root, 'public', 'assets', 'boss-projectiles-alpha', `${bossKey}.png`);
    const frames = [];
    for (let frame = 0; frame < 4; frame += 1) {
      const input = await sharp(sourcePath)
        .resize(210, 210, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .rotate(frame * 90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize(cellSize, cellSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      frames.push({ input, left: frame * cellSize, top: 0 });
    }
    const sheet = await sharp({
      create: { width: 1_024, height: cellSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite(frames).png().toBuffer();
    await writePng(
      await clearAlphaMargins(sheet, { top: 5, right: 5, bottom: 5, left: 5 }),
      join(root, 'public', 'assets', 'projectiles-alpha', `stage-${String(stageNumber).padStart(2, '0')}.png`),
    );
  }
}

if (process.argv.includes('--clean-runtime')) await cleanRuntimeProjectiles();
for (const [stageNumber, inputPath] of packArguments()) {
  if (stageNumber < 31 || stageNumber > 50) {
    throw new Error(`Special stage pack must be stage 31-50, received ${stageNumber}.`);
  }
  await splitStagePack(stageNumber, inputPath);
}

const midbossPack = process.argv.find((value) => value.startsWith('--midboss-pack='));
if (midbossPack) await splitStage41MidbossPack(midbossPack.slice('--midboss-pack='.length));

const platform = process.argv.find((value) => value.startsWith('--platform='));
if (platform) await writeStage41Platform(platform.slice('--platform='.length));

const bossProjectile = process.argv.find((value) => value.startsWith('--boss-projectile='));
if (bossProjectile) await writeStage41BossProjectile(bossProjectile.slice('--boss-projectile='.length));

const apexBossAtlas = process.argv.find((value) => value.startsWith('--apex-boss-atlas='));
if (apexBossAtlas) await writeApexCampaignBossAssets(apexBossAtlas.slice('--apex-boss-atlas='.length));

const apexMapAtlas = process.argv.find((value) => value.startsWith('--apex-map-atlas='));
if (apexMapAtlas) await writeApexCampaignMaps(apexMapAtlas.slice('--apex-map-atlas='.length));
