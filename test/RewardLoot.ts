import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { rollLoot } from '../src/server/rewards/loot.js';

const maximumRoll = (maxExclusive: number) => maxExclusive - 1;

describe('server loot rules', () => {
  it('forces every Stage 41-50 NFT drop to Relic rarity', () => {
    const apexStages = ['unwritten-citadel', 'shattered-halo-cathedral', 'last-apocalypse-throne'] as const;
    apexStages.forEach((stageId) => {
      const loot = rollLoot(stageId, maximumRoll);
      assert.equal(loot.rarity, 3);
      assert.equal(loot.rarityName, 'Relic');
      assert.match(loot.name, /^Sovereign /);
    });
  });

  it('does not turn earlier-stage worst-case rolls into Relics', () => {
    const loot = rollLoot('verdant-pass', maximumRoll);

    assert.equal(loot.rarity, 0);
    assert.equal(loot.rarityName, 'Common');
  });
});
