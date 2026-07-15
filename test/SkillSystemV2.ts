import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { keccak256, parseEther, toBytes } from 'viem';

const { viem, networkHelpers } = await network.create();
const starterSkillId = keccak256(toBytes('magic-missile'));
const purchasedSkillId = keccak256(toBytes('ice-storm'));

async function deploySkillSystemV2() {
  const [admin, player] = await viem.getWalletClients();
  if (!admin || !player) throw new Error('Hardhat test accounts are unavailable');
  const token = await viem.deployContract('GameToken', ['Avalanche Quest Token', 'AQT', parseEther('1000000'), admin.account.address]);
  const legacyShop = await viem.deployContract('SkillShop', [token.address, admin.account.address]);
  const legacyEnhancement = await viem.deployContract('SkillEnhancement', [token.address, legacyShop.address, admin.account.address]);
  const legacyArmor = await viem.deployContract('ArmorEnhancement', [token.address, legacyShop.address, admin.account.address]);
  const shop = await viem.deployContract('SkillShopV2', [token.address, legacyShop.address, admin.account.address]);
  const enhancement = await viem.deployContract('SkillEnhancementV2', [token.address, shop.address, legacyEnhancement.address, admin.account.address]);

  await shop.write.setStarterSkill([starterSkillId, true], { account: admin.account });
  await legacyShop.write.setSkillPrice([purchasedSkillId, parseEther('35')], { account: admin.account });
  const minterRole = await token.read.MINTER_ROLE();
  await token.write.grantRole([minterRole, admin.account.address], { account: admin.account });
  await token.write.mint([player.account.address, parseEther('10000')], { account: admin.account });
  return { admin, player, token, legacyShop, legacyEnhancement, legacyArmor, shop, enhancement };
}

describe('SkillSystemV2', () => {
  it('treats starter Q skills as owned without charging the player', async () => {
    const { player, shop } = await networkHelpers.loadFixture(deploySkillSystemV2);
    assert.equal(await shop.read.hasSkill([player.account.address, starterSkillId]), true);
    await viem.assertions.revertWithCustomError(
      shop.write.purchaseSkill([starterSkillId], { account: player.account }),
      shop,
      'InvalidSkill',
    );
  });

  it('preserves legacy purchases and permits enhancement from level 5 to 6', async () => {
    const { player, token, legacyShop, legacyEnhancement, shop, enhancement } = await networkHelpers.loadFixture(deploySkillSystemV2);
    await token.write.approve([legacyShop.address, parseEther('35')], { account: player.account });
    await legacyShop.write.purchaseSkill([purchasedSkillId], { account: player.account });
    await token.write.approve([legacyEnhancement.address, parseEther('10000')], { account: player.account });
    for (let level = 0; level < 5; level += 1) {
      await legacyEnhancement.write.enhanceSkill([purchasedSkillId], { account: player.account });
    }

    assert.equal(await shop.read.hasSkill([player.account.address, purchasedSkillId]), true);
    assert.equal(await enhancement.read.levels([player.account.address, purchasedSkillId]), 5);
    await token.write.approve([enhancement.address, await enhancement.read.priceFor([5])], { account: player.account });
    await enhancement.write.enhanceSkill([purchasedSkillId], { account: player.account });
    assert.equal(await enhancement.read.levels([player.account.address, purchasedSkillId]), 6);
  });
});
