import type { Address, Hex } from 'viem';

import type { StageId } from '@/game/config/stages';

export type AttemptRecord = {
  id: Hex;
  player: Address;
  stageId: StageId;
  expiresAt: number;
  status: 'started' | 'verifying' | 'verified';
};

const globalStore = globalThis as typeof globalThis & {
  avalancheQuestAttempts?: Map<Hex, AttemptRecord>;
};

export const attemptStore =
  globalStore.avalancheQuestAttempts ?? new Map<Hex, AttemptRecord>();

globalStore.avalancheQuestAttempts = attemptStore;
