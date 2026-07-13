# Avalanche Quest Architecture

## 1. Architectural Principles

- Keep gameplay, application UI, server verification, and blockchain code as
  separate boundaries.
- Treat the browser and all gameplay results as untrusted input.
- Keep asset ownership and marketplace settlement on-chain.
- Keep query-friendly projections and attempt telemetry off-chain.
- Prefer an explicit, auditable MVP over premature decentralization.
- Do not place a server secret, Supabase service-role key, WalletConnect project
  secret, or reward-signer private key in client code.

## 2. System Context

```text
Browser
├─ Next.js UI
├─ Phaser game
├─ Zustand client state
└─ wagmi / viem / RainbowKit
      │
      ├──────── Wallet provider ──────── Avalanche Fuji C-Chain
      │                                      ├─ GameToken
      │                                      ├─ GameItem
      │                                      ├─ RewardDistributor
      │                                      └─ Marketplace
      │
      └──────── Next.js server routes
                       ├─ wallet authentication
                       ├─ attempt creation
                       ├─ run verification
                       ├─ reward signing
                       └─ event synchronization
                                  │
                                  └─ Supabase Postgres
```

Avalanche Fuji C-Chain uses chain ID `43113`. RPC and explorer URLs are supplied
through configuration rather than duplicated across features.

## 3. Repository Structure

```text
avalanche-quest/
├─ contracts/
│  ├─ GameToken.sol
│  ├─ GameItem.sol
│  ├─ RewardDistributor.sol
│  └─ Marketplace.sol
├─ scripts/
│  ├─ deploy.ts
│  └─ grant-roles.ts
├─ test/
│  └─ contracts/
├─ supabase/
│  └─ migrations/
├─ docs/
├─ public/
│  └─ game/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ auth/
│  │  │  ├─ attempts/
│  │  │  ├─ rewards/
│  │  │  └─ sync/
│  │  ├─ game/
│  │  ├─ inventory/
│  │  ├─ marketplace/
│  │  └─ history/
│  ├─ components/
│  ├─ features/
│  │  ├─ auth/
│  │  ├─ inventory/
│  │  ├─ marketplace/
│  │  ├─ rewards/
│  │  └─ web3/
│  ├─ game/
│  │  ├─ config/
│  │  ├─ entities/
│  │  ├─ scenes/
│  │  ├─ systems/
│  │  └─ bridge/
│  ├─ server/
│  │  ├─ auth/
│  │  ├─ rewards/
│  │  ├─ validation/
│  │  └─ supabase/
│  ├─ stores/
│  └─ types/
└─ hardhat.config.ts
```

`src/game` must not import wagmi, viem wallet clients, contract ABIs, or server
database code. It reports typed domain events through `src/game/bridge`.

## 4. Frontend Boundaries

### Next.js App Router

Next.js owns routing, page composition, API route handlers, and server-only
operations. Phaser is loaded through a client-only dynamic boundary so it is not
evaluated during server rendering.

### Phaser

Phaser owns simulation and rendering only:

- input and movement;
- collisions;
- combat and health;
- stage progression;
- bounded telemetry events;
- completion and failure signals.

It does not know the connected address, reward amount, token balance, contract
address, or claim signature.

### React–Phaser bridge

The bridge exposes a small typed interface:

```ts
type GameToAppEvent =
  | { type: 'stage-ready'; attemptId: string }
  | { type: 'player-defeated'; attemptId: string }
  | { type: 'stage-completed'; attemptId: string; telemetry: RunTelemetry };

type AppToGameEvent =
  | { type: 'start-stage'; attempt: StageAttempt }
  | { type: 'pause-stage' }
  | { type: 'resume-stage' }
  | { type: 'destroy-stage' };
```

The final types may add fields, but communication remains serializable and does
not expose implementation objects across the boundary.

### Zustand

Separate stores are used for:

- transient game UI state;
- transaction notifications;
- user preferences.

On-chain balances, ownership, listings, and receipts are not treated as
authoritative Zustand state. They are read from the chain or indexed projection
and invalidated after confirmed transactions.

## 5. Wallet and Authentication

Wallet connection and server authentication are distinct:

1. RainbowKit connects an injected wallet or WalletConnect session.
2. The client requests a server nonce.
3. The wallet signs a human-readable authentication message containing domain,
   address, chain ID, nonce, issued-at, and expiration.
4. The server verifies the signature and nonce.
5. The server issues a short-lived, HttpOnly, Secure, SameSite session cookie.

The wallet signature never grants mint authority. It only proves control of the
address for server requests. Nonces are single-use and expire quickly.

## 6. Stage Attempt and Verification Model

### Attempt creation

The server creates:

```text
attempt_id
wallet_address
stage_id
stage_version
seed
issued_at
expires_at
status = started
```

The stage configuration is versioned. The server controls the enemy definitions,
completion rules, and reward table for that version.

### Telemetry

The client submits a bounded event sequence such as:

```text
run-started
enemy-damaged
enemy-defeated
player-damaged
boss-started
boss-defeated
run-completed
```

Every event contains an elapsed time and relevant entity identifier. Payload
size, event count, identifiers, numeric ranges, and ordering are validated.

### MVP verification

The verifier checks:

- authenticated wallet matches the attempt;
- attempt exists, is unexpired, and has not been submitted;
- stage and entity IDs match the versioned configuration;
- elapsed times are monotonic and total duration is plausible;
- required monsters and boss were defeated once;
- damage and health transitions stay within configured bounds;
- completion ordering is valid;
- the database transition from `started` to `verified` is atomic.

This reduces trivial reward forgery but is not a fully authoritative game server.
That limitation must be stated in the public README.

## 7. Reward Authorization

After verification, the server calculates the reward and creates an EIP-712
typed claim:

```text
claimId        bytes32
attemptId      bytes32
player         address
tokenAmount    uint256
itemType       uint32
itemRarity     uint8
metadataHash   bytes32
nonce          uint256
deadline       uint64
```

`itemType = 0` means no item. The exact Solidity layout in code is the source of
truth and must be mirrored by typed frontend/server definitions.

The reward-signer private key is stored only in server deployment secrets. The
server records the claim before returning the signature. `RewardDistributor`
marks `claimId` used before external mint calls and rejects expired, replayed,
wrong-chain, wrong-contract, or unauthorized signatures.

## 8. Smart-Contract Boundaries

- `GameToken` owns ERC-20 supply rules and exposes minting only to a role granted
  to `RewardDistributor`.
- `GameItem` owns ERC-721 metadata and exposes minting only to a role granted to
  `RewardDistributor`.
- `RewardDistributor` verifies server reward signatures and performs one-time
  token/item minting.
- `Marketplace` escrows `GameItem` NFTs and settles fixed-price sales using
  `GameToken` through `SafeERC20`.

Contracts use OpenZeppelin building blocks for token standards, access control,
cryptography, safe transfers, and reentrancy protection. MVP contracts are not
upgradeable.

## 9. Supabase Data Model

### Core tables

| Table | Purpose |
| --- | --- |
| `auth_nonces` | Single-use wallet authentication nonces |
| `stage_attempts` | Attempt lifecycle, wallet, stage version, timestamps |
| `run_submissions` | Validated telemetry payload hash and rejection reason |
| `reward_claims` | Server-selected reward, nonce, deadline, signature, tx hash |
| `chain_events` | Idempotent indexed contract events |
| `sync_cursors` | Last finalized/indexed block by contract |

Wallet addresses are normalized before persistence. Unique constraints cover
attempt IDs, claim IDs, `(chain_id, tx_hash, log_index)`, and reward nonces.

### Access rules

- Browser code never receives the Supabase service-role key.
- Public-schema tables use Row Level Security.
- Players may read only their own attempts and claims through authenticated
  server endpoints.
- Verification, signing, and synchronization use server-only access.
- Marketplace history derived from public chain events may be publicly readable.

## 10. Event Indexing and Consistency

The chain is authoritative for ownership, balances, listings, and completed
transactions. Supabase provides a query projection.

The sync job:

1. reads from the last cursor with a small overlap;
2. fetches relevant Fuji logs;
3. upserts using `(chain_id, tx_hash, log_index)`;
4. advances the cursor only after a successful transaction;
5. tolerates duplicate processing;
6. waits for a configurable confirmation depth before marking final.

The UI can read directly from contracts for current ownership and use Supabase
for history. It labels indexer-backed data when it may be delayed.

## 11. Transaction State Model

Every write uses a shared state machine:

```text
idle
→ awaiting-signature
→ submitted
→ confirming
→ success
or error
```

Approval and action transactions are separate operations. Errors preserve a
safe retry path, transaction hashes remain visible, and confirmed writes trigger
targeted query invalidation.

## 12. Environment Configuration

The eventual `.env.example` documents names but contains no secret values:

```text
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
NEXT_PUBLIC_FUJI_RPC_URL
NEXT_PUBLIC_GAME_TOKEN_ADDRESS
NEXT_PUBLIC_GAME_ITEM_ADDRESS
NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS
NEXT_PUBLIC_MARKETPLACE_ADDRESS
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
REWARD_SIGNER_PRIVATE_KEY
DEPLOYER_PRIVATE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY`, `REWARD_SIGNER_PRIVATE_KEY`, and
`DEPLOYER_PRIVATE_KEY` are server/deployment secrets. They must never use a
`NEXT_PUBLIC_` prefix.

## 13. Testing Strategy

- Unit tests: telemetry validation, reward calculation, serializers, state
  machines, and utility functions.
- Contract tests: roles, cap, signature domain, tampering, expiry, replay,
  escrow, cancellation, purchase, and reentrancy-sensitive behavior.
- Component tests: wrong-network and transaction states.
- Integration tests: attempt creation → verification → signed claim using local
  contracts and a test database boundary.
- End-to-end smoke test: connect test wallet, complete a deterministic stage,
  claim, list, and buy on the configured test environment.

## 14. Security and Operational Notes

- Rate-limit nonce, attempt, submission, and claim endpoints.
- Cap request body and telemetry sizes.
- Use schema validation at every server boundary.
- Never log signatures, cookies, service keys, or private keys.
- Separate deployer, reward signer, and player test wallets.
- Grant contract roles after deployment and revoke temporary deployer roles when
  practical.
- Provide emergency pause controls only where they protect reward distribution
  or marketplace actions; document who controls them.
