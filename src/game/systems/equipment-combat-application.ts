import type { EquipmentCombatModifiers } from '@/game/types/equipment';

export function applyEquipmentAttackPower(
  baseDamage: number,
  modifiers: EquipmentCombatModifiers,
): number {
  return Math.max(0, Math.round(baseDamage)) + modifiers.attackPower;
}

export function applyEquipmentMaxHealth(
  baseMaxHealth: number,
  modifiers: EquipmentCombatModifiers,
): number {
  return Math.max(1, Math.round(baseMaxHealth)) + modifiers.maxHealth;
}

export function applyEquipmentDamageReduction(
  incomingDamage: number,
  modifiers: EquipmentCombatModifiers,
): number {
  return Math.max(1, Math.ceil(
    Math.max(1, incomingDamage)
      * (10_000 - modifiers.damageReductionBps)
      / 10_000,
  ));
}

export function applyEquipmentCooldownReduction(
  baseCooldownMs: number,
  classReduction: number,
  modifiers: EquipmentCombatModifiers,
  maximumReduction: number,
): number {
  const reduction = Math.min(
    maximumReduction,
    Math.max(0, classReduction) + modifiers.cooldownReductionBps / 10_000,
  );
  return Math.max(350, Math.round(baseCooldownMs * (1 - reduction)));
}

export function applyEquipmentMovementSpeed(
  baseMovementSpeed: number,
  modifiers: EquipmentCombatModifiers,
): number {
  return Math.round(baseMovementSpeed * (1 + modifiers.movementSpeedBps / 10_000));
}
