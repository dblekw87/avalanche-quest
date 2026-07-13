import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { keccak256, parseEther, toBytes } from 'viem';

const { viem, networkHelpers } = await network.create();
const skillId = keccak256(toBytes('arcane-bolt'));
const skillPrice = parseEther('25');

async function deploySkillShop() {
  const [admin, player] = await viem.getWalletClients();
  if (!admin || !player) throw new Error('Hardhat test accounts are unavailable');

  const token = await viem.deployContract('GameToken', [
    'Avalanche Quest Token', 'AQT', parseEther('1000000'), admin.account.address,
  ]);
  const shop = await viem.deployContract('SkillShop', [token.address, admin.account.address]);
  const minterRole = await token.read.MINTER_ROLE();
  await token.write.grantRole([minterRole, admin.account.address], { account: admin.account });
  await token.write.mint([player.account.address, parseEther('100')], { account: admin.account });
  await shop.write.setSkillPrice([skillId, skillPrice], { account: admin.account });
  return { admin, player, token, shop };
}

describe('SkillShop', () => {
  it('charges the configured AQT price and records permanent ownership', async () => {
    const { player, token, shop } = await networkHelpers.loadFixture(deploySkillShop);
    await token.write.approve([shop.address, skillPrice], { account: player.account });
    await shop.write.purchaseSkill([skillId], { account: player.account });

    assert.equal(await shop.read.hasSkill([player.account.address, skillId]), true);
    assert.equal(await token.read.balanceOf([player.account.address]), parseEther('75'));
    assert.equal(await token.read.balanceOf([shop.address]), skillPrice);
  });

  it('rejects duplicate purchases and purchases without token approval', async () => {
    const { player, token, shop } = await networkHelpers.loadFixture(deploySkillShop);
    await viem.assertions.revertWithCustomError(
      shop.write.purchaseSkill([skillId], { account: player.account }),
      token,
      'ERC20InsufficientAllowance',
    );

    await token.write.approve([shop.address, skillPrice], { account: player.account });
    await shop.write.purchaseSkill([skillId], { account: player.account });
    await viem.assertions.revertWithCustomError(
      shop.write.purchaseSkill([skillId], { account: player.account }),
      shop,
      'SkillAlreadyOwned',
    );
  });
});
