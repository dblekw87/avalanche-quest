# Avalanche Quest Development Roadmap

## 1. Delivery Strategy

Development is split into vertical milestones. Each milestone must leave the
repository runnable and must pass its documented checks before the next begins.
GitHub publication is a final milestone and is not performed automatically.

## 2. Milestone 0 — Design Baseline

### Deliverables

- `AGENTS.md`
- product requirements
- architecture
- smart-contract specification
- roadmap

### Exit criteria

- MVP and out-of-scope boundaries are explicit.
- Reward authority and replay prevention are defined.
- Contract responsibilities and directory boundaries agree across documents.
- No production code or dependency installation is required yet.

## 3. Milestone 1 — Project Foundation

### Deliverables

- Next.js App Router project with TypeScript strict mode and Tailwind CSS
- ESLint and formatting configuration
- Phaser, Zustand, wagmi, viem, and RainbowKit dependencies
- Hardhat TypeScript workspace and OpenZeppelin dependency
- agreed source directories
- `.env.example` and hardened `.gitignore`
- base application shell and navigation
- scripts for `dev`, `build`, `lint`, `typecheck`, and contract tests

### Exit criteria

- The app starts locally without secrets by using safe mock/configuration states.
- Phaser loads only on the client.
- Empty routes exist for game, inventory, marketplace, and history.
- `lint`, `typecheck`, and `build` pass.

## 4. Milestone 2 — Game Vertical Slice

### Deliverables

- original placeholder art and stage layout
- player movement, jump, attack, health, death, and restart
- three monsters and one boss
- collision and camera behavior
- typed React–Phaser bridge
- local mock attempt and completion result
- keyboard controls and in-game HUD

### Exit criteria

- A reviewer can complete or fail the stage repeatedly.
- Completion occurs only after required enemies and boss are defeated.
- Phaser code stays under `src/game` and imports no Web3 code.
- Deterministic game-domain unit tests pass where practical.
- `lint`, `typecheck`, and `build` pass.

## 5. Milestone 3 — Wallet and Fuji Integration

### Deliverables

- RainbowKit provider configuration
- injected-wallet and WalletConnect support
- Fuji chain configuration using chain ID `43113`
- address, native balance, and network status UI
- switch-network action
- shared transaction state components
- wallet-signature authentication nonce/session flow

### Exit criteria

- A fresh browser can connect and disconnect a wallet.
- Wrong-network state prevents write actions.
- Authentication nonces are expiring and single-use.
- No secret is present in the browser bundle or repository.
- Wallet connection errors have visible recovery actions.

## 6. Milestone 4 — Smart Contracts

### Deliverables

- `GameToken.sol`
- `GameItem.sol`
- `RewardDistributor.sol`
- `Marketplace.sol`
- deployment and role-configuration scripts
- ABI export process
- comprehensive Hardhat tests

### Exit criteria

- Only the distributor can mint the game token and item NFT after deployment
  role configuration.
- Modified, expired, replayed, or wrong-domain reward claims fail.
- Listing, cancellation, purchase, and escrow recovery paths pass tests.
- Seller self-purchase and zero-price listing fail.
- Contract coverage targets critical branches rather than a vanity percentage.

## 7. Milestone 5 — Server Verification and Reward Claim

### Deliverables

- Supabase migrations with constraints and RLS
- authenticated attempt-creation endpoint
- telemetry schema and payload limits
- deterministic stage-run verifier
- versioned server-side reward rules
- server-only EIP-712 signing service
- claim endpoint and claim UI
- duplicate submission and duplicate claim protection

### Exit criteria

- A client-supplied reward amount is ignored or rejected.
- An attempt can transition to `verified` only once.
- Concurrent submissions do not produce multiple claims.
- A valid signed claim succeeds once on a local chain.
- Invalid and replayed claims fail in integration and contract tests.

## 8. Milestone 6 — Fuji Deployment and End-to-End Reward

### Deliverables

- contracts deployed to Fuji with recorded addresses and deployment transactions
- roles granted to the distributor
- frontend ABI/address configuration
- end-to-end play → verify → claim flow
- explorer links and transaction feedback

### Exit criteria

- A test wallet receives the expected token amount exactly once.
- An optional equipment reward appears in the wallet inventory.
- Transaction states remain correct across rejection, wallet cancellation, and
  confirmation.
- Deployment secrets remain outside Git.

## 9. Milestone 7 — Inventory and Marketplace

### Deliverables

- inventory ownership query
- NFT metadata presentation
- approval and listing flow
- active listing browser with filters
- game-token approval and purchase flow
- cancellation flow
- sold/listed/owned state synchronization

### Exit criteria

- Wallet A can list an owned item.
- Wallet B can approve currency and purchase it.
- Ownership and token balances update after confirmation.
- Wallet A can cancel an unsold listing and recover the NFT.
- Loading, empty, pending, success, and error states are covered.

## 10. Milestone 8 — History and Product Polish

### Deliverables

- idempotent contract-event synchronization
- reward, mint, listing, cancellation, and sale history
- Fuji explorer links
- responsive dashboard polish
- accessibility and keyboard-focus review
- original art/audio license manifest
- error boundaries and not-found states

### Exit criteria

- Event synchronization can safely reprocess an overlapping block range.
- History matches transaction receipts used in the end-to-end scenario.
- The game and dashboard have a coherent original visual identity.
- No Nexon or MapleStory copyrighted assets are present.

## 11. Milestone 9 — Portfolio and Release Readiness

### Deliverables

- Korean and/or English README with project story and screenshots
- architecture and security diagrams
- local setup and Fuji test instructions
- demo scenario using two test wallets
- known limitations and future-work section
- deployment address and sample transaction table
- final dependency and secret scan

### Required checks

```text
lint
typecheck
build
unit tests
contract tests
integration tests
end-to-end smoke test
secret scan
```

### Exit criteria

- A reviewer can understand the project within five minutes.
- Setup steps work from a clean clone.
- All required checks pass or an explicit documented exception is approved.
- Screenshots and demo data contain no secrets or personally sensitive wallet
  activity.
- The user reviews the finished repository and explicitly approves GitHub
  publication.

## 12. Post-MVP Backlog

Prioritize only after the MVP is stable:

1. [NFT equipment, class, advancement and material progression](nft-system/README.md).
2. [Manifest-driven game content and raid production](game-content/README.md).
3. Embedded/social wallet onboarding.
4. Additional stages and versioned stage editor.
5. Achievement NFT badges.
6. Wallet-based rankings.
7. Gas sponsorship or account abstraction.
8. Offers or auctions.
9. More authoritative server simulation and anti-cheat signals.
10. Production-grade event indexer and monitoring.

## 13. Scope-Control Rules

- Do not start post-MVP work before Milestone 9 exit criteria are met.
- Do not deploy to mainnet during this portfolio project.
- Do not add a second token or NFT standard without revising the architecture.
- Do not weaken verification to simplify the UI.
- Do not publish to GitHub until the final user approval step.
