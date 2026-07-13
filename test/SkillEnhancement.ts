import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { parseEther } from 'viem';

const { viem, networkHelpers } = await network.create();

async function deploySkillEnhancement() {
  const [admin] = await viem.getWalletClients();
  if (!admin) throw new Error('Hardhat test accounts are unavailable');

  const enhancement = await viem.deployContract('SkillEnhancement', [
    admin.account.address,
    admin.account.address,
    admin.account.address,
  ]);

  return { enhancement };
}

describe('SkillEnhancement', () => {
  it('doubles the AQT enhancement cost after every level', async () => {
    const { enhancement } = await networkHelpers.loadFixture(deploySkillEnhancement);
    const expectedPrices = ['20', '40', '80', '160', '320', '640', '1280'];

    for (const [level, price] of expectedPrices.entries()) {
      assert.equal(await enhancement.read.priceFor([level]), parseEther(price));
    }

    assert.equal(await enhancement.read.priceFor([7]), 0n);
  });
});
