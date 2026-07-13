import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { parseEther, type Address, type Hex } from 'viem';

const { viem, networkHelpers } = await network.create();

type RewardClaim = {
  claimId: Hex;
  attemptId: Hex;
  player: Address;
  tokenAmount: bigint;
  nonce: bigint;
  deadline: bigint;
};

const rewardTypes = {
  RewardClaim: [
    { name: 'claimId', type: 'bytes32' },
    { name: 'attemptId', type: 'bytes32' },
    { name: 'player', type: 'address' },
    { name: 'tokenAmount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint64' },
  ],
} as const;

async function deployRewardSystem() {
  const [admin, rewardSigner, player, stranger, pauser] = await viem.getWalletClients();
  if (!admin || !rewardSigner || !player || !stranger || !pauser) {
    throw new Error('Hardhat test accounts are unavailable');
  }

  const token = await viem.deployContract('GameToken', [
    'Avalanche Quest Token',
    'AQT',
    parseEther('1000000'),
    admin.account.address,
  ]);
  const distributor = await viem.deployContract('RewardDistributor', [
    token.address,
    admin.account.address,
    pauser.account.address,
    rewardSigner.account.address,
  ]);
  const minterRole = await token.read.MINTER_ROLE();
  await token.write.grantRole([minterRole, distributor.address], {
    account: admin.account,
  });

  return { admin, rewardSigner, player, stranger, pauser, token, distributor };
}

async function buildClaim(
  player: Address,
  overrides: Partial<RewardClaim> = {},
): Promise<RewardClaim> {
  const block = await (await viem.getPublicClient()).getBlock();
  return {
    claimId: `0x${'11'.repeat(32)}`,
    attemptId: `0x${'22'.repeat(32)}`,
    player,
    tokenAmount: parseEther('25'),
    nonce: 0n,
    deadline: block.timestamp + 3_600n,
    ...overrides,
  };
}

async function signClaim(
  signer: Awaited<ReturnType<typeof viem.getWalletClients>>[number],
  distributor: Address,
  claim: RewardClaim,
) {
  const chainId = await (await viem.getPublicClient()).getChainId();
  return signer.signTypedData({
    account: signer.account,
    domain: {
      name: 'Avalanche Quest Rewards',
      version: '1',
      chainId,
      verifyingContract: distributor,
    },
    primaryType: 'RewardClaim',
    types: rewardTypes,
    message: claim,
  });
}

describe('GameToken', () => {
  it('allows only an authorized minter and enforces the cap', async () => {
    const { admin, stranger, token } = await networkHelpers.loadFixture(deployRewardSystem);
    const minterRole = await token.read.MINTER_ROLE();

    await viem.assertions.revertWithCustomError(
      token.write.mint([stranger.account.address, 1n], { account: stranger.account }),
      token,
      'AccessControlUnauthorizedAccount',
    );

    await token.write.grantRole([minterRole, admin.account.address], { account: admin.account });
    await viem.assertions.revertWithCustomError(
      token.write.mint([admin.account.address, parseEther('1000001')], { account: admin.account }),
      token,
      'ERC20ExceededCap',
    );
  });
});

describe('RewardDistributor', () => {
  it('mints a valid server-signed reward exactly once', async () => {
    const { rewardSigner, player, token, distributor } =
      await networkHelpers.loadFixture(deployRewardSystem);
    const claim = await buildClaim(player.account.address);
    const signature = await signClaim(rewardSigner, distributor.address, claim);

    await viem.assertions.emitWithArgs(
      distributor.write.claimReward([claim, signature], { account: player.account }),
      distributor,
      'RewardClaimed',
      [claim.claimId, claim.attemptId, claim.player, claim.tokenAmount, 0n],
    );
    assert.equal(await token.read.balanceOf([player.account.address]), claim.tokenAmount);
    assert.equal(await distributor.read.nonces([player.account.address]), 1n);

    await viem.assertions.revertWithCustomError(
      distributor.write.claimReward([claim, signature], { account: player.account }),
      distributor,
      'ClaimAlreadyUsed',
    );
  });

  it('rejects a modified reward amount and a different caller', async () => {
    const { rewardSigner, player, stranger, distributor } =
      await networkHelpers.loadFixture(deployRewardSystem);
    const claim = await buildClaim(player.account.address);
    const signature = await signClaim(rewardSigner, distributor.address, claim);
    const modifiedClaim = { ...claim, tokenAmount: claim.tokenAmount * 10n };

    await viem.assertions.revertWithCustomError(
      distributor.write.claimReward([modifiedClaim, signature], { account: player.account }),
      distributor,
      'UnauthorizedSigner',
    );
    await viem.assertions.revertWithCustomError(
      distributor.write.claimReward([claim, signature], { account: stranger.account }),
      distributor,
      'InvalidPlayer',
    );
  });

  it('rejects expired claims, reused attempts, and invalid nonces', async () => {
    const { rewardSigner, player, distributor } =
      await networkHelpers.loadFixture(deployRewardSystem);
    const block = await (await viem.getPublicClient()).getBlock();
    const expired = await buildClaim(player.account.address, { deadline: block.timestamp - 1n });
    const expiredSignature = await signClaim(rewardSigner, distributor.address, expired);
    await viem.assertions.revertWithCustomError(
      distributor.write.claimReward([expired, expiredSignature], { account: player.account }),
      distributor,
      'ClaimExpired',
    );

    const first = await buildClaim(player.account.address);
    await distributor.write.claimReward(
      [first, await signClaim(rewardSigner, distributor.address, first)],
      { account: player.account },
    );
    const reusedAttempt = await buildClaim(player.account.address, {
      claimId: `0x${'33'.repeat(32)}`,
      nonce: 1n,
    });
    await viem.assertions.revertWithCustomError(
      distributor.write.claimReward(
        [reusedAttempt, await signClaim(rewardSigner, distributor.address, reusedAttempt)],
        { account: player.account },
      ),
      distributor,
      'AttemptAlreadyRewarded',
    );

    const invalidNonce = await buildClaim(player.account.address, {
      claimId: `0x${'44'.repeat(32)}`,
      attemptId: `0x${'55'.repeat(32)}`,
      nonce: 9n,
    });
    await viem.assertions.revertWithCustomError(
      distributor.write.claimReward(
        [invalidNonce, await signClaim(rewardSigner, distributor.address, invalidNonce)],
        { account: player.account },
      ),
      distributor,
      'InvalidNonce',
    );
  });

  it('blocks claims while paused', async () => {
    const { rewardSigner, player, pauser, distributor } =
      await networkHelpers.loadFixture(deployRewardSystem);
    const claim = await buildClaim(player.account.address);
    const signature = await signClaim(rewardSigner, distributor.address, claim);
    await distributor.write.pause({ account: pauser.account });

    await viem.assertions.revertWithCustomError(
      distributor.write.claimReward([claim, signature], { account: player.account }),
      distributor,
      'EnforcedPause',
    );
  });
});
