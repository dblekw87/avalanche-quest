import { parseEther } from 'viem';

export type UpgradeLevels = { attack: number; vitality: number; defense: number };
export type UpgradeDefinition = { id: 0 | 1 | 2; key: keyof UpgradeLevels; name: string; description: string; basePrice: bigint };

export const upgradeDefinitions = [
  { id: 0, key: 'attack', name: '무기 강화', description: '기본 공격과 스킬 피해가 단계마다 1 증가합니다.', basePrice: parseEther('30') },
  { id: 1, key: 'vitality', name: '생명력 강화', description: '최대 생명력이 단계마다 2 증가합니다.', basePrice: parseEther('25') },
  { id: 2, key: 'defense', name: '방어력 강화', description: '받는 피해를 단계에 따라 감소시킵니다.', basePrice: parseEther('35') },
] as const satisfies readonly UpgradeDefinition[];

export const characterUpgradeAbi = [
  { type: 'function', name: 'levels', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }, { name: 'upgradeType', type: 'uint8' }], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'priceFor', stateMutability: 'pure', inputs: [{ name: 'upgradeType', type: 'uint8' }, { name: 'currentLevel', type: 'uint8' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'purchaseUpgrade', stateMutability: 'nonpayable', inputs: [{ name: 'upgradeType', type: 'uint8' }], outputs: [] },
] as const;
