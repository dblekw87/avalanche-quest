import type { PoliticalFaction } from '@/game/political-duel/definitions';

export type GeneralCharacterId = 'warrior' | 'mage' | 'spellblade' | 'archer';
export type CharacterId = GeneralCharacterId | PoliticalFaction;
export type CharacterGroup = 'general' | 'special';

export function isPoliticalCharacter(characterId: CharacterId): characterId is PoliticalFaction {
  return characterId === 'conservative' || characterId === 'progressive';
}
