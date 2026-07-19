import { randomInt } from 'node:crypto';

import { stages, type StageId } from '@/game/config/stages';

export type LootDrop = Readonly<{
  itemType: number;
  rarity: number;
  power: number;
  rarityName: 'Common' | 'Rare' | 'Legendary' | 'Relic';
  typeName: 'Weapon' | 'Armor' | 'Accessory';
  name: string;
}>;

type RandomInt = (maxExclusive: number) => number;

export function rollLoot(stageId: StageId, nextInt: RandomInt = randomInt): LootDrop {
  const stage = stages[stageId];
  const rarityRoll = nextInt(100);
  const rarity = stage.number >= 41
    ? 3
    : rarityRoll < Math.min(8 + stage.number * 2, 25)
      ? 3
      : rarityRoll < 35 + stage.number * 2
        ? 2
        : rarityRoll < 78
          ? 1
          : 0;
  const rarityNames = ['Common', 'Rare', 'Legendary', 'Relic'] as const;
  const itemType = nextInt(3);
  const typeNames = ['Weapon', 'Armor', 'Accessory'] as const;
  const prefixes = ['Rugged', 'Runed', 'Mythic', 'Sovereign'] as const;
  const suffixes = ['Blade', 'Aegis', 'Relic'] as const;
  return {
    itemType,
    rarity,
    power: 8 + stage.number * 4 + rarity * 7 + nextInt(8),
    rarityName: rarityNames[rarity] ?? 'Common',
    typeName: typeNames[itemType] ?? 'Weapon',
    name: `${prefixes[rarity] ?? 'Rugged'} ${stage.worldLabel.split(' ')[0]} ${suffixes[itemType] ?? 'Relic'}`,
  };
}
