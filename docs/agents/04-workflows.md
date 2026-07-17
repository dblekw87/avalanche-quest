# Standard Workflows

## Feature delivery

1. Lead writes the task brief and acceptance criteria.
2. Identify trust boundaries, data ownership, transaction states, and failure modes.
3. Define or update typed interfaces before implementations split across layers.
4. Implement the smallest vertical slice with tests near each boundary.
5. Run focused checks, then lint, typecheck, integration/E2E as appropriate.
6. Obtain independent review for security-sensitive code.
7. Update architecture, environment examples, ADRs, and runbooks.
8. Lead inspects the integrated diff and reports evidence and residual risk.

## Game-to-reward workflow

```text
server creates wallet-bound attempt
→ game receives versioned config
→ Phaser emits bounded telemetry
→ server validates schema/order/ranges/expiry/single use
→ database atomically marks verified
→ server computes reward and records authorization
→ authorized signer creates chain-bound EIP-712 signature
→ player submits claim
→ contract consumes replay protection before mint calls
→ receipt confirmation updates UI and index projection
```

Tests must cover forged telemetry, altered reward fields, duplicate submission,
duplicate claim, expired attempt/signature, wrong caller/signer/chain/contract,
database races, RPC retry, reverted mint, and indexer replay.

## Contract change workflow

1. Record invariants, privilege graph, external calls, events, and compatibility.
2. Write happy-path and adversarial tests before or alongside implementation.
3. Compile and test locally; use static analysis/fuzzing when configured.
4. Review storage layout and upgrade implications even when the answer is
   "non-upgradeable"; review event compatibility with the indexer.
5. Deploy to a disposable local chain, then a named testnet using a dedicated key.
6. Verify source and bytecode, roles, ownership, caps, signer, pause state, and UI ABI.
7. Run end-to-end testnet smoke tests and archive deployment metadata.
8. For mainnet, follow the release workflow and human approval gate.

## Database migration workflow

Design a forward-only migration, constraints and RLS; test on representative
non-production data; estimate lock duration; prepare backup and rollback/roll-forward;
apply first to staging; verify reads/writes and performance; then request production
approval. Destructive transformations use expand/migrate/contract phases.

## Bug and incident workflow

For ordinary bugs: reproduce, minimize, identify the violated invariant, add a
failing regression test, fix the root cause, and verify adjacent behavior.

For active security incidents: stop risky automation, preserve evidence without
secrets, notify the human incident owner, assess affected chains/contracts/keys,
use documented pause controls only with approval, rotate compromised credentials,
communicate known facts, remediate, recover, and write a blameless postmortem.
Never redeploy or move funds impulsively.

## Release workflow

Freeze versioned artifacts; reproduce build; run all gates; create an environment
manifest; simulate deployment and admin calls; obtain security and release approval;
deploy contracts before dependent services when required; verify bytecode/config;
deploy indexer/server/UI; run smoke tests; monitor errors and chain events; retain a
rollback for off-chain components and a containment plan for immutable contracts.
