import type { Address, Hex } from 'viem';

import type { PoliticalFaction } from '@/game/political-duel/definitions';

export type DuelAttemptRecord = {
  id: Hex;
  player: Address;
  faction: PoliticalFaction;
  createdAt: number;
  expiresAt: number;
  status: 'started' | 'verified';
};

const globalStore = globalThis as typeof globalThis & { avalancheQuestDuelAttempts?: Map<Hex, DuelAttemptRecord> };
export const duelAttemptStore = globalStore.avalancheQuestDuelAttempts ?? new Map<Hex, DuelAttemptRecord>();
globalStore.avalancheQuestDuelAttempts = duelAttemptStore;
