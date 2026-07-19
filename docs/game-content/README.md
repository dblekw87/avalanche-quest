# 게임 콘텐츠 제작·레이드 설계

상태: **설계 기준선 / 구현 전**

이 문서는 캐릭터 스프라이트의 잘림과 중심 불일치, 프레임별 발 위치, 강화
파티클 부착, 일반 몬스터/보스의 단순 속도·탄막 패턴, 스테이지 배치와 고품질
에셋 관리를 반복 가능한 제작 파이프라인으로 바꾸기 위한 기준선이다.

## 현재 확인된 구조적 문제

- `QuestScene`이 asset load, frame 추출, 클래스별 baseline, body offset, VFX,
  일반 몬스터 AI와 보스 패턴을 함께 소유한다.
- 일부 클래스는 animation별 baseline 숫자를 코드에서 직접 바꾸고, animation
  전환 때 `setOrigin`과 body offset을 다시 설정한다.
- 특정 클래스는 잘린/넘친 픽셀을 런타임 canvas에서 지우거나 별도 texture로
  복사해 보정한다.
- 강화 particle은 `player.getCenter()`와 클래스별 예외 Y offset에 의존한다.
- Skill Shop은 여러 skill slug별 CSS translate 예외로 icon 중심을 보정한다.
- 일반 몬스터 난이도에 stage별 속도 증가와 공통 projectile pattern이 크게 관여한다.
- 보스는 주기적 자동 점프, 속도 증가와 부채꼴/다방향 탄막 비중이 높다.
- 문서에는 manifest 기준이 있지만 실제 `src/game`에는 중앙 asset manifest와
  자동 frame/alignment validator가 아직 없다.

이 때문에 새 클래스나 에셋을 추가할 때 머리 위에 발이 보이거나, 발이 지면에서
흔들리거나, 공격/강화 이펙트가 몸에서 벗어나는 문제를 개별 숫자로 고치게 된다.

## 목표 구조

```text
source art / generated frames
→ canonical export
→ typed asset + actor manifest
→ automated dimension/alpha/anchor validation
→ alignment preview scene
→ animation/presentation registry
→ gameplay systems consume stable IDs
→ independent visual/performance QA
```

```text
stage definition
├─ map collision and camera
├─ encounter/spawn composition
├─ normal enemy archetype IDs
└─ boss encounter ID

enemy/boss definition
├─ stats and movement bounds
├─ state machine
├─ named pattern deck
├─ skill/presentation IDs
└─ actor visual manifest ID
```

## 레이드 방향

난이도는 빠른 이동과 피하기 어려운 탄막이 아니라 규칙 학습과 판단에서 나온다.

- boss의 평상시 이동은 느리고 예측 가능하다.
- 반복 자동 점프는 제거한다.
- phase별 목표 12~15개의 named pattern entry를 둔다.
- 단순 speed/projectile-count 변형은 pattern 수에 포함하지 않는다.
- 각 pattern은 telegraph, 안전지대, 대응법, 실패 결과와 recovery를 가진다.
- 첫 cycle은 규칙을 가르치고 이후 phase는 이미 본 규칙을 공정하게 조합한다.
- 일반 몬스터도 상위 stage에서 빨라지는 대신 1~3개의 짧은 pattern과 조합 역할을 가진다.

## 문서 지도

| 문서 | 범위 |
| --- | --- |
| [01-coordinate-frame-contract.md](01-coordinate-frame-contract.md) | frame, anchor, socket, body/hitbox 좌표 |
| [02-character-animation.md](02-character-animation.md) | 클래스별 animation과 강화 VFX |
| [03-enemy-boss-patterns.md](03-enemy-boss-patterns.md) | 일반 몬스터와 raid boss 패턴 |
| [04-stage-encounters.md](04-stage-encounters.md) | map collision, 배치와 encounter |
| [05-skill-vfx-particles.md](05-skill-vfx-particles.md) | 캐릭터/적 skill VFX와 particle |
| [06-content-pipeline-qa.md](06-content-pipeline-qa.md) | 제작, validator, preview와 QA |
| [07-migration-roadmap.md](07-migration-roadmap.md) | `QuestScene`에서 점진적 이전 |
| [08-decisions-risks-tests.md](08-decisions-risks-tests.md) | 결정, 위험, 역할과 테스트 |
| [09-stage-combat-catalog.md](09-stage-combat-catalog.md) | 1–40 boss/minion identity, runtime mechanics와 asset status |
| [10-generated-combat-assets.md](10-generated-combat-assets.md) | AI combat asset prompt set, provenance와 known limitation |

## 작업 우선순위

요청에 따라 NFT 설계가 먼저다. NFT 문서가 기준선으로 확정된 뒤 콘텐츠 구현을
시작하되, NFT 전투 modifier가 이 문서의 stat/skill resolver와 visual socket
계약을 재사용하도록 한다. 두 시스템을 한 change에서 동시에 구현하지 않는다.

## 완료 정의

새 클래스/몬스터/보스/스테이지/스킬 하나는 다음이 모두 있어야 완료다.

- stable IDs와 versioned definitions
- original/licensed source record
- manifest와 automated validation
- 양방향 animation preview
- body/hurtbox/hitbox/socket overlay
- pattern/skill deterministic tests
- VFX pool/cap과 cleanup test
- reference screenshots와 independent visual QA
- lint, typecheck, relevant tests와 build
