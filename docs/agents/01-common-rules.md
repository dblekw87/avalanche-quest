# Common Rules

## Before editing

- Read the root and nearest `AGENTS.md`, relevant product/architecture docs,
  package scripts, and the files that will be changed.
- Inspect working-tree changes and preserve unrelated user work.
- State scope, assumptions, acceptance criteria, risks, and required checks.
- Prefer the smallest coherent change; do not perform opportunistic rewrites.
- Confirm chain, chain ID, contract address, account role, and environment before
  any blockchain operation. Network names alone are insufficient.

## Architecture

- Browser, Phaser simulation, Next.js server, database, indexer, and contracts
  are separate trust boundaries.
- `src/game` contains deterministic gameplay and typed bridge events, never
  wallet clients, ABIs, private configuration, or reward calculations.
- `src/features/web3` owns chain configuration, wallet interaction, contract
  clients, transaction state, and explorer links.
- Server-only validation, signing, privileged database access, and RPC jobs stay
  outside client bundles. Guard server modules against accidental client import.
- Contracts are the authority for balances, ownership, roles, and settlement;
  indexed data is a recoverable projection.
- Shared UI belongs in `src/components`; domain UI stays with its feature.
- Keep types explicit and serializable. Do not use `any`, unsafe type assertions,
  floating-point arithmetic for token values, or unvalidated external input.

## Coding and data

- Validate API, RPC, database, wallet, URL, and game-telemetry inputs at runtime.
- Use integer base units for tokens and explicit decimal formatting at the edge.
- Normalize addresses for comparison while preserving a checksummed display.
- Use UTC timestamps and explicit expiry/deadline semantics.
- Design writes for retry: idempotency keys and database constraints must prevent
  duplicate attempts, claims, events, webhooks, and scheduled jobs.
- Use bounded pagination and request sizes. Never scan an unbounded on-chain or
  database collection in an interactive request.
- Logs may contain request IDs, chain IDs, addresses, and transaction hashes but
  never secrets, cookies, raw auth signatures, private telemetry, or seed phrases.

## UX and transactions

- Every asynchronous view has idle/empty, loading, success, and actionable error
  states. On-chain writes additionally show awaiting signature, submitted,
  confirming, confirmed, rejected, replaced, reverted, and wrong-network states
  where relevant.
- Never report success at transaction submission. Wait for the configured number
  of confirmations and handle replacement/reorganization.
- Separate approval, permit, listing, purchase, and claim operations in UI state.
- Show the target network, asset, amount, contract, and explorer link before or
  immediately after a write. Never silently switch networks or request signatures.
- Accessibility, keyboard operation, reduced motion, responsive layout, and game
  performance are acceptance criteria, not optional polish.

## Change discipline

- Do not edit generated ABI, type, migration snapshot, lock, or deployment files
  by hand when a generator is authoritative.
- Never modify an applied migration; add a forward migration and document rollback.
- Contract ABI/address changes must update clients, indexers, configuration,
  fixtures, and deployment records together.
- Comment decisions and invariants, not syntax. Update documentation when behavior,
  trust assumptions, setup, environment variables, or runbooks change.
- Do not commit `.env*`, keystores, mnemonics, private keys, API secrets, database
  dumps, production player data, or unredacted incident evidence.

## Completion

Run focused tests first, then relevant project gates. For code changes the default
is `npm run lint`, `npm run typecheck`, relevant tests, and a production build when
routing, bundling, or configuration changes. Contract changes also require compile,
contract tests, deployment simulation, and security review. Report commands and
results honestly; never claim a check that was not run.
