import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { keccak256, parseEther, toBytes, type Hex } from 'viem';

const { viem, networkHelpers } = await network.create();

async function deployItems() {
  const [admin, signer, seller, buyer] = await viem.getWalletClients();
  if (!admin || !signer || !seller || !buyer) throw new Error('Hardhat test accounts are unavailable');
  const token = await viem.deployContract('GameToken', ['Avalanche Quest Token', 'AQT', parseEther('1000000'), admin.account.address]);
  const item = await viem.deployContract('GameItem', [admin.account.address, signer.account.address]);
  const market = await viem.deployContract('ItemMarketplace', [token.address, item.address]);
  const minterRole = await token.read.MINTER_ROLE(); await token.write.grantRole([minterRole, admin.account.address], { account: admin.account });
  await token.write.mint([buyer.account.address, parseEther('100')], { account: admin.account });
  return { admin, signer, seller, buyer, token, item, market };
}

async function mintDrop(
  fixture: Awaited<ReturnType<typeof deployItems>>,
  overrides: Partial<{ itemType: number; rarity: number; power: number }> = {},
) {
  const uri = `data:application/json;base64,${Buffer.from('{"name":"Mythic Blade"}').toString('base64')}`;
  const claim = { claimId: `0x${'11'.repeat(32)}` as Hex, attemptId: `0x${'22'.repeat(32)}` as Hex, player: fixture.seller.account.address, itemType: overrides.itemType ?? 0, rarity: overrides.rarity ?? 2, power: overrides.power ?? 42, metadataHash: keccak256(toBytes(uri)), nonce: 0n, deadline: BigInt(Math.floor(Date.now() / 1000) + 3600) };
  const chainId = await (await viem.getPublicClient()).getChainId();
  const signature = await fixture.signer.signTypedData({ account: fixture.signer.account, domain: { name: 'Avalanche Quest Items', version: '1', chainId, verifyingContract: fixture.item.address }, primaryType: 'MintClaim', types: { MintClaim: [
    { name: 'claimId', type: 'bytes32' }, { name: 'attemptId', type: 'bytes32' }, { name: 'player', type: 'address' }, { name: 'itemType', type: 'uint8' }, { name: 'rarity', type: 'uint8' }, { name: 'power', type: 'uint32' }, { name: 'metadataHash', type: 'bytes32' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint64' },
  ] }, message: claim });
  await fixture.item.write.mintItem([claim, uri, signature], { account: fixture.seller.account });
  return { uri, claim };
}

describe('GameItem and ItemMarketplace', () => {
  it('mints one server-authorized boss drop per attempt', async () => {
    const fixture = await networkHelpers.loadFixture(deployItems); const { uri } = await mintDrop(fixture);
    assert.equal((await fixture.item.read.ownerOf([1n])).toLowerCase(), fixture.seller.account.address.toLowerCase());
    assert.equal(await fixture.item.read.tokenURI([1n]), uri);
    assert.equal(await fixture.item.read.powers([1n]), 42);
  });

  it('escrows an NFT and atomically exchanges it for AQT', async () => {
    const fixture = await networkHelpers.loadFixture(deployItems); await mintDrop(fixture); const price = parseEther('30');
    await fixture.item.write.setApprovalForAll([fixture.market.address, true], { account: fixture.seller.account });
    await fixture.market.write.createListing([1n, price], { account: fixture.seller.account });
    await fixture.token.write.approve([fixture.market.address, price], { account: fixture.buyer.account });
    await fixture.market.write.buy([1n], { account: fixture.buyer.account });
    assert.equal((await fixture.item.read.ownerOf([1n])).toLowerCase(), fixture.buyer.account.address.toLowerCase());
    assert.equal(await fixture.token.read.balanceOf([fixture.seller.account.address]), price);
  });

  it('rejects unsupported item types, rarities, and power values', async () => {
    const fixture = await networkHelpers.loadFixture(deployItems);
    await assert.rejects(() => mintDrop(fixture, { itemType: 3 }), /InvalidItemType/);
    await assert.rejects(() => mintDrop(fixture, { rarity: 4 }), /InvalidRarity/);
    await assert.rejects(() => mintDrop(fixture, { power: 0 }), /InvalidPower/);
    await assert.rejects(() => mintDrop(fixture, { power: 10_001 }), /InvalidPower/);
  });
});
