# 스테이지 맵과 Encounter

상태: **설계 기준선**

## stage definition 분리

현재처럼 map과 monster 개별 좌표를 한 생성 함수에서 함께 만들기보다 다음을
분리한다.

```text
StageCatalogEntry
├─ presentation/map manifest
├─ collision/navigation definition
├─ encounter sequence
├─ boss arena definition
├─ difficulty version
└─ reward table reference (server only)
```

Phaser stage definition에는 reward amount, NFT rarity 또는 mint 권한이 들어가지 않는다.

## map manifest

- background, midground, gameplay, foreground layer
- world/camera bounds
- platform/collision surface
- one-way/drop-through 여부
- foreground occlusion zone
- parallax와 depth
- spawn/recovery/checkpoint markers
- boss gate와 arena bounds
- original/licensed source record
- texture dimensions와 memory budget

보이는 platform 상단과 collision surface가 일치해야 한다. 이미지 origin 배열로
표면을 수동 보정하는 대신 map manifest에서 surface anchor를 선언하고 preview에서
검증한다.

## encounter sequence

```text
entry
→ teach encounter
→ variation encounter
→ combined encounter
→ recovery/checkpoint
→ elite or boss gate
→ raid boss
```

각 encounter는 다음을 가진다.

- spawn zone와 activation trigger
- enemy archetype IDs와 최대 동시 수
- pattern cadence/overlap budget
- clear rule와 gate
- respawn/restart policy
- camera/arena requirements

## 일반 몬스터 배치

- platform edge, collision 내부, camera 밖과 boss gate 뒤에 spawn하지 않는다.
- 근접/원거리/지원 역할을 무작위로 과밀 배치하지 않는다.
- 첫 등장에서는 새 archetype의 pattern을 단독으로 보여준다.
- 이후 stage에서 이미 배운 archetype을 다른 지형/조합으로 재사용한다.
- 상위 stage는 속도 배수 대신 조합과 공간 선택으로 난이도를 높인다.
- 같은 cadence의 telegraph가 겹쳐 하나처럼 보이지 않게 한다.

## 40 stage 진행

| 구간 | encounter 학습 |
| --- | --- |
| 1–10 | archetype 단독 소개와 넓은 arena |
| 11–20 | 두 역할 조합과 vertical platform |
| 21–30 | support/interrupt와 제한된 overlap |
| 31–40 | learned mechanic 조합, named elite와 raid gate |

각 stage가 완전히 새로운 monster를 요구하지 않는다. 검증된 archetype과 pattern
library를 재조합하되 skin만 바꿔 같은 공격을 새 콘텐츠로 가장하지 않는다.

## boss arena

- 모든 pattern safe zone을 수용하는 최소 폭/높이
- boss와 player recovery point
- teleport/leap destination marker
- line-of-sight용 pillar 또는 platform topology
- camera bounds와 boss health UI safe area
- projectile/VFX cleanup boundary

arena가 지원하지 않는 pattern은 deck에 들어갈 수 없다.

## map 품질과 고해상도

- gameplay collision layer는 장식 layer와 독립한다.
- foreground가 player, telegraph와 projectile을 가리지 않는다.
- 고해상도 texture 한 장으로 전체 map을 처리하기보다 camera 구간/atlas budget에
  맞춰 나눈다.
- 반복 tile seam, alpha halo, scale blur와 parallax 흔들림을 검토한다.
- DPR과 viewport별 camera framing을 확인한다.

## 검증

- collision/surface/spawn debug overlay screenshot
- player 최소/최대 이동 build의 jump reachability
- enemy와 boss arena containment
- deterministic encounter activation/clear
- checkpoint restart와 duplicate spawn
- max entity/projectile/VFX frame-time
- foreground occlusion과 telegraph visibility

## Forty-stage encounter rule

모든 stage는 `stage-combat-catalog.ts`의 세 encounter를 따른다.

1. Teach: signature를 단독으로 보여주며 max alive 1
2. Test: 방향/위치 변형을 적용하며 max alive 2
3. Combine: 검증된 이전 규칙과 조합하며 max alive 3, stage 31–40만 4

상위 stage의 기존 30–39마리 생성과 300–500 px/s 일반 이동은 제거한다.
현재 생성기는 stage당 5–12마리, patrol 42–67 px/s를 사용하고 진입 구간별
reveal로 동시 활성화를 제한한다. 상세 identity는
[`09-stage-combat-catalog.md`](09-stage-combat-catalog.md)를 따른다.
