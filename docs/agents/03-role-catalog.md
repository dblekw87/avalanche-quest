# Role Catalog

Roles are capabilities, not permanent processes. One agent may hold compatible
roles, but independent reviews and human approval gates still apply.

| Role | Owns | Required outputs | Must not do alone |
| --- | --- | --- | --- |
| Product/lead | scope, acceptance criteria, sequencing, integration | task brief, decisions, final evidence | silently expand scope or approve mainnet |
| Game/Phaser | simulation, scenes, entities, input, bridge, performance | deterministic mechanics, typed events, gameplay tests | calculate rewards or access wallet/DB |
| Frontend/UI | App Router UI, accessibility, responsive states | components, error/loading states, UI tests | trust cached ownership or hide tx failure |
| Web3 frontend | wagmi/viem, chains, ABIs, reads/writes, tx lifecycle | typed config, chain guards, receipt handling | sign for users or embed secrets |
| Backend/API | auth, attempt lifecycle, validation, rate limits | schemas, idempotent routes, integration tests | trust client rewards/addresses blindly |
| Smart contract | Solidity, invariants, events, deployment modules | contracts, tests, role graph, gas notes | self-approve security/mainnet release |
| Database | schema, RLS, migrations, constraints, backups | forward migration, rollback notes, query tests | weaken RLS or rewrite applied migrations |
| Indexer/data | event ingestion, confirmations, reorg recovery | idempotent projection, cursors, replay plan | treat projection as chain authority |
| Security | threat model, abuse cases, dependency/secret review | findings by severity, reproduction, mitigations | dismiss accepted risks without owner/date |
| QA/E2E | test matrix, cross-browser/wallet/network scenarios | reproducible failures, regression coverage | change acceptance criteria to pass tests |
| DevOps/release | CI, environments, observability, releases | reproducible build, deployment record, rollback | handle production keys in source or logs |
| UX/art/audio | original assets, interaction clarity, asset budgets | licensed/original assets, export specs | use copyrighted assets without permission |
| Documentation | setup, architecture, ADRs, runbooks | current, executable instructions | document unverified behavior as fact |

## Role-specific invariants

### Game/Phaser

Keep frame-rate-independent movement, bounded entity counts, asset cleanup, scene
teardown, and deterministic/versioned stage rules. Treat emitted telemetry as
untrusted evidence, not proof. Do not send Phaser objects across the React bridge.

### Web3 frontend

Derive clients from a single chain registry. Verify chain ID and deployed bytecode
before enabling writes. Parse custom errors, handle user rejection and replacement,
and invalidate only affected queries after confirmed receipts.

### Backend and rewards

Bind authentication nonces to domain, address, chain, issue/expiry time, and one-time
use. Bind attempts to wallet and stage version. Calculate rewards only from versioned
server rules. Persist claim authorization atomically before returning a signature.

### Contracts

Define invariants before implementation. Follow checks-effects-interactions, least
privilege, explicit caps, replay/domain separation, and safe token-transfer patterns.
Avoid upgradeability unless governance, storage-layout tests, delay, and emergency
procedures are explicit requirements.

### Security reviewer

Review trust boundaries, authorization, replay, signature malleability/domain,
reentrancy, unsafe external tokens, denial of service, price/decimal handling,
front-running, stale reads, RLS, rate limits, key custody, dependencies, and incident
controls. Findings include severity, likelihood, impact, evidence, owner, and due date.
