import {
  EMPTY_EQUIPMENT_MODIFIERS,
  type EquipmentCombatModifiers,
  type EquipmentSnapshotItem,
  type EquipmentSlot,
} from '@/game/types/equipment';

const MAX_ITEM_POWER = 10_000;
const MAX_ITEM_RARITY = 3;

export const equipmentModifierCaps: EquipmentCombatModifiers = {
  attackPower: 4,
  maxHealth: 20,
  damageReductionBps: 2_500,
  cooldownReductionBps: 2_000,
  movementSpeedBps: 1_500,
};

export function itemTypeToEquipmentSlot(itemType: number): EquipmentSlot | null {
  if (itemType === 0) return 'weapon';
  if (itemType === 1) return 'armor';
  if (itemType === 2) return 'accessory';
  return null;
}

export function resolveEquipmentModifiers(
  items: readonly EquipmentSnapshotItem[],
): EquipmentCombatModifiers {
  const slots = new Set<EquipmentSlot>();
  const tokenIds = new Set<string>();
  const totals = { ...EMPTY_EQUIPMENT_MODIFIERS };

  for (const item of items) {
    if (slots.has(item.slot)) throw new Error(`Duplicate ${item.slot} slot`);
    if (tokenIds.has(item.tokenId)) throw new Error('Duplicate equipment token');
    if (!Number.isSafeInteger(item.rarity) || item.rarity < 0 || item.rarity > MAX_ITEM_RARITY) {
      throw new Error('Unsupported equipment rarity');
    }
    if (!Number.isSafeInteger(item.power) || item.power < 0 || item.power > MAX_ITEM_POWER) {
      throw new Error('Unsupported equipment power');
    }
    slots.add(item.slot);
    tokenIds.add(item.tokenId);

    if (item.slot === 'weapon') {
      totals.attackPower += 1 + Math.floor(item.power / 90) + Math.floor(item.rarity / 2);
    } else if (item.slot === 'armor') {
      totals.maxHealth += 3 + Math.floor(item.power / 18) + item.rarity * 2;
      totals.damageReductionBps += 350 + item.power * 8 + item.rarity * 250;
    } else {
      totals.cooldownReductionBps += 300 + item.power * 5 + item.rarity * 150;
      totals.movementSpeedBps += 200 + item.power * 4 + item.rarity * 100;
    }
  }

  return {
    attackPower: Math.min(totals.attackPower, equipmentModifierCaps.attackPower),
    maxHealth: Math.min(totals.maxHealth, equipmentModifierCaps.maxHealth),
    damageReductionBps: Math.min(
      totals.damageReductionBps,
      equipmentModifierCaps.damageReductionBps,
    ),
    cooldownReductionBps: Math.min(
      totals.cooldownReductionBps,
      equipmentModifierCaps.cooldownReductionBps,
    ),
    movementSpeedBps: Math.min(
      totals.movementSpeedBps,
      equipmentModifierCaps.movementSpeedBps,
    ),
  };
}
