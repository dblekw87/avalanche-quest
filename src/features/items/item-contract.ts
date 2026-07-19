export const gameItemAbi = [
  {
    type: 'function', name: 'mintItem', stateMutability: 'nonpayable',
    inputs: [
      { name: 'claim', type: 'tuple', components: [
        { name: 'claimId', type: 'bytes32' }, { name: 'attemptId', type: 'bytes32' },
        { name: 'player', type: 'address' }, { name: 'itemType', type: 'uint8' },
        { name: 'rarity', type: 'uint8' }, { name: 'power', type: 'uint32' },
        { name: 'metadataHash', type: 'bytes32' }, { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint64' },
      ] },
      { name: 'metadataURI', type: 'string' }, { name: 'signature', type: 'bytes' },
    ], outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'tokenOfOwnerByIndex', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'itemTypes', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'rarities', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'powers', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'uint32' }] },
  { type: 'function', name: 'setApprovalForAll', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
] as const;
