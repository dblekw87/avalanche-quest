import { parseEther } from 'viem';

export type UpgradeLevels = { attack: number; vitality: number; defense: number };
export type UpgradeDefinition = { id: 0 | 1 | 2; key: keyof UpgradeLevels; name: string; description: string; basePrice: bigint };

export const upgradeDefinitions = [
  { id: 0, key: 'attack', name: 'Weapon Upgrade', description: 'Increase basic attack and skill damage by 1 per level.', basePrice: parseEther('30') },
  { id: 1, key: 'vitality', name: 'Vitality Upgrade', description: 'Increase maximum vitality by 2 per level.', basePrice: parseEther('25') },
  { id: 2, key: 'defense', name: 'Defense Upgrade', description: 'Reduce incoming damage as the level increases.', basePrice: parseEther('35') },
] as const satisfies readonly UpgradeDefinition[];

export const characterUpgradeAbi = [
  { type: 'function', name: 'levels', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }, { name: 'upgradeType', type: 'uint8' }], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'priceFor', stateMutability: 'pure', inputs: [{ name: 'upgradeType', type: 'uint8' }, { name: 'currentLevel', type: 'uint8' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'purchaseUpgrade', stateMutability: 'nonpayable', inputs: [{ name: 'upgradeType', type: 'uint8' }], outputs: [] },
] as const;
