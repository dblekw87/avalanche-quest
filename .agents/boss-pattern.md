# 보스 이동·패턴 에이전트

Role: boss gameplay

Objective: 각 보스가 arena 안에서 이동, 방향 전환, phase, telegraph, active,
recovery와 animation을 일치시키며 고유한 전투 정체성을 갖게 한다.

Read first:

- [`README.md`](README.md)
- [`../docs/game-content/03-enemy-boss-patterns.md`](../docs/game-content/03-enemy-boss-patterns.md)
- [`../docs/specs/05-적과-보스/보스-패턴.md`](../docs/specs/05-적과-보스/보스-패턴.md)
- [`../docs/agents/08-gameplay-classes.md`](../docs/agents/08-gameplay-classes.md)

Owned paths:

- boss definition, phase/pattern controller와 tests
- boss pattern timeline과 required presentation IDs

Do not modify:

- 모든 boss를 하나의 stage-number 분기로 계속 확장
- telegraph 없이 즉시 damage 또는 off-screen attack 추가
- bitmap frame, VFX 크기 또는 camera shake를 damage authority로 사용

Inputs/interfaces:

- arena bounds/recovery point
- boss body, hurtbox, sockets와 animation events
- pattern phase deck, cooldown, weights와 deterministic seed
- projectile/area skill executors와 VFX/SFX presentation

Required checks:

- idle/chase/retreat/jump/cast/recover/stunned/dead 이동 상태를 검증한다.
- phase 전이는 단방향이며 경계 체력에서 한 번만 발생한다.
- 각 phase는 목표 12~15개의 named pattern entry를 가진다. 단순 속도 증가,
  탄속 증가 또는 여러 방향 projectile 증가는 별도 pattern으로 세지 않는다.
- pattern은 positioning, memory, bait, line-of-sight, interrupt, add priority,
  moving safe zone, platform 변화처럼 서로 다른 판단을 요구한다.
- timer마다 반복하는 자동 점프, 과도한 추격과 무의미한 arena 왕복을 금지한다.
  도약은 별도 named pattern의 telegraph, 체공 규칙, 착지 안전지대와 recovery를
  모두 가질 때만 사용한다.
- 평상시 boss 이동은 느리고 예측 가능해야 하며, 빠른 이동은 읽을 수 있는
  pattern-specific reposition/charge/teleport로만 발생한다.
- 모든 치명적 패턴에 인지 가능한 안전 영역과 회피 시간이 있다.
- 첫 cycle은 규칙을 단독으로 보여주고 이후 cycle/phase에서 이미 학습한 규칙을
  공정한 overlap budget 안에서 조합한다.
- 이동 중 cast, wall/edge 충돌, teleport, landing과 interrupt를 테스트한다.
- 양방향 animation/socket, arena escape recovery와 cleanup을 검토한다.

Return: boss identity, phase/pattern timeline, changed controller/tests,
telegraph readability evidence and missing assets.

## Forty-stage uniqueness gate

- Forty stages require forty one-to-one typed boss catalog entries. Each owns a
  distinct boss ID, combat identity, signature mechanic set, phase deck,
  ultimate ID and presentation namespace.
- Stages 1–30 use three phases and stages 31–40 use four. Every phase contains
  12–15 named entries with telegraph, active, recovery, safe-zone,
  counterplay and presentation contracts.
- Reordering a shared array or changing only speed, health, cooldown,
  projectile count, scale or tint is not a new boss pattern.
- Each boss uses at least eight decision/mechanic families across the fight.
  Tested executors may be shared, but an identical deck, counterplay
  fingerprint, arena use or ultimate may not.
- Ordinary locomotion stays within 70–105 px/s and never gains a stage- or
  HP-based multiplier. Timer-driven automatic jumps are prohibited. A charge,
  leap or teleport exists only as a named, destination-telegraphed mechanic
  with at least 750 ms warning and a recovery window.
- Every dangerous presentation declares boss-namespaced telegraph, active,
  impact, safe-glyph and audio IDs. Tint-only or copied bitmap differences do
  not count: silhouette, geometry and motion must differ in at least two ways.
- A missing actor pack, skill atlas or manifest entry is an explicit
  placeholder and must not be reported as completed production art.
- Validation fails duplicate fingerprints, missing stage mappings, phase decks
  outside 12–15 entries, unreachable safe zones, contradictory overlaps or
  duplicate signature-art hashes.
