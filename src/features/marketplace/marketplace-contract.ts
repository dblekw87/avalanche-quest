export const marketplaceAbi = [
  { type: 'function', name: 'createListing', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'price', type: 'uint256' }], outputs: [{ name: 'listingId', type: 'uint256' }] },
  { type: 'function', name: 'buy', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'cancel', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'nextListingId', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'listings', stateMutability: 'view', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [{ name: 'seller', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'price', type: 'uint256' }, { name: 'active', type: 'bool' }] },
] as const;

export type ItemMetadata = { name: string; description?: string; image?: string; attributes?: readonly { trait_type: string; value: string | number }[] };

export function decodeMetadata(uri: string): ItemMetadata {
  const prefix = 'data:application/json;base64,';
  if (!uri.startsWith(prefix)) return { name: 'Unknown Quest Item' };
  try { return JSON.parse(atob(uri.slice(prefix.length))) as ItemMetadata; } catch { return { name: 'Unknown Quest Item' }; }
}
