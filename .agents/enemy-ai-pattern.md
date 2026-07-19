# 일반 몬스터 AI·패턴 에이전트

Role: enemy gameplay

Objective: 일반 몬스터를 stage 번호에 따른 공통 발사체가 아니라 명시적 archetype,
state machine, skill과 readable pattern을 가진 데이터로 구현한다.

Read first:

- [`README.md`](README.md)
- [`../docs/game-content/03-enemy-boss-patterns.md`](../docs/game-content/03-enemy-boss-patterns.md)
- [`../docs/specs/05-적과-보스/README.md`](../docs/specs/05-적과-보스/README.md)
- [`../docs/agents/08-gameplay-classes.md`](../docs/agents/08-gameplay-classes.md)

Owned paths:

- enemy archetype registry, AI controller와 skill intent
- enemy pattern tests와 telemetry IDs

Do not modify:

- stage reward와 NFT drop
- sprite frame offsets 또는 VFX bitmap 크기로 hitbox 결정
- `QuestScene`에 enemy ID별 대형 조건 분기 추가

Inputs/interfaces:

- enemy definition, movement constraints와 spawn zone
- named attack definitions와 presentation IDs
- deterministic seed/clock와 target query
- body/hurtbox/socket manifest

Required checks:

- spawn, patrol, chase, windup, attack, recover, stunned, dead 상태를 명시한다.
- 각 archetype은 최소 1개, 상위 tier는 2~3개의 학습 가능한 named pattern을 가진다.
- 상위 stage 난이도는 이동속도와 탄속을 계속 높이지 않고 pattern 순서, 몬스터
  역할 조합, 위치 판단과 제한된 overlap으로 만든다.
- 속도는 reaction budget 안에서 bounded하며 speed 증가만으로 새 pattern이라 부르지 않는다.
- 위험한 공격은 telegraph와 recovery를 가진다.
- 공격 intent와 animation/VFX 표현을 분리한다.
- frame rate, scene restart와 최대 동시 개체 수에서 결정성을 유지한다.
- 같은 target 다단 hit와 death event를 중복 처리하지 않는다.

Return: archetypes/patterns, changed registry/controller/tests, tuning assumptions,
asset dependencies and performance evidence.

## Forty-stage encounter uniqueness gate

- Every stage owns a unique normal-monster `signatureSkillId`, counterplay
  fingerprint, presentation ID, telemetry ID and telegraph/active/impact asset
  IDs. Speed, HP, count, scale or tint-only changes are duplicates.
- A stage introduces its signature in three deterministic encounters: Teach,
  Test and Combine. Teach isolates the lesson; only Combine may pair it with a
  previously validated mechanic.
- Difficulty comes from memory, positioning, target priority, baiting,
  interrupt timing, route choice or hazard guidance. Patrol is 38–70,
  chase is 65–105, a named charge is at most 260 and a projectile is at most
  250 px/s. Stage-number speed multipliers are prohibited.
- Normal dangerous telegraphs last 700–1200 ms, major telegraphs last
  1000–1600 ms and dangerous recovery lasts at least 500 ms.
- At most one major and one minor hostile telegraph may overlap. Stages 31–40
  may have at most four normal enemies simultaneously active.
- Spawn definitions use validated platform/map slots. Replay intent must be
  deterministic and may not use unseeded random cooldown or targeting choices.
- Presentation assets differ by silhouette, geometry or motion rather than
  color. Shared late-stage actor placeholders remain explicitly incomplete.
