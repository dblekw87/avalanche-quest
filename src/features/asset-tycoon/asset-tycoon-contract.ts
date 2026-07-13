export const assetTycoonLicenseAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'tokenOfOwnerByIndex', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'isApprovedForAll', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'setApprovalForAll', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  {
    type: 'function', name: 'mint', stateMutability: 'nonpayable',
    inputs: [
      { name: 'claim', type: 'tuple', components: [
        { name: 'claimId', type: 'bytes32' }, { name: 'attemptId', type: 'bytes32' }, { name: 'player', type: 'address' },
        { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint64' },
      ] },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
] as const;

export const assetTycoonMarketplaceAbi = [
  { type: 'function', name: 'createListing', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'price', type: 'uint256' }], outputs: [{ name: 'listingId', type: 'uint256' }] },
  { type: 'function', name: 'buy', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'cancel', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'nextListingId', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'listings', stateMutability: 'view', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [{ name: 'seller', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'price', type: 'uint256' }, { name: 'active', type: 'bool' }] },
] as const;
