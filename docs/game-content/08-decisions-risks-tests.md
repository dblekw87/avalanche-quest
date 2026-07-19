# 게임 콘텐츠 결정, 위험과 테스트

상태: **진행 중 결정 레지스터**

## 확정 결정

| ID | 결정 |
| --- | --- |
| GCP-001 | actor world position은 ground anchor다. |
| GCP-002 | action 전환마다 origin/body offset으로 baseline을 보정하지 않는다. |
| GCP-003 | VFX와 강화 particle은 named socket을 사용한다. |
| GCP-004 | 스킬 icon은 canonical square/safe-area/optical-center 계약을 사용한다. |
| GCP-005 | 일반 몬스터 상위 난이도는 속도보다 1~3개 pattern과 조합에서 나온다. |
| GCP-006 | boss 평상시 이동은 느리고 예측 가능하다. |
| GCP-007 | timer 기반 반복 자동 점프를 raid 난이도로 사용하지 않는다. |
| GCP-008 | boss phase별 목표 12~15 named pattern entry를 둔다. |
| GCP-009 | 속도/탄속/projectile 수만 바꾼 것은 새 pattern으로 세지 않는다. |
| GCP-010 | 모든 치명적 pattern은 telegraph, reachable safe zone과 recovery를 가진다. |
| GCP-011 | 새 콘텐츠를 `QuestScene` ID 조건 분기로 추가하지 않는다. |
| GCP-012 | source/provenance와 independent visual QA가 없는 asset은 완료가 아니다. |
| GCP-013 | 각 보스의 phase deck은 stage namespace와 수치 제거 후에도 다른 executor/decision/geometry fingerprint를 가져야 한다. |
| GCP-014 | stages 1–40은 Veteran(+2) → Master(+4) → Hard(+5) → Extreme(+6) → Cataclysm(+7) progression target을 사용한다. |

## 구현 전 필수 결정

| ID | 미정 | 필요한 증거 |
| --- | --- | --- |
| GCP-O01 | canonical actor frame size/scale tiers | class contact sheet |
| GCP-O02 | alpha/ground/center 허용 오차 | validator sample |
| GCP-O03 | 최소 device와 texture/frame budget | benchmark |
| GCP-O04 | boss phase 수와 목표 clear time | raid prototype |
| GCP-O05 | 한 phase에서 실제 실행할 deck 길이 | combat pacing test |
| GCP-O06 | reference class/stage/boss | user/content priority |
| GCP-O07 | skill icon frame/mask variants | UI contact sheet |
| GCP-O08 | legacy asset 재-export 또는 교체 범위 | source inventory |
| GCP-O09 | 일반 몬스터 동시 telegraph budget | encounter test |
| GCP-O10 | pattern별 최소 reaction/recovery 시간 | player-speed simulation |

## 주요 위험

| 위험 | 영향 | 완화 |
| --- | --- | --- |
| phase별 12–15 entry의 콘텐츠 폭증 | 품질 저하/일정 지연 | reference boss 먼저, mechanic library와 gate |
| pattern 이름만 다르고 탄막은 동일 | 학습 재미 없음 | distinct mechanic family/decision review |
| runtime offset 예외 재증가 | 정렬 회귀 | manifest validator와 legacy expiry |
| per-frame body 이동 | platform 떨림/낙하 | ground anchor 고정, body profile 제한 |
| VFX가 safe zone을 가림 | 불공정 damage | depth/noise budget와 reduced variant |
| 아이콘 투명 여백 불일치 | UI 비정렬 | source crop, optical-center contact sheet |
| 고해상도 asset 과다 | GPU memory/frame 저하 | decoded budget, lazy load와 atlas split |
| 몬스터 pattern 동시 발동 | 회피 불가능 | cadence/overlap scheduler |
| boss jump/teleport arena 탈출 | soft lock/off-screen attack | destination validation/recovery point |
| random deck 불가능 조합 | 공정성 상실 | deterministic constrained scheduler |
| 구조/밸런스 동시 변경 | 회귀 원인 불명 | 별도 task/commit과 recorded baseline |

## 역할과 산출물

| 역할 | 필수 산출물 |
| --- | --- |
| 콘텐츠 리드 | task brief, ID/interface와 acceptance |
| 테크니컬 아트 | manifest, source/export와 alignment preview |
| 캐릭터 | animation/state/socket integration |
| 스테이지 | map/collision/encounter definition |
| 일반 몬스터 | archetype/pattern controller와 tests |
| 보스 | phase deck, movement/pattern controller와 reachability |
| 스킬/VFX | presentation, icon, pool/cap와 cleanup |
| 시각 QA | screenshots, overlay, performance와 finding |

## 테스트 매트릭스

| 계층 | 필수 테스트 |
| --- | --- |
| Asset validator | dimensions, frame, alpha edge, anchor, socket, icon safe area |
| Character | action transition, facing, ground jitter, body stability |
| Skill | socket spawn, follow/detach, timing, hit/VFX separation |
| Enhancement | class별 aura/glint 위치, toggle, reduced motion |
| Icon UI | Skill Shop/HUD/loadout/advancement × 48/56/80px |
| Enemy | state, 1–3 patterns, cadence, death/cleanup |
| Boss | phase × 12–15 entries, safe zone, overlap, jump/teleport recovery |
| Stage | collision, spawn, camera, checkpoint, boss arena |
| Performance | worst-case raid VFX, decoded memory, restart leak |
| Visual E2E | one class + one encounter + one raid boss deterministic run |

## raid pattern review 질문

- speed와 projectile 수를 제거해도 이 pattern의 규칙이 남는가?
- 처음 본 유저가 실패 원인을 이해할 수 있는가?
- 두 번째 시도에서 학습으로 더 잘할 수 있는가?
- 최소 이동 build도 telegraph 후 안전지대에 도달할 수 있는가?
- 공격할 recovery window가 있는가?
- 다른 pattern과 겹쳐도 모순되는 행동을 요구하지 않는가?

하나라도 답이 아니면 high difficulty가 아니라 불공정 또는 미완성 pattern으로 본다.

## Forty-stage automated gates

- 정확히 40개의 ordered stage/boss/enemy profile
- stage 1–30 three phases, 31–40 four phases
- phase마다 12–15 unique named entries
- stage namespace, timing, speed, health, projectile count와 tint를 제거한
  boss mechanical fingerprint 40개가 모두 unique
- numeric tuning과 tint를 제거한 boss/enemy canonical fingerprint 중복 0
- boss ordinary movement 70–105, hostile projectile 250 이하
- telegraph 700 ms 이상, dangerous recovery 500 ms 이상
- enemy signature/presentation/encounter seeds 전부 unique
- current-stage-only boss asset loading
- boss-specific projectile가 실제 boss executor에서 사용됨
- 장착 NFT의 attack, HP, defense, cooldown, movement가 모든 playable class의
  공통 계산 경로를 통과함

Stages 1–40의 boss 및 normal-monster projectile/VFX는 서로 다른 hash와
transparent frame edge를 가진다. Stages 31–40 final boss와 normal monster
actor는 stage-specific sheet를 사용한다. Guardian/herald actor animation은
shared지만 projectile presentation은 stage-specific이다.
