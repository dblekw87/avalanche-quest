# Agent Operating Manual

This directory defines how AI agents and human contributors plan, implement,
review, deploy, and operate this game across local EVM chains, testnets such as
Avalanche Fuji and Arbitrum Sepolia, and production mainnets.

한국어 세부 구현 명세 120개는 [`docs/specs/README.md`](../specs/README.md)에서
찾을 수 있다. 에이전트는 자신의 역할 문서뿐 아니라 변경 대상 도메인의 세부
명세를 함께 읽어야 한다.

## Reading order

1. Root [`AGENTS.md`](../../AGENTS.md): non-negotiable project boundaries.
2. [`01-common-rules.md`](01-common-rules.md): rules followed by every role.
3. [`02-orchestration.md`](02-orchestration.md): lead-agent and subagent model.
4. [`03-role-catalog.md`](03-role-catalog.md): ownership and deliverables.
5. [`04-workflows.md`](04-workflows.md): standard delivery procedures.
6. [`05-web3-networks.md`](05-web3-networks.md): chain and deployment policy.
7. [`06-security-quality.md`](06-security-quality.md): threat and quality gates.
8. [`07-runbooks-templates.md`](07-runbooks-templates.md): reusable task records.
9. [`08-gameplay-classes.md`](08-gameplay-classes.md): Phaser classes and systems.
10. [`09-asset-spritesheet-standard.md`](09-asset-spritesheet-standard.md): visual asset contract.
11. [`10-skill-combat-standard.md`](10-skill-combat-standard.md): skills and combat data.
12. [`11-nft-progression-standard.md`](11-nft-progression-standard.md): NFT equipment, class, advancement and material boundaries.
13. [`12-game-content-production-standard.md`](12-game-content-production-standard.md): actor coordinates, content assets, encounters and raid patterns.

## Rule precedence

Apply instructions in this order: explicit user request, nearest applicable
`AGENTS.md`, root `AGENTS.md`, this manual, then task-specific conventions. A
lower-level rule may be more restrictive but must never permit secrets in code,
client-selected rewards, duplicate claims, unreviewed mainnet deployment, or
unrestricted minting.

## Minimal team

Small changes do not require every role. The lead selects the smallest set that
covers the risk. A typical feature uses a lead, one implementation owner, and
one independent reviewer. Smart-contract or mainnet work additionally requires
security and release review by a person who did not author the change.

Agents provide analysis and proposed commands; a human remains accountable for
wallet signatures, production secrets, treasury movement, governance actions,
DNS changes, destructive database operations, and every mainnet transaction.
