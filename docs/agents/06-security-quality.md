# Security and Quality Gates

## Threat model baseline

Assume the browser, player, telemetry, wallet provider, RPC response, API payload,
metadata URL, marketplace participant, and external token/NFT are malicious or faulty.
Document assets, actors, entry points, trust boundaries, privileges, abuse cases, and
recovery controls for every value-bearing feature.

## Mandatory security properties

- The client never chooses reward amount, rarity, recipient, nonce, or authorization.
- Attempt submission and reward claims are single-use under concurrent requests.
- Signatures bind all meaningful fields, chain ID, verifying contract, nonce, and
  deadline. Authentication signatures use clear domain separation from transactions.
- Minting, pausing, upgrades, withdrawals, and role changes use least privilege.
- External calls cannot reenter inconsistent state; failed atomic operations roll back.
- Marketplace settlement handles allowance, balance, non-standard return behavior,
  escrow ownership, cancellation, self-purchase, stale listings, and receiver failure.
- Server routes enforce schema, authentication, authorization, rate/size limits,
  origin/session protections where applicable, and safe error messages.
- Supabase service credentials stay server-only; RLS is enabled and tested with
  anonymous, owner, other-user, and service-role contexts.
- Metadata/content is allowlisted or sanitized; no arbitrary script, redirect, or
  server-side fetch target is trusted.
- Dependencies and generated artifacts are pinned and reviewed; critical advisories
  block release unless a named owner accepts the risk with an expiry.

## Required test matrix

| Layer | Minimum coverage |
| --- | --- |
| Game | movement/combat invariants, pause/restart/cleanup, deterministic completion, performance budget |
| UI | empty/loading/error, accessibility, wrong network, wallet rejection, replacement/revert, responsive layout |
| API | schema boundaries, auth/ownership, expiry, replay/race, rate limit, idempotency, database failure |
| Contracts | permissions, caps, zero values, replay/domain/tampering, reentrancy, pause, event correctness, gas bounds |
| Indexer | duplicate logs, delayed/out-of-order logs, reorg rewind, RPC failure, cursor transactionality |
| E2E | play → verify → claim → inventory → list → buy/cancel with two wallets |

## Review severities

- Critical: loss/control of assets, arbitrary mint/admin, secret compromise. Release
  blocked; activate incident handling.
- High: practical authorization/replay/value-integrity failure. Release blocked.
- Medium: bounded security, reliability, privacy, or denial-of-service weakness. Fix
  before release or obtain time-bounded owner acceptance.
- Low: hardening or limited-impact defect. Track with owner and target date.
- Informational: maintainability or defense-in-depth observation.

## Definition of done by change type

Documentation-only: links and commands checked; no contradictions with code.

Frontend/game: lint, typecheck, focused tests, relevant build/E2E, accessibility and
manual transaction-state review.

Backend/database: lint, typecheck, unit/integration tests, race/idempotency tests,
migration/RLS verification, observability and rollback notes.

Contracts/Web3: all above as relevant plus compile, contract/adversarial tests,
deployment simulation, ABI compatibility, role verification, independent security
review, and testnet smoke test. Mainnet additionally requires the human approval
packet and post-deployment verification.
