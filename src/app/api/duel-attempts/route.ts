import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';
import { getAddress, isAddress, type Hex } from 'viem';

import type { PoliticalFaction } from '@/game/political-duel/definitions';
import { duelAttemptStore } from '@/server/attempts/duel-store';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const player = 'player' in body ? body.player : null;
  const faction = 'faction' in body ? body.faction : null;
  if (typeof player !== 'string' || !isAddress(player) || (faction !== 'conservative' && faction !== 'progressive')) {
    return NextResponse.json({ error: 'Invalid player or faction' }, { status: 400 });
  }
  const attemptId = `0x${randomBytes(32).toString('hex')}` as Hex;
  const now = Date.now();
  duelAttemptStore.set(attemptId, { id: attemptId, player: getAddress(player), faction: faction as PoliticalFaction, createdAt: now, expiresAt: now + 30 * 60_000, status: 'started' });
  return NextResponse.json({ attemptId });
}
