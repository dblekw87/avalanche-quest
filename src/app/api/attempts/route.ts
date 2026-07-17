import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';
import { getAddress, isAddress, type Hex } from 'viem';

import { isStageId } from '@/game/config/stages';
import { authorizeAttempt } from '@/server/attempts/authorization';
import { attemptStore } from '@/server/attempts/store';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const player = 'player' in body ? body.player : null;
  const stageId = 'stageId' in body ? body.stageId : null;
  if (typeof player !== 'string' || !isAddress(player) || typeof stageId !== 'string' || !isStageId(stageId)) {
    return NextResponse.json({ error: 'Invalid player or stage' }, { status: 400 });
  }

  const signingSecret = process.env.REWARD_SIGNER_PRIVATE_KEY;
  if (!signingSecret) {
    return NextResponse.json({ error: 'Attempt service is not configured' }, { status: 503 });
  }

  const attemptId = `0x${randomBytes(32).toString('hex')}` as Hex;
  const expiresAt = Date.now() + 30 * 60 * 1_000;
  const normalizedPlayer = getAddress(player);
  attemptStore.set(attemptId, {
    id: attemptId,
    player: normalizedPlayer,
    stageId,
    expiresAt,
    status: 'started',
  });
  const attemptAuthorization = authorizeAttempt({
    attemptId,
    player: normalizedPlayer,
    stageId,
    expiresAt,
  }, signingSecret);
  return NextResponse.json({ attemptId, expiresAt, attemptAuthorization });
}
