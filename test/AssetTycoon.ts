import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { parseEther, type Hex } from 'viem';

const { viem, networkHelpers } = await network.create();

async function deployAssetTycoon() {
  const [admin, signer, seller, buyer] = await viem.getWalletClients();
  if (!admin || !signer || !seller || !buyer) throw new Error('Hardhat test accounts are unavailable');
  const token = await viem.deployContract('GameToken', ['Avalanche Quest Token', 'AQT', parseEther('1000000'), admin.account.address]);
  const license = await viem.deployContract('AssetTycoonLicense', [admin.account.address, signer.account.address]);
  const market = await viem.deployContract('AssetTycoonMarketplace', [token.address, license.address]);
  const minterRole = await token.read.MINTER_ROLE();
  await token.write.grantRole([minterRole, admin.account.address], { account: admin.account });
  await token.write.mint([buyer.account.address, parseEther('5000')], { account: admin.account });
  return { signer, seller, buyer, token, license, market };
}

async function mintLicense(fixture: Awaited<ReturnType<typeof deployAssetTycoon>>) {
  const block = await (await viem.getPublicClient()).getBlock();
  const claim = {
    claimId: `0x${'91'.repeat(32)}` as Hex,
    attemptId: `0x${'92'.repeat(32)}` as Hex,
    player: fixture.seller.account.address,
    nonce: 0n,
    deadline: block.timestamp + 3_600n,
  };
  const chainId = await (await viem.getPublicClient()).getChainId();
  const signature = await fixture.signer.signTypedData({
    account: fixture.signer.account,
    domain: { name: 'Avalanche Quest Asset Tycoon', version: '1', chainId, verifyingContract: fixture.license.address },
    primaryType: 'MintClaim',
    types: { MintClaim: [
      { name: 'claimId', type: 'bytes32' }, { name: 'attemptId', type: 'bytes32' }, { name: 'player', type: 'address' },
      { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint64' },
    ] },
    message: claim,
  });
  await fixture.license.write.mint([claim, signature], { account: fixture.seller.account });
  return claim;
}

describe('AssetTycoonLicense and marketplace', () => {
  it('mints only the server-authorized wallet and blocks attempt reuse', async () => {
    const fixture = await networkHelpers.loadFixture(deployAssetTycoon);
    const claim = await mintLicense(fixture);
    assert.equal(await fixture.license.read.balanceOf([fixture.seller.account.address]), 1n);
    await viem.assertions.revertWithCustomError(
      fixture.license.write.mint([claim, `0x${'00'.repeat(65)}`], { account: fixture.seller.account }),
      fixture.license,
      'InvalidNonce',
    );
  });

  it('removes seller access in escrow and transfers it to the AQT buyer', async () => {
    const fixture = await networkHelpers.loadFixture(deployAssetTycoon);
    await mintLicense(fixture);
    const price = parseEther('1000');
    await fixture.license.write.setApprovalForAll([fixture.market.address, true], { account: fixture.seller.account });
    await fixture.market.write.createListing([1n, price], { account: fixture.seller.account });
    assert.equal(await fixture.license.read.balanceOf([fixture.seller.account.address]), 0n);
    assert.equal((await fixture.license.read.ownerOf([1n])).toLowerCase(), fixture.market.address.toLowerCase());
    await fixture.token.write.approve([fixture.market.address, price], { account: fixture.buyer.account });
    await fixture.market.write.buy([1n], { account: fixture.buyer.account });
    assert.equal(await fixture.license.read.balanceOf([fixture.buyer.account.address]), 1n);
    assert.equal(await fixture.token.read.balanceOf([fixture.seller.account.address]), price);
  });
});
