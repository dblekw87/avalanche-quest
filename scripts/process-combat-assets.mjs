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
    await clearAlphaMargins(bossSheet, { top: 70, right: 5, bottom: 3, left: 5 }),
    join(root, 'public', 'assets', 'boss-animation-sheets-special', `${bossKey}.png`),
  );
  await writePng(
    await clearAlphaMargins(minionSheet, { top: 70, right: 5, bottom: 3, left: 5 }),
    join(root, 'public', 'assets', 'minions-special', `${bossKey}.png`),
  );
  await writePng(
    await clearAlphaMargins(projectileSheet, { top: 70, right: 8, bottom: 4, left: 8 }),
    join(root, 'public', 'assets', 'projectiles-special', `${bossKey}.png`),
  );
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

await cleanRuntimeProjectiles();
for (const [stageNumber, inputPath] of packArguments()) {
  if (stageNumber < 31 || stageNumber > 40) {
    throw new Error(`Special stage pack must be stage 31-40, received ${stageNumber}.`);
  }
  await splitStagePack(stageNumber, inputPath);
}
