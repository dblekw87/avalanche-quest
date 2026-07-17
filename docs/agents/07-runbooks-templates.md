# Runbooks and Templates

## Task brief

```md
# Task: <outcome>

## Context
User value, current behavior, relevant links/files.

## Scope
- In:
- Out:

## Acceptance criteria
- [ ] Observable behavior
- [ ] Failure and transaction states
- [ ] Security invariant
- [ ] Tests and documentation

## Interfaces and ownership
Paths, API/event/ABI/schema changes, assigned owner and reviewer.

## Risks and approval gates
Network/value/data risk, human decisions, rollback or containment.
```

## Agent assignment

```md
Role:
Objective:
Read first:
Owned paths:
Do not modify:
Inputs/interfaces:
Required checks:
Return: outcome, files, decisions, checks, risks, blockers.
```

## Architecture decision record

```md
# ADR-NNN: <decision>
Status: proposed | accepted | superseded
Date:
Owners:

## Context and constraints
## Options considered
## Decision
## Security and operational consequences
## Migration/rollback
## Verification
```

## Deployment record

```md
# Deployment: <system> / <environment>
Source commit and artifact hash:
Chain name and chain ID:
RPC identity check:
Deployer/admin/signer/pauser addresses:
Contract addresses and deployment blocks:
Constructor/initializer parameters:
Transaction hashes:
Compiler/optimizer settings:
Simulation and test evidence:
Source/runtime-bytecode verification:
Final role graph and revoked roles:
Approvers:
Smoke-test result:
Rollback/containment plan:
```

## Security review

```md
# Security review: <scope>
Commit/artifacts reviewed:
Trust boundaries and assets:
Invariants:
Tools/tests performed:

| ID | Severity | Finding/evidence | Impact | Fix/owner/date | Status |
| --- | --- | --- | --- | --- | --- |

Residual risks and accepted-risk expiry:
Reviewer (independent of author where required):
```

## Release checklist

- [ ] Scope, commit, artifacts, ABI, addresses, and migrations frozen.
- [ ] Lint, typecheck, tests, build, contract checks, and E2E recorded.
- [ ] No secret or sensitive data in diff, build output, logs, or source maps.
- [ ] Environment variables and chain registry validated in staging.
- [ ] Security findings resolved or formally owned and time-bounded.
- [ ] Database backup/forward recovery and off-chain rollback tested.
- [ ] On-chain simulation, approval packet, and containment plan approved.
- [ ] Monitoring, alerts, explorer links, status communication, and on-call owner ready.
- [ ] Post-release smoke test and observation window completed.

## Incident quick record

```md
Detected at / reporter:
Current incident owner:
Known affected chains, contracts, services, users, and time window:
Observed evidence (secret-free):
Containment approvals/actions:
Key/data/asset exposure assessment:
Recovery verification:
User/public communications owner:
Follow-up actions, owners, due dates:
```
