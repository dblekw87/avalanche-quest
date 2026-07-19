# 게임 콘텐츠 파이프라인 이전 로드맵

상태: **제안 / 순서 기준선**

현재 `QuestScene`의 모든 예외를 한 번에 재작성하지 않는다. 한 vertical slice에서
계약과 검증 도구를 증명한 뒤 콘텐츠를 순차 이전한다.

## Phase 0 — 현행 inventory와 결정

Deliverables:

- class/action별 sheet dimensions, baseline 예외와 runtime cleanup 목록
- skill icon transform 예외 목록
- enemy/boss/stage asset 및 pattern inventory
- 최소 기기와 visual quality target
- reference raid boss와 reference stage 선택

Exit:

- asset/content stable ID가 중복되지 않는다.
- source 재-export 가능/불가능 legacy asset이 구분된다.
- raid phase 수, 목표 전투 시간과 12–15 entry 의미가 승인된다.

## Phase 1 — manifest와 validator

Deliverables:

- typed asset/actor/icon/presentation manifest
- runtime schema
- dimension, alpha, anchor, socket와 icon safe-area validator
- manifest-driven asset loader

Exit:

- invalid row/frame, edge clipping과 missing socket fixture가 실패한다.
- query-string cache version 없이 manifest version/key가 asset을 식별한다.
- orphan/duplicate asset report가 생성된다.

## Phase 2 — preview와 debug 도구

Deliverables:

- actor alignment lab
- pattern lab
- icon contact sheet
- stage encounter overlay

Exit:

- code를 수정하지 않고 class/action/facing과 boss pattern을 선택해 검토할 수 있다.
- body/hurtbox/hitbox/socket/safe-zone가 동시에 보인다.
- deterministic screenshot fixture를 재생할 수 있다.

## Phase 3 — 한 클래스 vertical slice

대상은 legacy exception이 대표적인 한 클래스를 선택한다.

Deliverables:

- source 재-export 또는 manifest migration
- animation controller와 socket resolver
- Q/W/E/R/T, 강화 aura/glint와 icon 공통 frame
- alignment/icon regression tests

Exit:

- `QuestScene`의 해당 class baseline/offset/runtime-canvas branch가 제거된다.
- 모든 action/facing에서 ground jitter와 clipping이 없다.
- Skill Shop/HUD icon이 source별 CSS transform 없이 정렬된다.

## Phase 4 — 일반 몬스터와 encounter

Deliverables:

- 3개 대표 archetype
- 각 1~3개 named pattern
- 한 stage의 encounter definition
- cadence/overlap scheduler

Exit:

- stage 난이도가 speed multiplier 없이 pattern 조합으로 증가한다.
- spawn, telegraph, safe path와 cleanup tests가 통과한다.
- 해당 enemy/stage branch가 scene orchestration 밖 registry/controller로 이동한다.

## Phase 5 — reference raid boss

Deliverables:

- actor/boss manifest와 movement state machine
- phase controller
- phase별 목표 12~15 named entry
- safe-zone/reachability와 forbidden-overlap tests
- 고유 animation/VFX/SFX presentation

Exit:

- 자동 점프와 generic stage-number bullet deck에 의존하지 않는다.
- 모든 pattern에 counterplay와 recovery가 있다.
- slow/default/max supported player build로 회피 가능한지 검증한다.
- visual QA와 performance gate가 통과한다.

## Phase 6 — template 확장

- 나머지 클래스는 class별 task로 이전
- monster archetype library 확장
- 40 stage encounter를 학습 순서에 맞춰 이전
- boss는 한 번에 하나씩 reference raid quality gate 적용

40개 boss의 phase별 12~15 entry를 동시에 생산하지 않는다. boss 하나를 완성해
도구, 품질과 전투 시간을 검증한 뒤 재사용 가능한 mechanic library와 고유
presentation으로 확장한다.

## Phase 7 — QuestScene 축소

안전한 추출 순서:

1. asset manifest/loading과 animation registration
2. actor visual/socket resolver
3. VFX/projectile pools
4. character animation controller
5. enemy AI/pattern registry
6. boss phase/pattern controller
7. encounter/spawn controller
8. HUD/presentation adapters

각 추출은 기존 동작의 focused test 또는 의도적으로 승인된 변경을 기록한다.
구조 extraction과 raid balance 변경을 한 diff에 섞지 않는다.

## 공통 완료 gate

```text
manifest validation
asset/source record validation
lint
typecheck
focused game tests
build
deterministic visual screenshots
performance/cleanup report
independent visual QA
```
