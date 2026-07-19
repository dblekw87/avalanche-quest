import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  equipmentModifierCaps,
  itemTypeToEquipmentSlot,
  resolveEquipmentModifiers,
} from '../src/game/systems/equipment-modifiers.js';

describe('equipment NFT modifiers', () => {
  it('maps legacy and accessory item types without invalid fallbacks', () => {
    assert.equal(itemTypeToEquipmentSlot(0), 'weapon');
    assert.equal(itemTypeToEquipmentSlot(1), 'armor');
    assert.equal(itemTypeToEquipmentSlot(2), 'accessory');
    assert.equal(itemTypeToEquipmentSlot(3), null);
  });

  it('combines one item per slot and respects every balance cap', () => {
    const modifiers = resolveEquipmentModifiers([
      { tokenId: '1', slot: 'weapon', rarity: 3, power: 10_000 },
      { tokenId: '2', slot: 'armor', rarity: 3, power: 10_000 },
      { tokenId: '3', slot: 'accessory', rarity: 3, power: 10_000 },
    ]);

    assert.deepEqual(modifiers, equipmentModifierCaps);
  });

  it('rejects duplicate slots and duplicate token IDs', () => {
    assert.throws(() => resolveEquipmentModifiers([
      { tokenId: '1', slot: 'weapon', rarity: 0, power: 10 },
      { tokenId: '2', slot: 'weapon', rarity: 0, power: 10 },
    ]), /Duplicate weapon slot/);

    assert.throws(() => resolveEquipmentModifiers([
      { tokenId: '1', slot: 'weapon', rarity: 0, power: 10 },
      { tokenId: '1', slot: 'armor', rarity: 0, power: 10 },
    ]), /Duplicate equipment token/);
  });

  it('does not accumulate an item more than once across stages', () => {
    const item = [{ tokenId: '9', slot: 'accessory', rarity: 2, power: 80 }] as const;
    assert.deepEqual(resolveEquipmentModifiers(item), resolveEquipmentModifiers(item));
  });
});
