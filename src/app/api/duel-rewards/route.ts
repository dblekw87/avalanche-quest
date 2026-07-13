import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';
import { createPublicClient, getAddress, http, isAddress, isHex, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

import { assetTycoonLicenseAbi } from '@/features/asset-tycoon/asset-tycoon-contract';
import { duelAttemptStore } from '@/server/attempts/duel-store';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return error('Invalid request', 400);
  const player = 'player' in body ? body.player : null;
  const attemptId = 'attemptId' in body ? body.attemptId : null;
  const durationMs = 'durationMs' in body ? body.durationMs : null;
  if (typeof player !== 'string' || !isAddress(player) || typeof attemptId !== 'string' || !isHex(attemptId) || typeof durationMs !== 'number') return error('Invalid duel result', 400);
  const attempt = duelAttemptStore.get(attemptId as Hex);
  const normalizedPlayer = getAddress(player);
  if (!attempt || attempt.player !== normalizedPlayer || attempt.status !== 'started') return error('Duel attempt mismatch', 403);
  if (attempt.expiresAt < Date.now() || durationMs < 10_000 || durationMs > 30 * 60_000) return error('Duel result failed validation', 422);
  const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY;
  const rpcUrl = process.env.FUJI_RPC_URL ?? process.env.NEXT_PUBLIC_FUJI_RPC_URL;
  const licenseValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_LICENSE_ADDRESS;
  if (!signerKey || !isHex(signerKey) || signerKey.length !== 66 || !rpcUrl || !licenseValue || !isAddress(licenseValue)) return error('Reward service is not configured', 503);
  try {
    const licenseAddress = getAddress(licenseValue);
    const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(rpcUrl) });
    const nonce = await publicClient.readContract({ address: licenseAddress, abi: assetTycoonLicenseAbi, functionName: 'nonces', args: [normalizedPlayer] });
    const claim = { claimId: `0x${randomBytes(32).toString('hex')}` as Hex, attemptId: attempt.id, player: normalizedPlayer, nonce, deadline: BigInt(Math.floor(Date.now() / 1_000) + 15 * 60) };
    const signer = privateKeyToAccount(signerKey as Hex);
    const signature = await signer.signTypedData({
      domain: { name: 'Avalanche Quest Asset Tycoon', version: '1', chainId: avalancheFuji.id, verifyingContract: licenseAddress },
      types: { MintClaim: [{ name: 'claimId', type: 'bytes32' }, { name: 'attemptId', type: 'bytes32' }, { name: 'player', type: 'address' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint64' }] },
      primaryType: 'MintClaim', message: claim,
    });
    attempt.status = 'verified';
    return NextResponse.json({ claim: { ...claim, nonce: nonce.toString(), deadline: claim.deadline.toString() }, signature });
  } catch {
    return error('Could not authorize duel reward', 502);
  }
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
