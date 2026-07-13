# Avalanche Quest Product Requirements

## 1. Product Summary

Avalanche Quest is a portfolio-grade side-scrolling Web3 RPG built on the
Avalanche Fuji C-Chain. Its product loop is **Play → Verify → Claim → Own →
Trade → Explore**.

The project demonstrates that a conventional browser game can integrate wallet
ownership, server-authorized rewards, NFT inventory, and an on-chain marketplace
without allowing the game client to control token issuance.

The visual identity, names, characters, maps, sounds, and item art must be
original. The project may describe MapleStory Universe as product research in
the portfolio, but it must not use Nexon or MapleStory assets, logos, names, or
copied interface designs.

## 2. Portfolio Goal

The finished project should prove the following capabilities:

- Build a polished product with Next.js, TypeScript, and Phaser.
- Integrate an EVM wallet and handle network and transaction state correctly.
- Design a secure boundary between client gameplay, server verification, and
  smart-contract rewards.
- Implement ERC-20, ERC-721, marketplace, inventory, and transaction-history
  flows as one coherent service.
- Explain architectural decisions, limitations, and security tradeoffs in a
  public GitHub repository.

## 3. Target User

The MVP has one user type: a player using a browser wallet.

The player wants to:

1. Connect a wallet.
2. Switch to Avalanche Fuji when necessary.
3. Play one short side-scrolling stage.
4. Defeat monsters and one boss.
5. Submit the completed run for server verification.
6. Claim a fixed server-authorized token reward and an optional item reward.
7. View owned items in an inventory.
8. List an item for sale, cancel a listing, or buy another item with the game
   token.
9. Review transaction history and open transactions in a block explorer.

## 4. MVP Decisions

| Area | MVP decision |
| --- | --- |
| Network | Avalanche Fuji C-Chain, chain ID `43113` |
| Wallet | Injected wallets and WalletConnect through RainbowKit |
| Embedded wallet | Not included in MVP |
| Game | One desktop-first side-scrolling stage |
| Controls | Move, jump, and basic attack |
| Enemies | Three regular monsters and one boss |
| Session length | Target 3–5 minutes |
| Token | Capped ERC-20 game token, symbol to be finalized before deployment |
| Item | ERC-721 equipment NFT |
| Reward | Server-verified, signed, one-time on-chain claim |
| Marketplace | Fixed-price listings settled in the game token |
| Database | Supabase Postgres for attempts, claims, indexed events, and UI history |
| Deployment | Web app plus Fuji contracts; GitHub publication only after final review |

## 5. Core User Flows

### 5.1 Wallet connection

1. The player selects **Connect Wallet**.
2. The app displays supported connectors.
3. After connection, the app shows the shortened address and Fuji balances.
4. If the wallet is on another network, gameplay may remain available, but
   claims and marketplace actions remain disabled until the user switches to
   Fuji.
5. Connection and switching failures display actionable error messages.

### 5.2 Stage play and verification

1. The connected player requests a new stage attempt.
2. The server creates a short-lived attempt with a unique ID and start time.
3. Phaser starts the stage using server-approved stage configuration.
4. The client records a bounded gameplay event log.
5. After the boss is defeated, the client submits the attempt ID and event log.
6. The server verifies ownership, expiry, completion order, minimum plausible
   duration, enemy counts, boss defeat, and prior submission state.
7. A valid attempt becomes `verified`; an invalid attempt becomes `rejected`.
8. Verification never accepts a client-selected reward quantity or item type.

### 5.3 Reward claim

1. The server chooses the reward from versioned server-side stage rules.
2. The server creates an EIP-712 claim containing the wallet, attempt ID,
   reward amount, optional item definition, nonce, and deadline.
3. The reward signer signs the claim on the server only.
4. The player submits the signed claim to `RewardDistributor`.
5. The contract validates the signer, deadline, chain/domain, and unused claim
   ID before minting.
6. The UI shows `pending`, `success`, or `error` and links the transaction hash.

### 5.4 Inventory and item minting

1. A verified reward may include a server-selected equipment item.
2. The item is minted during the reward claim, not from an unrestricted client
   mint function.
3. Inventory combines on-chain ownership with indexed item metadata.
4. Each item displays token ID, type, rarity, attributes, ownership state, and
   listing state.

### 5.5 Marketplace

1. The seller approves the marketplace for the selected NFT.
2. The seller creates a fixed-price listing denominated in the game token.
3. The NFT is held in marketplace escrow while listed.
4. A buyer approves enough game tokens and purchases the listing.
5. The marketplace transfers tokens to the seller and the NFT to the buyer in
   one transaction.
6. The seller may cancel an active listing and recover the NFT.
7. The UI exposes approval and transaction progress separately.

## 6. Functional Requirements and Acceptance Criteria

### Wallet

- The app connects at least one injected wallet and WalletConnect.
- The connected address, Fuji AVAX balance, and game-token balance are visible.
- Wrong-network state blocks on-chain write actions and offers a switch action.
- Disconnecting clears wallet-scoped client state.

### Game

- The player can move left/right, jump, attack, take damage, die, and restart.
- Three monsters and one boss have visible health and deterministic defeat
  conditions.
- The stage has a clear start, failure, and completion state.
- Phaser communicates typed lifecycle events to React without importing Web3
  modules.

### Verification and rewards

- Attempts are unique, wallet-bound, expiring, and single-use.
- Re-submitting or re-claiming the same attempt fails.
- Altering a reward amount or item definition invalidates the signature.
- The reward signer key is never sent to the browser or committed to Git.

### Inventory

- The inventory lists every project NFT owned by the connected wallet.
- Listed and unlisted items are visually distinct.
- Empty, loading, stale, and error states are present.

### Marketplace

- A user can approve, list, cancel, approve currency, and buy.
- A seller cannot buy their own listing.
- A sold or cancelled listing cannot be purchased.
- Every write action exposes pending, confirmed, and failed states.

### History

- The app displays reward claims, mints, listings, cancellations, and sales.
- Each on-chain event links to the Fuji block explorer.
- Indexing delay is disclosed and the UI can refresh.

## 7. Non-Functional Requirements

- TypeScript strict mode is enabled and `any` is not used.
- The main experience supports current desktop Chrome and Edge.
- The dashboard is responsive; the Phaser stage may show a desktop-only notice
  on small screens for the MVP.
- Wallet and transaction errors are understandable without opening DevTools.
- Contract tests cover authorization, replay, expiry, cancellation, payment,
  and reentrancy-sensitive paths.
- Lint, typecheck, unit tests, and contract tests pass before completion.
- Secrets exist only in ignored local environment files or deployment secret
  stores.

## 8. Out of Scope for MVP

- A custom wallet or custody of user private keys.
- Mainnet deployment or assets with real monetary value.
- Multiple stages, multiplayer, PvP, guilds, or live operations tooling.
- Gas sponsorship, account abstraction, bridging, swapping, or token cash-out.
- Auctions, offers, royalties, partial fills, or multi-token payments.
- Upgradeable contracts.
- Fully authoritative anti-cheat. The MVP demonstrates layered validation but
  does not claim that browser gameplay can be made cheat-proof.
- Dungeon editor, achievements, rankings, and embedded/social wallets.

## 9. Success Criteria

The MVP is complete when a reviewer can use two Fuji wallets to play, claim a
reward once, mint an item, list it, buy it from the other wallet, and inspect the
full history without manual database edits. The repository must also explain the
security model, include reproducible setup instructions, and pass all documented
quality checks.
