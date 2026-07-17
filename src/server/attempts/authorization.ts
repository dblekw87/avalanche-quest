import { createHmac, timingSafeEqual } from 'node:crypto';

import { getAddress, isAddress, isHex, type Address, type Hex } from 'viem';

import { isStageId, type StageId } from '@/game/config/stages';

export type AttemptAuthorization = Readonly<{
  attemptId: Hex;
  player: Address;
  stageId: StageId;
  expiresAt: number;
  signature: Hex;
}>;

function payload(authorization: Omit<AttemptAuthorization, 'signature'>): string {
  return [
    'avalanche-quest:stage-attempt:v1',
    authorization.attemptId,
    authorization.player,
    authorization.stageId,
    authorization.expiresAt.toString(),
  ].join('\n');
}

function signatureFor(
  authorization: Omit<AttemptAuthorization, 'signature'>,
  secret: string,
): Hex {
  return `0x${createHmac('sha256', secret).update(payload(authorization)).digest('hex')}`;
}

export function authorizeAttempt(
  authorization: Omit<AttemptAuthorization, 'signature'>,
  secret: string,
): AttemptAuthorization {
  return { ...authorization, signature: signatureFor(authorization, secret) };
}

export function parseAttemptAuthorization(value: unknown): AttemptAuthorization | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AttemptAuthorization>;
  if (
    typeof candidate.attemptId !== 'string'
    || !isHex(candidate.attemptId, { strict: true })
    || typeof candidate.player !== 'string'
    || !isAddress(candidate.player)
    || typeof candidate.stageId !== 'string'
    || !isStageId(candidate.stageId)
    || typeof candidate.expiresAt !== 'number'
    || !Number.isSafeInteger(candidate.expiresAt)
    || typeof candidate.signature !== 'string'
    || !isHex(candidate.signature, { strict: true })
  ) {
    return null;
  }
  return {
    attemptId: candidate.attemptId,
    player: getAddress(candidate.player),
    stageId: candidate.stageId,
    expiresAt: candidate.expiresAt,
    signature: candidate.signature,
  };
}

export function verifyAttemptAuthorization(
  authorization: AttemptAuthorization,
  secret: string,
): boolean {
  const expected = Buffer.from(signatureFor(authorization, secret).slice(2), 'hex');
  const received = Buffer.from(authorization.signature.slice(2), 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
