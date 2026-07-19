# Avalanche Quest Smart-Contract Specification

> 이 문서는 현재 MVP 계약 기준선이다. 장비 V2, 클래스 NFT, 전직,
> 진행 재료와 다중 컬렉션 마켓의 구현 전 설계는
> [`docs/nft-system/04-contract-architecture.md`](nft-system/04-contract-architecture.md)에
> 있으며 기존 비업그레이드 계약을 in-place로 변경하지 않는다.

## 1. Scope and Assumptions

The MVP deploys four non-upgradeable contracts to Avalanche Fuji C-Chain:

1. `GameToken`
2. `GameItem`
3. `RewardDistributor`
4. `Marketplace`

The contracts use OpenZeppelin Contracts and Solidity compiler settings selected
during project initialization. Exact dependency versions are pinned in the lock
file. No contract handles real-money assets, native AVAX payments, bridging, or
mainnet deployment.

## 2. Roles and Trust Model

| Role | Responsibility |
| --- | --- |
| Default admin | Grants and revokes operational roles |
| Token minter | Mints `GameToken`; assigned to `RewardDistributor` |
| Item minter | Mints `GameItem`; assigned to `RewardDistributor` |
| Reward signer | Off-chain key authorized by `RewardDistributor` |
| Pauser | Pauses reward claims or marketplace operations in an emergency |
| Player | Claims signed rewards and trades owned items |

The deployer is not automatically retained as an unrestricted minter. Deployment
scripts grant roles explicitly and document the final role graph.

For the MVP, admin and pauser may be controlled by separate test accounts where
practical. The reward signer must be separate from the browser wallet and should
not be the deployer key.

## 3. GameToken

### Purpose

A capped ERC-20 currency used for stage rewards and marketplace settlement.

### Inheritance and modules

- `ERC20`
- `ERC20Capped`
- `AccessControl`

`ERC20Burnable` is excluded from the MVP unless a product requirement introduces
a token sink.

### State and roles

```text
MINTER_ROLE
cap fixed at deployment
```

### Functions

```solidity
constructor(
    string memory name,
    string memory symbol,
    uint256 cap,
    address admin
)

function mint(address to, uint256 amount)
    external
    onlyRole(MINTER_ROLE)
```

### Requirements

- Reject the zero address.
- Reject minting that exceeds the immutable cap.
- Grant the default admin role to the configured admin, not implicitly to an
  arbitrary caller beyond deployment needs.
- After configuration, only `RewardDistributor` holds `MINTER_ROLE`.

## 4. GameItem

### Purpose

An ERC-721 collection representing equipment earned through verified rewards.

### Inheritance and modules

- `ERC721`
- `ERC721URIStorage` or a documented base-URI alternative
- `AccessControl`

The implementation chooses one metadata strategy before coding and does not mix
mutable per-token URIs with an unexplained base URI.

### Item data

The NFT stores only fields required for durable on-chain identity:

```text
tokenId
itemType
rarity
metadataHash
tokenURI or base-URI-derived metadata location
```

Large stats, descriptions, and images remain in metadata. If gameplay stats are
off-chain, the README must not imply that all item properties are immutable.

### Functions

```solidity
constructor(string memory name, string memory symbol, address admin)

function mintItem(
    address to,
    uint32 itemType,
    uint8 rarity,
    bytes32 metadataHash,
    string calldata tokenUri
) external onlyRole(MINTER_ROLE) returns (uint256 tokenId)
```

### Requirements

- Token IDs increase monotonically from a documented starting value.
- Reject the zero address and unsupported item/rarity definitions.
- Emit an item-specific event in addition to the ERC-721 `Transfer` event.
- Only `RewardDistributor` holds `MINTER_ROLE` after configuration.

## 5. RewardDistributor

### Purpose

Verify server-authorized EIP-712 reward claims and atomically mint the approved
ERC-20 reward and optional ERC-721 item.

### Inheritance and modules

- `EIP712`
- `AccessControl`
- `Pausable`
- `ReentrancyGuard`

### Claim structure

```solidity
struct RewardClaim {
    bytes32 claimId;
    bytes32 attemptId;
    address player;
    uint256 tokenAmount;
    uint32 itemType;
    uint8 itemRarity;
    bytes32 metadataHash;
    uint256 nonce;
    uint64 deadline;
}
```

If item metadata requires a URI, the claim either includes a hash of a
server-resolved URI or the contract derives the URI from the item definition.
The chosen representation must be covered by the signed EIP-712 hash.

### State

```text
authorized reward signer(s)
used claim IDs
used player nonces or next nonce per player
GameToken address
GameItem address
```

### Functions

```solidity
function claimReward(RewardClaim calldata claim, bytes calldata signature)
    external
    nonReentrant
    whenNotPaused

function setRewardSigner(address signer, bool allowed)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)

function pause() external onlyRole(PAUSER_ROLE)
function unpause() external onlyRole(PAUSER_ROLE)
```

### Validation order

1. Require `msg.sender == claim.player`.
2. Reject a zero player.
3. Reject an expired deadline.
4. Reject a used claim ID.
5. Validate the expected player nonce.
6. Rebuild the EIP-712 digest using the current chain ID and distributor address.
7. Recover and validate an authorized signer.
8. Mark the claim used and advance the nonce.
9. Mint the token reward.
10. Mint an item only when `itemType != 0`.
11. Emit `RewardClaimed` with claim, attempt, player, amount, and item token ID.

State is consumed before external mint calls. A revert in either mint rolls back
the entire transaction, preserving atomicity.

### Replay protection

Replay is prevented by all of the following:

- EIP-712 domain binds the signature to chain ID and distributor address.
- `claimId` is consumed once.
- a per-player nonce is consumed in order;
- the deadline limits signature lifetime;
- the server enforces one claim record per attempt.

Changing the recipient, reward amount, item definition, nonce, deadline, chain,
or contract must invalidate the signature.

## 6. Marketplace

### Purpose

Provide non-upgradeable, fixed-price escrow listings for `GameItem`, paid only in
`GameToken`.

### Inheritance and modules

- `ERC721Holder`
- `ReentrancyGuard`
- `Pausable`
- `AccessControl`
- `SafeERC20` usage for payment transfers

### Listing structure

```solidity
struct Listing {
    uint256 listingId;
    uint256 tokenId;
    address seller;
    uint256 price;
    ListingStatus status;
}
```

The NFT and payment-token addresses are immutable constructor parameters.

### Functions

```solidity
function createListing(uint256 tokenId, uint256 price)
    external
    nonReentrant
    whenNotPaused
    returns (uint256 listingId)

function cancelListing(uint256 listingId)
    external
    nonReentrant

function buy(uint256 listingId)
    external
    nonReentrant
    whenNotPaused

function getListing(uint256 listingId)
    external
    view
    returns (Listing memory)
```

### Listing flow

1. Require `price > 0`.
2. Require the caller owns the NFT and has approved the marketplace.
3. Create the listing and mark it active.
4. Transfer the NFT into marketplace escrow with `safeTransferFrom`.
5. Emit `ListingCreated`.

### Purchase flow

1. Require an active listing.
2. Reject seller self-purchase.
3. Mark the listing sold before external transfers.
4. Pull the exact game-token price from buyer to seller with `SafeERC20`.
5. Transfer the NFT from escrow to buyer.
6. Emit `ListingPurchased`.

### Cancellation flow

1. Require an active listing.
2. Require the seller, or a narrowly documented emergency admin path.
3. Mark the listing cancelled before transfer.
4. Return the NFT to the seller.
5. Emit `ListingCancelled`.

### Marketplace decisions

- No platform fee in the MVP.
- No royalty enforcement in the MVP.
- No auction, bid, offer, bundle, or partial-fill support.
- Listing data is read from events/indexed projections; unbounded on-chain array
  enumeration is avoided.
- Pausing blocks new listings and purchases. Cancellation remains available when
  safe so users can recover escrowed NFTs.

## 7. Events

At minimum, contracts emit:

```solidity
event ItemMinted(
    address indexed player,
    uint256 indexed tokenId,
    uint32 itemType,
    uint8 rarity,
    bytes32 metadataHash
);

event RewardClaimed(
    bytes32 indexed claimId,
    bytes32 indexed attemptId,
    address indexed player,
    uint256 tokenAmount,
    uint256 itemTokenId
);

event ListingCreated(
    uint256 indexed listingId,
    uint256 indexed tokenId,
    address indexed seller,
    uint256 price
);

event ListingCancelled(
    uint256 indexed listingId,
    uint256 indexed tokenId,
    address indexed seller
);

event ListingPurchased(
    uint256 indexed listingId,
    uint256 indexed tokenId,
    address indexed seller,
    address buyer,
    uint256 price
);
```

Final event signatures may change with implementation, but must remain sufficient
for idempotent history indexing without scanning contract storage.

## 8. Custom Errors

Prefer custom errors for recurring failures, including:

```text
ZeroAddress
UnauthorizedSigner
ClaimExpired
ClaimAlreadyUsed
InvalidNonce
InvalidPlayer
InvalidReward
InvalidPrice
ListingNotActive
NotListingSeller
SellerCannotBuy
UnsupportedItem
```

Names are finalized during implementation and tested through expected reverts.

## 9. Deployment Sequence

1. Deploy `GameToken` with cap and admin.
2. Deploy `GameItem` with admin.
3. Deploy `RewardDistributor` with token, item, admin, pauser, and initial signer.
4. Grant token and item minter roles to `RewardDistributor`.
5. Deploy `Marketplace` with token, item, admin, and pauser.
6. Verify final roles and immutable addresses.
7. Revoke temporary deployer roles that are not part of the documented trust
   model.
8. Export addresses and ABIs for the Fuji frontend configuration.
9. Record deployment transaction hashes in release documentation.

## 10. Required Contract Tests

### GameToken

- authorized mint succeeds;
- unauthorized mint fails;
- cap overflow fails;
- zero-address behavior is correct.

### GameItem

- authorized item mint succeeds with expected metadata;
- unauthorized mint fails;
- invalid item or rarity fails;
- token IDs and ownership are correct.

### RewardDistributor

- valid token-only and token-plus-item claims succeed;
- changed player, amount, item, nonce, or deadline fails;
- wrong signer, wrong chain/domain, and expired signature fail;
- repeated claim ID and repeated nonce fail;
- caller different from player fails;
- paused claims fail;
- mint failure rolls back claim consumption.

### Marketplace

- approved owner can list and NFT enters escrow;
- non-owner and zero-price listing fail;
- seller can cancel and recover NFT;
- non-seller cancellation fails;
- funded and approved buyer can purchase;
- insufficient allowance/balance fails without corrupting listing state;
- seller self-purchase fails;
- sold/cancelled listing cannot be reused;
- malicious receiver/token scenarios do not enable reentrancy;
- pausing blocks listing/purchase while preserving documented recovery behavior.

## 11. Explicit Non-Goals

- Contract upgrades or proxies
- Mainnet governance
- Token economics intended to create financial value
- Native AVAX marketplace settlement
- Royalties or fees
- Cross-chain transfers
- On-chain gameplay simulation
- Client-accessible minting authority
