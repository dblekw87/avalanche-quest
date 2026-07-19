import type { Hex } from 'viem';

export const equipmentSlots = ['weapon', 'armor', 'accessory'] as const;

export type EquipmentSlot = (typeof equipmentSlots)[number];

export type EquipmentCombatModifiers = Readonly<{
  attackPower: number;
  maxHealth: number;
  damageReductionBps: number;
  cooldownReductionBps: number;
  movementSpeedBps: number;
}>;

export const EMPTY_EQUIPMENT_MODIFIERS: EquipmentCombatModifiers = {
  attackPower: 0,
  maxHealth: 0,
  damageReductionBps: 0,
  cooldownReductionBps: 0,
  movementSpeedBps: 0,
};

export type EquipmentSnapshotItem = Readonly<{
  tokenId: string;
  slot: EquipmentSlot;
  rarity: number;
  power: number;
}>;

export type EquipmentLoadoutSnapshot = Readonly<{
  version: 1;
  chainId: number;
  contract: string | null;
  items: readonly EquipmentSnapshotItem[];
  modifiers: EquipmentCombatModifiers;
  hash: Hex;
}>;

export type EquipmentTokenSelection = Partial<
  Readonly<Record<EquipmentSlot, string>>
>;
