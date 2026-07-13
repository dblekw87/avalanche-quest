import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { parseEther } from 'viem';

const { viem, networkHelpers } = await network.create();

async function deployCharacterUpgrades() {
  const [admin, player] = await viem.getWalletClients();
  if (!admin || !player) throw new Error('Hardhat test accounts are unavailable');

  const token = await viem.deployContract('GameToken', [
    'Avalanche Quest Token',
    'AQT',
    parseEther('1000000'),
    admin.account.address,
  ]);
  const upgrade = await viem.deployContract('CharacterUpgrade', [token.address, admin.account.address]);
  const upgradeV2 = await viem.deployContract('CharacterUpgradeV2', [token.address, admin.account.address]);
  const minterRole = await token.read.MINTER_ROLE();
  await token.write.grantRole([minterRole, admin.account.address], { account: admin.account });
  const upgradeV3 = await viem.deployContract('CharacterUpgradeV3', [
    token.address,
    upgradeV2.address,
    admin.account.address,
  ]);
  await token.write.mint([player.account.address, parseEther('30000')], { account: admin.account });
  await token.write.approve([upgrade.address, parseEther('30000')], { account: player.account });
  await token.write.approve([upgradeV2.address, parseEther('30000')], { account: player.account });
  await token.write.approve([upgradeV3.address, parseEther('30000')], { account: player.account });
  return { player, upgrade, upgradeV2, upgradeV3 };
}

describe('Character upgrades', () => {
  it('keeps the legacy contracts at their deployed maximum levels', async () => {
    const { upgrade, upgradeV2 } = await networkHelpers.loadFixture(deployCharacterUpgrades);

    assert.equal(await upgrade.read.MAX_LEVEL(), 20);
    assert.equal(await upgradeV2.read.MAX_LEVEL(), 5);
    assert.equal(await upgrade.read.priceFor([0, 19]), parseEther('315'));
    assert.equal(await upgrade.read.priceFor([1, 19]), parseEther('310'));
    assert.equal(await upgrade.read.priceFor([2, 19]), parseEther('320'));
    assert.equal(await upgrade.read.priceFor([0, 20]), 0n);
    assert.equal(await upgradeV2.read.priceFor([0, 5]), 0n);
  });

  it('increases V3 prices by 1.2x at every level', async () => {
    const { upgradeV3 } = await networkHelpers.loadFixture(deployCharacterUpgrades);

    assert.equal(await upgradeV3.read.priceFor([0, 0]), parseEther('30'));
    assert.equal(await upgradeV3.read.priceFor([0, 1]), parseEther('36'));
    assert.equal(await upgradeV3.read.priceFor([0, 5]), parseEther('74.6496'));
    assert.equal(await upgradeV3.read.priceFor([1, 5]), parseEther('62.208'));
    assert.equal(await upgradeV3.read.priceFor([2, 5]), parseEther('87.0912'));
    assert.equal(await upgradeV3.read.priceFor([0, 20]), 0n);
  });

  it('carries V2 levels forward and allows all three cards to reach level 20', async () => {
    const { player, upgradeV2, upgradeV3 } = await networkHelpers.loadFixture(deployCharacterUpgrades);

    for (const upgradeType of [0, 1, 2] as const) {
      for (let level = 0; level < 5; level += 1) {
        await upgradeV2.write.purchaseUpgrade([upgradeType], { account: player.account });
      }
      assert.equal(await upgradeV3.read.levels([player.account.address, upgradeType]), 5);

      for (let level = 5; level < 20; level += 1) {
        await upgradeV3.write.purchaseUpgrade([upgradeType], { account: player.account });
      }
      assert.equal(await upgradeV3.read.levels([player.account.address, upgradeType]), 20);
      await viem.assertions.revertWithCustomError(
        upgradeV3.write.purchaseUpgrade([upgradeType], { account: player.account }),
        upgradeV3,
        'MaxLevelReached',
      );
    }
  });
});
