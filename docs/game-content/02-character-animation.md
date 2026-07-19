# 캐릭터 애니메이션과 강화 표현

상태: **설계 기준선**

## 클래스 visual profile

각 `CharacterId`는 하나의 visual profile을 가진다.

```text
actorVisualManifestId
animationSetId
skillPresentationSetId
portrait/icon IDs
contentVersion
qualityTier
fallbackPolicy
```

클래스 ID별 scale, baseline, body offset과 asset URL을 `QuestScene`에서 찾지 않는다.
profile과 manifest를 registry에서 resolve한다.

## 필수 animation

| 상태 | 최소 요구 |
| --- | --- |
| idle | 지면 고정, loop |
| walk/run | 발 접점과 stride 안정 |
| jump-start/jump/fall/land | 체공과 착지 분리 |
| dash | 이동 방향과 trail socket |
| attack | windup/hit/recovery event |
| cast | cast/projectile/VFX event |
| hurt | 짧고 death 전환 가능 |
| death | terminal, no loop |
| victory | 선택, gameplay lock 명시 |

전직 class는 기존 animation 재사용 여부와 전직 전용 animation을 명시한다. 없는
animation을 조용히 idle frame으로 바꾸지 않는다.

## animation event

```text
frame/time
event type
payload ID
socket ID
follow or detach policy
```

대표 event:

- `footstep`
- `attack-active`
- `projectile-spawn`
- `vfx-start`
- `sound`
- `camera-request`
- `movement-impulse`

event는 요청이며 `CombatSystem`/`SkillSystem`이 cooldown, state와 hit policy를
검증한다. damage가 bitmap의 특정 frame에만 의존하지 않는다.

## 정중앙과 지면 정렬

“정중앙”은 두 가지를 구분한다.

- gameplay 위치: ground anchor
- 시각적 이펙트 중심: `center` 또는 `aura-center` socket

모든 클래스는 action 전환 중 ground anchor가 고정되어야 한다. aura, shield,
강화 particle과 selection ring은 `getCenter()` 대신 해당 socket을 쓴다.

## 강화 particle

강화 표현은 단계별 profile을 쓴다.

| 단계 | 표현 |
| --- | --- |
| 1 | 낮은 빈도의 armor/weapon glint |
| 2 | 발/몸 주변의 약한 aura |
| 3 | weapon trail 또는 class color motes |
| 4 | 강화된 aura와 제한된 pulse |
| 5 | 희귀한 signature effect, 가독성 상한 유지 |

- aura는 `aura-center`, 발 particle은 `ground/foot`, weapon glint는 weapon socket
  또는 armor surface socket set을 사용한다.
- class별 Y magic number를 금지한다.
- player/boss telegraph보다 높은 시각 우선순위를 갖지 않는다.
- reduced motion과 `equipmentParticlesEnabled`를 존중한다.
- pool/cap/lifetime과 scene shutdown을 명시한다.

## 품질 규칙

- 원본 frame에 머리 위 발, 다른 row 픽셀, matte background와 잘린 glow가 없어야 한다.
- runtime crop/clear로 원본 결함을 숨기지 않는다.
- display scale을 바꿔도 body와 socket 계산은 같은 manifest에서 나온다.
- flip 시 무기 손, projectile 방향과 asymmetric silhouette를 검토한다.
- 스킬 중 actor가 이동하면 VFX의 follow/detach 정책이 일치해야 한다.

## 클래스 완료 체크

- [ ] 모든 필수 action과 fallback이 manifest에 있다.
- [ ] 모든 frame의 alpha bounds와 ground jitter가 통과한다.
- [ ] 양방향 body/hurtbox/socket overlay를 검토했다.
- [ ] Q/W/E/R/T와 강화 particle이 올바른 socket에서 시작한다.
- [ ] interrupt, death, scene restart에서 animation/event가 정리된다.
- [ ] 최소 기기에서 texture/VFX budget을 충족한다.
