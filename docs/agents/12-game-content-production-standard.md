# Game Content Production Standard

이 문서는 캐릭터, 일반 몬스터, 보스, 스테이지, 스킬과 VFX를 추가할 때 적용하는
교차 도메인 제작 계약이다. 상세 설계는
[`docs/game-content/README.md`](../game-content/README.md)를 따른다.

## 핵심 원칙

- 런타임 magic offset보다 source export와 typed visual manifest를 먼저 고친다.
- actor의 world position은 지면 접점이며, 표시 중심과 physics center를 혼용하지 않는다.
- body, hurtbox, hitbox와 VFX 크기는 서로 독립된 data다.
- 캐릭터·적·보스·스킬 asset은 stable ID, version, 출처와 manifest owner를 가진다.
- animation frame은 presentation timing이며 damage authority가 아니다.
- 새 콘텐츠를 `QuestScene`의 class/stage/entity ID 조건 분기로 추가하지 않는다.

## 좌표 계약

모든 actor visual은 다음을 선언한다.

```text
frame/cell rectangle
groundAnchorPx
visualBoundsPx
body and hurtbox
named sockets
source facing and mirror rule
display scale
animation events
```

Phaser origin은 `groundAnchorPx / frame dimensions`에서 계산한다. action 전환마다
physics body offset을 옮겨 baseline을 맞추지 않는다. legacy asset에 필요한 보정은
manifest의 명시적 migration field와 만료 조건으로 관리한다.

## 레이드 난이도 원칙

- 이동속도, 탄속, projectile 수와 무작위 점프만 올리는 것은 새 pattern이 아니다.
- boss는 평상시 느리고 예측 가능하게 움직인다.
- 빠른 이동과 도약은 named pattern의 telegraph, active, safe zone과 recovery가
  있을 때만 사용한다.
- 각 boss phase는 목표 12~15개의 named pattern entry를 가진다.
- 각 pattern은 대응법, arena 요구, 실패 조건과 overlap tag를 선언한다.
- 첫 cycle은 규칙을 단독으로 가르치고 이후 cycle/phase에서 학습한 규칙을 조합한다.
- 모든 치명적 pattern에는 실제로 도달 가능한 안전지대와 reaction budget이 있다.

## 일반 몬스터 원칙

- 각 archetype은 최소 1개, 상위 tier는 2~3개의 작은 named pattern을 가진다.
- 상위 stage는 속도보다 archetype 조합, pattern 순서와 공간 제약으로 어려워진다.
- 일반 몬스터 overlap은 player가 동시에 읽을 수 있는 telegraph budget을 넘지 않는다.

## 품질 gate

- 모든 frame의 alpha bounds, ground jitter, center drift와 edge clipping을 검사한다.
- 모든 actor/action을 양방향으로 재생하고 body/hurtbox/socket overlay를 확인한다.
- 장비 강화 aura와 skill VFX는 named socket을 사용한다.
- boss/minion/player effect 동시 실행에서 telegraph가 가려지지 않아야 한다.
- pool, lifetime, decoded texture memory와 scene restart cleanup을 검증한다.
- 원본/AI 생성 prompt, 제작 도구, license/ownership과 export date를 기록한다.

## 구현 순서

1. manifest schema와 validation 도구
2. alignment preview/debug scene
3. 한 클래스 vertical slice
4. 한 일반 몬스터 archetype과 한 reference raid boss
5. 한 stage encounter
6. 시각 QA와 성능 gate
7. 검증된 template로 나머지 콘텐츠 확장

구조 extraction과 대규모 balance 변경을 같은 작업에 섞지 않는다.

## 40-stage uniqueness contract

- `StageId` forty entries map one-to-one to forty boss profiles and forty
  normal-monster encounter profiles.
- 모든 보스는 서로 다른 실제 phase deck을 가진다. Namespace, 이름, timing,
  speed, health, projectile count와 tint를 제거한 executor/decision/geometry
  fingerprint도 40개 모두 달라야 하며, 공통 deck의 이름만 바꾼 복제를 금지한다.
- Stages 1–30 have three boss phases; stages 31–40 have four. Every phase has
  12–15 named entries and every boss uses at least eight decision families.
- Every normal-monster profile owns one signature mechanic taught through
  Teach → Test → Combine encounters.
- Canonical fingerprints remove timing, speed, health, projectile count, scale
  and tint before comparison. Any remaining duplicate boss or enemy signature
  fails content validation.
- Ordinary boss movement remains 70–105 px/s, normal projectiles remain at or
  below 250 px/s, dangerous telegraphs are at least 700 ms, and no stage/HP
  speed multiplier or timer-driven automatic jump is permitted.
- Every signature owns presentation IDs. Cross-stage signature art cannot
  reuse the same file hash or differ by tint only.
- Current-stage-only loading, projectile pool/lifetime, phase/death/shutdown
  cancellation and safe-zone reachability are required release gates.

The runtime source of truth is
[`src/game/content/stage-combat-catalog.ts`](../../src/game/content/stage-combat-catalog.ts);
the human review matrix is
[`docs/game-content/09-stage-combat-catalog.md`](../game-content/09-stage-combat-catalog.md).
