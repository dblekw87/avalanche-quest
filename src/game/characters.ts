import type { PoliticalFaction } from '@/game/political-duel/definitions';

export type GeneralCharacterId = 'warrior' | 'mage' | 'spellblade' | 'archer' | 'dualblade' | 'brawler' | 'dragonknight' | 'gunslinger' | 'ssaulabi' | 'kickfighter' | 'venomancer' | 'pyromancer' | 'hammerguard' | 'axereaver' | 'elementalist' | 'warlock';
export type InnateCharacterId = 'dualblade' | 'brawler' | 'dragonknight' | 'gunslinger' | 'ssaulabi' | 'kickfighter' | 'venomancer' | 'pyromancer' | 'hammerguard' | 'axereaver' | 'elementalist' | 'warlock';
export type SecretCharacterId = 'assettycoon';
export type CharacterId = GeneralCharacterId | SecretCharacterId | PoliticalFaction;
export type CharacterGroup = 'general' | 'special';

export function isPoliticalCharacter(characterId: CharacterId): characterId is PoliticalFaction {
  return characterId === 'conservative' || characterId === 'progressive';
}

export function isInnateCharacter(characterId: CharacterId): characterId is InnateCharacterId {
  return characterId === 'dualblade' || characterId === 'brawler' || characterId === 'dragonknight' || characterId === 'gunslinger'
    || characterId === 'ssaulabi' || characterId === 'kickfighter' || characterId === 'venomancer' || characterId === 'pyromancer'
    || characterId === 'hammerguard' || characterId === 'axereaver' || characterId === 'elementalist' || characterId === 'warlock';
}

export function isSecretCharacter(characterId: CharacterId): characterId is SecretCharacterId {
  return characterId === 'assettycoon';
}

export function isGeneralCharacter(characterId: CharacterId): characterId is GeneralCharacterId {
  return !isPoliticalCharacter(characterId) && !isSecretCharacter(characterId);
}
