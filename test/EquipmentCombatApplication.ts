import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CharacterId } from '../src/game/characters.js';
import {
  applyEquipmentAttackPower,
  applyEquipmentCooldownReduction,
  applyEquipmentDamageReduction,
  applyEquipmentMaxHealth,
  applyEquipmentMovementSpeed,
} from '../src/game/systems/equipment-combat-application.js';
import type { EquipmentCombatModifiers } from '../src/game/types/equipment.js';

const ALL_PLAYABLE_CLASSES: readonly CharacterId[] = [
  'warrior',
  'mage',
  'spellblade',
  'archer',
  'dualblade',
  'brawler',
  'dragonknight',
  'gunslinger',
  'ssaulabi',
  'kickfighter',
  'venomancer',
  'pyromancer',
  'hammerguard',
  'axereaver',
  'elementalist',
  'warlock',
  'assettycoon',
  'conservative',
  'progressive',
];

const EQUIPPED_MODIFIERS: EquipmentCombatModifiers = {
  attackPower: 4,
  maxHealth: 17,
  damageReductionBps: 2_000,
  cooldownReductionBps: 1_500,
  movementSpeedBps: 1_000,
};

describe('equipment NFT combat application', () => {
  it('uses the same shared modifier path for every playable class', () => {
    ALL_PLAYABLE_CLASSES.forEach((characterId) => {
      const result = {
        characterId,
        attackDamage: applyEquipmentAttackPower(10, EQUIPPED_MODIFIERS),
        maxHealth: applyEquipmentMaxHealth(20, EQUIPPED_MODIFIERS),
        incomingDamage: applyEquipmentDamageReduction(10, EQUIPPED_MODIFIERS),
        cooldownMs: applyEquipmentCooldownReduction(2_000, 0, EQUIPPED_MODIFIERS, 0.21),
        movementSpeed: applyEquipmentMovementSpeed(225, EQUIPPED_MODIFIERS),
      };
      assert.deepEqual(result, {
        characterId,
        attackDamage: 14,
        maxHealth: 37,
        incomingDamage: 8,
        cooldownMs: 1_700,
        movementSpeed: 248,
      });
    });
  });

  it('applies class skill enhancement and NFT cooldown reduction together once', () => {
    assert.equal(
      applyEquipmentCooldownReduction(3_000, 0.06, EQUIPPED_MODIFIERS, 0.21),
      2_370,
    );
    assert.equal(
      applyEquipmentCooldownReduction(3_000, 0.21, EQUIPPED_MODIFIERS, 0.4),
      1_920,
    );
  });
});
