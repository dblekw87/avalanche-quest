export const rewardDistributorAbi = [
  {
    type: 'function',
    name: 'claimReward',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'claim',
        type: 'tuple',
        components: [
          { name: 'claimId', type: 'bytes32' },
          { name: 'attemptId', type: 'bytes32' },
          { name: 'player', type: 'address' },
          { name: 'tokenAmount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint64' },
        ],
      },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
