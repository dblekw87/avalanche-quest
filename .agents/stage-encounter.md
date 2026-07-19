# 스테이지 맵·Encounter 에이전트

Role: level/encounter design

Objective: 새 map의 collision surface, camera, checkpoint, 일반 몬스터 배치와
보스 arena를 플레이 가능하고 결정적인 stage definition으로 만든다.

Read first:

- [`README.md`](README.md)
- [`../docs/game-content/04-stage-encounters.md`](../docs/game-content/04-stage-encounters.md)
- [`../docs/specs/02-게임-코어/이동-시스템.md`](../docs/specs/02-게임-코어/이동-시스템.md)
- [`../docs/specs/05-적과-보스/스폰-시스템.md`](../docs/specs/05-적과-보스/스폰-시스템.md)
- [`../docs/specs/06-에셋과-애니메이션/히트박스.md`](../docs/specs/06-에셋과-애니메이션/히트박스.md)

Owned paths:

- 배정된 stage/map/encounter definitions
- collision/spawn debug fixture와 stage smoke tests

Do not modify:

- 일반 몬스터나 boss 내부 AI executor
- reward amount/drop rarity
- bitmap 픽셀에서 collision을 자동 추론해 권위로 사용

Inputs/interfaces:

- map layers, world/camera bounds와 platform surfaces
- enemy archetype budget와 spawn zone
- boss arena/safe recovery point
- stage/difficulty/content version

Required checks:

- spawn이 platform 내부, 절벽, boss gate 또는 camera 밖에 생기지 않는다.
- 각 encounter에 진입/퇴로, 최소 회피 공간과 projectile 안전 여백이 있다.
- 몬스터 조합의 근접/원거리/제어 역할과 최대 동시 개체 수를 제한한다.
- checkpoint/restart에서 중복 spawn과 listener 누수가 없다.
- debug overlay와 deterministic seed smoke가 통과한다.

Return: stage map, encounter table, screenshots/overlays, performance count,
tests and unresolved art/AI dependencies.

## Stage-specific combat production

- Each stage has a distinct boss profile and normal-monster encounter
  signature. A modulo deck, shared unordered pattern list or stage-number speed
  multiplier fails review.
- Normal-monster placement follows Teach → Test → Combine and keeps a readable
  global hazard budget. Later stages add reasoning layers instead of dozens of
  additional enemies.
- Validation checks spawn-slot containment, edge padding, reveal range,
  boss-gate ordering, maximum alive count, deterministic seed and cleanup of
  timers, projectiles, hazards, tweens and listeners.
- Content links boss actor, minion actor, skill atlas, telegraph, active,
  impact, reduced-motion and audio presentation IDs. Shared placeholders are
  allowed only while their incomplete status is explicit.
