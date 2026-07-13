import type { PoliticalFaction } from '@/game/political-duel/definitions';

export type GeneralCharacterId = 'warrior' | 'mage' | 'spellblade' | 'archer' | 'dualblade' | 'brawler';
export type InnateCharacterId = 'dualblade' | 'brawler';
export type CharacterId = GeneralCharacterId | PoliticalFaction;
export type CharacterGroup = 'general' | 'special';

export function isPoliticalCharacter(characterId: CharacterId): characterId is PoliticalFaction {
  return characterId === 'conservative' || characterId === 'progressive';
}

export function isInnateCharacter(characterId: CharacterId): characterId is InnateCharacterId {
  return characterId === 'dualblade' || characterId === 'brawler';
}
