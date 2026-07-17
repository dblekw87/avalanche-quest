import { randomBytes, randomInt } from 'node:crypto';

import { NextResponse } from 'next/server';
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  isHex,
  keccak256,
  parseEther,
  toBytes,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

import { rewardDistributorAbi } from '@/features/rewards/reward-contract';
import { assetTycoonLicenseAbi } from '@/features/asset-tycoon/asset-tycoon-contract';
import { gameItemAbi } from '@/features/items/item-contract';
import type { StageResult } from '@/game/bridge/events';
import { isStageId, stageIds, stages, type StageId } from '@/game/config/stages';
import { parseAttemptAuthorization, verifyAttemptAuthorization } from '@/server/attempts/authorization';
import { attemptStore } from '@/server/attempts/store';
import { verifyStageResult } from '@/server/rewards/verify-stage-result';

const rewards = Object.fromEntries(stageIds.map((id, index) => {
  const stageNumber = index + 1;
  const amount = stageNumber <= 20 ? 25 + index * 12 : 400 + (stageNumber - 20) ** 2 * 45;
  return [id, parseEther(String(amount))];
})) as Record<StageId, bigint>;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return error('Invalid request', 400);
  const player = 'player' in body ? body.player : null;
  const result = 'result' in body ? body.result : null;
  const authorizationValue = 'attemptAuthorization' in body ? body.attemptAuthorization : null;
  if (typeof player !== 'string' || !isAddress(player) || !isStageResult(result)) {
    return error('Invalid reward request', 400);
  }

  const normalizedPlayer = getAddress(player);
  const storedAttempt = attemptStore.get(result.attemptId as Hex);
  const signingSecret = process.env.REWARD_SIGNER_PRIVATE_KEY;
  const authorization = parseAttemptAuthorization(authorizationValue);
  const authorizedAttempt = signingSecret
    && authorization
    && verifyAttemptAuthorization(authorization, signingSecret)
    && authorization.attemptId === result.attemptId
    && authorization.player === normalizedPlayer
    && authorization.stageId === result.stageId
      ? {
          id: authorization.attemptId,
          player: authorization.player,
          stageId: authorization.stageId,
          expiresAt: authorization.expiresAt,
          status: 'started' as const,
        }
      : null;
  const attempt = storedAttempt ?? authorizedAttempt;
  if (!attempt || attempt.player !== normalizedPlayer || attempt.stageId !== result.stageId) {
    return error('Attempt does not match this wallet and stage', 403);
  }
  if (attempt.expiresAt < Date.now()) return error('Attempt expired', 410);
  if (attempt.status !== 'started') return error('Attempt was already submitted', 409);

  const verification = verifyStageResult(result);
  if (!verification.valid) return error(verification.reason, 422);

  const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY;
  const distributorAddress = process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS;
  const rpcUrl = process.env.FUJI_RPC_URL ?? process.env.NEXT_PUBLIC_FUJI_RPC_URL;
  const gameItemAddress = process.env.NEXT_PUBLIC_GAME_ITEM_ADDRESS;
  if (!signerKey || !isHex(signerKey) || signerKey.length !== 66 || !distributorAddress || !isAddress(distributorAddress) || !gameItemAddress || !isAddress(gameItemAddress) || !rpcUrl) {
    return error('Reward service is not configured', 503);
  }

  attempt.status = 'verifying';
  try {
    const distributor = getAddress(distributorAddress);
    const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(rpcUrl) });
    const nonce = await publicClient.readContract({
      address: distributor,
      abi: rewardDistributorAbi,
      functionName: 'nonces',
      args: [normalizedPlayer],
    });
    const itemNonce = await publicClient.readContract({ address: getAddress(gameItemAddress), abi: gameItemAbi, functionName: 'nonces', args: [normalizedPlayer] });
    const claim = {
      claimId: `0x${randomBytes(32).toString('hex')}` as Hex,
      attemptId: result.attemptId as Hex,
      player: normalizedPlayer,
      tokenAmount: rewards[result.stageId],
      nonce,
      deadline: BigInt(Math.floor(Date.now() / 1_000) + 15 * 60),
    };
    const signer = privateKeyToAccount(signerKey as Hex);
    const signature = await signer.signTypedData({
      domain: {
        name: 'Avalanche Quest Rewards',
        version: '1',
        chainId: avalancheFuji.id,
        verifyingContract: distributor,
      },
      types: {
        RewardClaim: [
          { name: 'claimId', type: 'bytes32' },
          { name: 'attemptId', type: 'bytes32' },
          { name: 'player', type: 'address' },
          { name: 'tokenAmount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint64' },
        ],
      },
      primaryType: 'RewardClaim',
      message: claim,
    });
    const dropChancePerTenThousand = 250 + stages[result.stageId].number * 25;
    const rolledLoot = randomInt(10_000) < dropChancePerTenThousand ? rollLoot(result.stageId) : null;
    let authorizedLoot = null;
    if (rolledLoot) {
      const image = renderLootImage(rolledLoot, stages[result.stageId].accentColor);
      const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify({
        name: rolledLoot.name, description: `${rolledLoot.rarityName} boss drop from ${stages[result.stageId].name}.`,
        image,
        attributes: [{ trait_type: 'Type', value: rolledLoot.typeName }, { trait_type: 'Rarity', value: rolledLoot.rarityName }, { trait_type: 'Power', value: rolledLoot.power }, { trait_type: 'Stage', value: stages[result.stageId].number }],
      })).toString('base64')}`;
      const itemClaim = {
        claimId: `0x${randomBytes(32).toString('hex')}` as Hex, attemptId: result.attemptId as Hex,
        player: normalizedPlayer, itemType: rolledLoot.itemType, rarity: rolledLoot.rarity, power: rolledLoot.power,
        metadataHash: keccak256(toBytes(metadataURI)), nonce: itemNonce,
        deadline: BigInt(Math.floor(Date.now() / 1_000) + 15 * 60),
      };
      const itemSignature = await signer.signTypedData({
        domain: { name: 'Avalanche Quest Items', version: '1', chainId: avalancheFuji.id, verifyingContract: getAddress(gameItemAddress) },
        types: { MintClaim: [
          { name: 'claimId', type: 'bytes32' }, { name: 'attemptId', type: 'bytes32' }, { name: 'player', type: 'address' },
          { name: 'itemType', type: 'uint8' }, { name: 'rarity', type: 'uint8' }, { name: 'power', type: 'uint32' },
          { name: 'metadataHash', type: 'bytes32' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint64' },
        ] }, primaryType: 'MintClaim', message: itemClaim,
      });
      authorizedLoot = { claim: { ...itemClaim, nonce: itemClaim.nonce.toString(), deadline: itemClaim.deadline.toString() }, metadataURI, signature: itemSignature, name: rolledLoot.name, rarityName: rolledLoot.rarityName, typeName: rolledLoot.typeName };
    }
    let assetTycoon = null;
    const licenseAddressValue = process.env.NEXT_PUBLIC_ASSET_TYCOON_LICENSE_ADDRESS;
    const extremeStage = stages[result.stageId].number >= 27;
    if (extremeStage && licenseAddressValue && isAddress(licenseAddressValue) && randomInt(10_000) < 100) {
      const licenseAddress = getAddress(licenseAddressValue);
      const licenseNonce = await publicClient.readContract({ address: licenseAddress, abi: assetTycoonLicenseAbi, functionName: 'nonces', args: [normalizedPlayer] });
      const licenseClaim = {
        claimId: `0x${randomBytes(32).toString('hex')}` as Hex,
        attemptId: result.attemptId as Hex,
        player: normalizedPlayer,
        nonce: licenseNonce,
        deadline: BigInt(Math.floor(Date.now() / 1_000) + 15 * 60),
      };
      const licenseSignature = await signer.signTypedData({
        domain: { name: 'Avalanche Quest Asset Tycoon', version: '1', chainId: avalancheFuji.id, verifyingContract: licenseAddress },
        types: { MintClaim: [
          { name: 'claimId', type: 'bytes32' }, { name: 'attemptId', type: 'bytes32' }, { name: 'player', type: 'address' },
          { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint64' },
        ] },
        primaryType: 'MintClaim',
        message: licenseClaim,
      });
      assetTycoon = {
        claim: { ...licenseClaim, nonce: licenseClaim.nonce.toString(), deadline: licenseClaim.deadline.toString() },
        signature: licenseSignature,
      };
    }
    attempt.status = 'verified';
    return NextResponse.json({
      claim: {
        ...claim,
        tokenAmount: claim.tokenAmount.toString(),
        nonce: claim.nonce.toString(),
        deadline: claim.deadline.toString(),
      },
      signature,
      loot: authorizedLoot,
      assetTycoon,
    });
  } catch {
    attempt.status = 'started';
    return error('Could not authorize reward', 502);
  }
}

function rollLoot(stageId: StageId) {
  const stage = stages[stageId];
  const roll = randomInt(100);
  const rarity = roll < Math.min(8 + stage.number * 2, 25) ? 3 : roll < 35 + stage.number * 2 ? 2 : roll < 78 ? 1 : 0;
  const rarityNames = ['Common', 'Rare', 'Epic', 'Legendary'] as const;
  const itemType = randomInt(2);
  const typeNames = ['Weapon', 'Armor'] as const;
  const prefixes = ['Rugged', 'Runed', 'Mythic', 'Sovereign'] as const;
  const suffixes = ['Blade', 'Aegis'] as const;
  return {
    itemType, rarity, power: 8 + stage.number * 4 + rarity * 7 + randomInt(8),
    rarityName: rarityNames[rarity] ?? 'Common', typeName: typeNames[itemType] ?? 'Weapon',
    name: `${prefixes[rarity] ?? 'Rugged'} ${stage.worldLabel.split(' ')[0]} ${suffixes[itemType] ?? 'Relic'}`,
  };
}

function renderLootImage(loot: ReturnType<typeof rollLoot>, stageAccent: number): string {
  const rarityColors = ['#a9b0ad', '#58b8ff', '#bd79ff', '#ffd45e'] as const;
  const rarityColor = rarityColors[loot.rarity] ?? rarityColors[0];
  const accent = `#${stageAccent.toString(16).padStart(6, '0')}`;
  const art = loot.itemType === 0
    ? `<g transform="translate(256 235) rotate(-42)"><rect x="-24" y="-145" width="48" height="230" rx="20" fill="url(#metal)"/><path d="M-24-145L0-205L24-145Z" fill="#f8fbff"/><rect x="-92" y="72" width="184" height="30" rx="12" fill="${rarityColor}"/><rect x="-17" y="92" width="34" height="92" rx="14" fill="#5b3827"/></g>`
    : loot.itemType === 1
      ? `<path d="M256 92L390 142V252C390 344 332 405 256 437C180 405 122 344 122 252V142Z" fill="url(#metal)" stroke="${rarityColor}" stroke-width="18"/><path d="M256 137V387C315 355 347 311 347 249V172Z" fill="${accent}" opacity=".55"/><path d="M190 245H322M256 179V319" stroke="#f5fbff" stroke-width="24" stroke-linecap="round"/>`
      : `<circle cx="256" cy="256" r="134" fill="url(#orb)" stroke="${rarityColor}" stroke-width="18"/><path d="M256 137L285 220L374 223L303 276L327 363L256 313L185 363L209 276L138 223L227 220Z" fill="#fff" opacity=".9"/><circle cx="256" cy="256" r="188" fill="none" stroke="${accent}" stroke-width="8" stroke-dasharray="28 20"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><radialGradient id="bg"><stop stop-color="${accent}" stop-opacity=".42"/><stop offset="1" stop-color="#080d12"/></radialGradient><linearGradient id="metal" x1="0" x2="1"><stop stop-color="#f1f6f8"/><stop offset=".45" stop-color="${rarityColor}"/><stop offset="1" stop-color="#50606d"/></linearGradient><radialGradient id="orb"><stop stop-color="#fff"/><stop offset=".28" stop-color="${accent}"/><stop offset="1" stop-color="#251942"/></radialGradient></defs><rect width="512" height="512" rx="54" fill="url(#bg)"/><rect x="22" y="22" width="468" height="468" rx="42" fill="none" stroke="${rarityColor}" stroke-width="8" opacity=".85"/>${art}<text x="256" y="478" fill="${rarityColor}" text-anchor="middle" font-family="monospace" font-size="22" font-weight="700" letter-spacing="4">${loot.rarityName.toUpperCase()}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function isStageResult(value: unknown): value is StageResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StageResult>;
  return typeof candidate.attemptId === 'string'
    && isHex(candidate.attemptId, { strict: true })
    && typeof candidate.stageId === 'string'
    && isStageId(candidate.stageId)
    && typeof candidate.durationMs === 'number'
    && Array.isArray(candidate.events);
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
