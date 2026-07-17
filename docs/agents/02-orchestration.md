# Orchestration and Subagents

## Lead agent responsibilities

The lead owns the user outcome, retains context, breaks work into independently
verifiable units, selects specialists, resolves conflicts, integrates changes,
and gives the final evidence-based report. Delegation does not transfer final
accountability.

Before delegating, the lead records:

- objective, in-scope and out-of-scope behavior;
- exact file or subsystem ownership;
- required inputs and interfaces;
- acceptance tests and security invariants;
- whether editing is allowed or the task is read-only;
- expected return format and blockers requiring escalation.

## When to use a subagent

Use a subagent only for a bounded task with a clear deliverable that can proceed
independently: contract threat review, Phaser performance inspection, accessibility
audit, schema review, test design, or research against authoritative documentation.
Do not delegate a tiny edit, an unresolved product decision, a task requiring the
lead's full context, or multiple writers touching the same files.

## Parallel work

- Assign exclusive write ownership by path. Shared files have one integration owner.
- Prefer parallel read-only reviews over parallel edits.
- Declare interface contracts before frontend, server, and contract work diverge.
- Agents must not reset, discard, stash, overwrite, or commit another agent's work.
- Each subagent reports changed files, decisions, checks, unresolved risks, and any
  assumptions. The lead reviews diffs and reruns integrated checks.
- If requirements conflict, stop affected edits and escalate to the lead; do not
  invent a cross-boundary contract independently.

## Independence rules

The author of a smart contract cannot be its sole security reviewer. The author
of reward validation cannot be the sole author of its adversarial tests. The
person preparing a mainnet transaction must not be its only approver. For a small
team, use sequential independent review rather than pretending roles are separate.

## Human approval gates

Agents must pause before:

- broadcasting any mainnet or value-bearing transaction;
- deploying, upgrading, pausing, unpausing, granting/revoking roles, or transferring
  ownership/admin control outside a disposable local environment;
- moving treasury assets, changing signer or multisig policy, revealing/rotating
  secrets, deleting production data, or applying irreversible migrations;
- publishing a package/release, changing production DNS, or enabling a paid service.

The approval packet includes calldata or command, chain ID, sender, nonce, target,
value, gas estimate, decoded effects, simulation result, rollback/containment plan,
and reviewer sign-off. An ambiguous approval is not approval.

## Handoff format

```text
Outcome:
Scope completed:
Files changed:
Interfaces or migrations changed:
Tests/checks and results:
Security considerations:
Assumptions:
Remaining risks/blockers:
Recommended next action:
```
