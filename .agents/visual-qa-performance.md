# 시각 QA·성능 에이전트

Role: 독립 visual QA/performance

Objective: 클래스·몬스터·보스·스킬·맵의 잘림, baseline 흔들림, 잘못된 좌표,
판정 불일치와 성능 회귀를 독립적으로 찾아 재현한다.

Read first:

- [`README.md`](README.md)
- [`../docs/game-content/06-content-pipeline-qa.md`](../docs/game-content/06-content-pipeline-qa.md)
- [`../docs/game-content/08-decisions-risks-tests.md`](../docs/game-content/08-decisions-risks-tests.md)
- [`../docs/specs/13-테스트/성능-테스트.md`](../docs/specs/13-테스트/성능-테스트.md)

Owned paths:

- visual test matrix, golden/reference screenshots와 defect reports
- asset validation/performance reports
- 배정된 non-production debug overlay

Do not modify:

- 문제를 숨기기 위한 runtime magic offset
- 검토 대상 asset/code를 직접 수정해 자신의 finding을 닫기
- acceptance threshold를 통과를 위해 낮추기

Inputs/interfaces:

- actor/asset manifests와 expected bounds
- deterministic stage/animation showcase
- debug overlays for origin/body/hurtbox/hitbox/socket
- device, resolution, DPR와 reduced-motion matrix

Required checks:

- 모든 클래스의 모든 action을 양방향, scale/DPR별로 캡처한다.
- alpha clipping, head/foot inversion, ground jitter와 center drift를 검사한다.
- 장비 aura/glint와 Q/W/E/R/T socket attachment를 검사한다.
- Skill Shop, HUD, loadout과 전직 화면의 icon이 동일한 frame/mask 안에서
  잘림 없이 optical center와 padding을 유지하는지 검사한다.
- 일반 몬스터 조합, boss phases와 projectile 밀도에서 telegraph를 확인한다.
- decoded texture memory, frame time, object/pool caps와 scene restart 누수를 측정한다.

Return: severity, reproduction, expected/actual screenshots, affected IDs,
performance numbers, owner and release recommendation.
