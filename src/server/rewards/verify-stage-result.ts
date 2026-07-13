import type { StageResult } from '@/game/bridge/events';
import { isStageId, stages } from '@/game/config/stages';

export type VerificationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function verifyStageResult(result: StageResult): VerificationResult {
  if (!isStageId(result.stageId)) return { valid: false, reason: 'Unknown stage' };
  if (!Number.isInteger(result.durationMs) || result.durationMs < 1_000 || result.durationMs > 1_200_000) {
    return { valid: false, reason: 'Invalid duration' };
  }
  if (result.events.length < 4 || result.events.length > 64) {
    return { valid: false, reason: 'Invalid event count' };
  }

  let previousElapsed = -1;
  for (const event of result.events) {
    if (!Number.isInteger(event.elapsedMs) || event.elapsedMs < previousElapsed || event.elapsedMs > result.durationMs) {
      return { valid: false, reason: 'Invalid event ordering' };
    }
    previousElapsed = event.elapsedMs;
  }

  if (result.events[0]?.type !== 'run-started') {
    return { valid: false, reason: 'Missing run start' };
  }
  const lastEvent = result.events.at(-1);
  if (lastEvent?.type !== 'run-completed' || lastEvent.checkpoint !== 'run-completed') {
    return { valid: false, reason: 'Missing run completion' };
  }

  const checkpoints = result.events
    .filter((event) => event.type === 'checkpoint')
    .map((event) => event.checkpoint);
  const required = stages[result.stageId].enemies.filter((enemy) => enemy.boss).map((enemy) => `defeated:${enemy.id}`);
  if (required.some((checkpoint) => checkpoints.filter((value) => value === checkpoint).length !== 1)) {
    return { valid: false, reason: 'Required enemies were not defeated exactly once' };
  }
  if (checkpoints.filter((value) => value === 'boss-defeated').length !== 1) {
    return { valid: false, reason: 'Boss defeat was not recorded exactly once' };
  }

  return { valid: true };
}
