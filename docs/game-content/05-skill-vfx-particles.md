# 스킬 VFX와 파티클

상태: **설계 기준선**

## 공통 presentation 계층

캐릭터, 일반 몬스터와 보스는 같은 presentation 계약을 사용한다.

```text
anticipation
→ cast
→ travel
→ impact
→ sustain
→ dissipate
```

모든 skill이 모든 단계를 가질 필요는 없지만 생략 여부를 선언한다.

```ts
type SkillPresentation = Readonly<{
  id: string;
  version: number;
  castAnimationId: string;
  phases: readonly VfxPhaseDefinition[];
  audioEventIds: readonly string[];
  cameraRequestId?: string;
  reducedMotionVariantId?: string;
}>;
```

## 스킬 아이콘 계약

Skill Shop, HUD, loadout과 전직 화면은 같은 `SkillIcon` manifest와 공용 UI
component를 사용한다.

아이콘 export:

- canonical square canvas, 권장 `256×256`
- transparent background 또는 명시된 baked frame
- 핵심 silhouette가 중앙 safe area 안에 위치
- glow와 weapon tip이 canvas edge에서 잘리지 않음
- 모든 icon이 비슷한 optical weight와 padding을 가짐
- alpha bounds와 optical center를 manifest에 기록

개념적 metadata:

```text
iconAssetId
canvasSize
alphaBoundsPx
safeAreaPx
opticalCenterPx
contentScalePermille
maskShape
contentVersion
```

`object-contain`은 투명 여백 내부의 잘못된 중심을 고치지 못한다. source crop과
canonical export를 우선 수정한다. legacy icon에만 manifest optical offset을
허용하고 owner/removal version을 기록한다.

현재처럼 skill slug별 CSS `transform: translate(...)` 예외를 계속 추가하지 않는다.
공용 `SkillIconFrame`은 다음을 책임진다.

- 고정 outer frame과 inner safe area
- 동일한 mask/radius와 overflow 정책
- manifest optical center 적용
- loading/error fallback
- rarity/class border는 content geometry와 분리

같은 icon을 최소 `48`, `56`, `80` CSS pixel과 고DPI에서 screenshot 비교한다.

## VFX phase

각 phase는 다음을 선언한다.

- texture/animation key
- spawn event와 named socket
- follow caster/target/world 또는 detach 정책
- facing mirror/rotation
- origin, scale와 visual bounds
- depth layer와 blend mode
- duration/lifetime
- pool ID와 최대 동시 수
- tint/color와 accessibility variant

world 좌표 `player.x + 70`, `player.y - 8` 같은 magic number를 skill/class branch에
반복하지 않는다. 거리와 target point는 gameplay definition, 시작점은 socket,
시각 보정은 presentation data가 소유한다.

## 캐릭터 스킬

- Q/W/E/R/T마다 anticipation과 impact가 실제 hit timing을 이해하게 한다.
- projectile은 `muzzle`, melee trail은 hand/weapon socket을 사용한다.
- 이동 skill은 actor movement와 trail을 같은 clock으로 동기화한다.
- ultimate가 boss telegraph를 가리거나 control을 과도하게 잠그지 않는다.
- 전직 skill은 기존 presentation 교체/확장 관계를 stable ID로 선언한다.

## 일반 몬스터 스킬

- 작은 silhouette에서도 windup을 식별할 수 있어야 한다.
- 동일 encounter의 적은 telegraph color/shape가 충돌하지 않게 한다.
- support/channel/interrupt 상태가 장식 VFX와 구별된다.
- 여러 적 particle이 boss/terrain warning보다 높은 depth를 차지하지 않는다.

## 보스 스킬

- pattern telegraph가 damage VFX보다 먼저 명확히 보인다.
- 안전지대와 실제 hitbox가 일치한다.
- phase별 색 변화만으로 새 pattern을 구분하지 않는다.
- raid mechanic의 핵심 표식은 reduced-motion에서도 유지한다.
- camera shake/flash 없이도 pattern을 이해할 수 있어야 한다.

## 강화 파티클

강화 VFX는 actor manifest socket을 사용한다.

```text
weapon glint → weapon/hand socket
armor glint  → armor surface socket set
body aura    → aura-center
foot motes   → ground/foot sockets
class rune   → world position derived from ground
```

class별 `getCenter()` Y 예외를 금지한다. aura display 크기는 actor visual bounds에
맞춰 계산하고 최대/최소을 clamp한다.

## 고품질 기준

- alpha edge, premultiplication halo와 opaque background가 없다.
- anticipation/impact silhouette가 읽히며 장식 particle이 핵심 shape를 가리지 않는다.
- frame 간 중심과 scale이 튀지 않는다.
- source art, AI prompt/tool, ownership/license와 export version을 기록한다.
- icon, cast, projectile와 impact가 같은 skill art direction을 공유한다.
- 고해상도는 큰 파일을 뜻하지 않으며 decoded memory와 frame time을 통과해야 한다.

## pooling과 cleanup

- projectile, impact, sustain, aura별 pool/cap
- per-target/per-cast hit dedupe
- off-screen/lifetime cleanup
- interrupt/death/phase end/shutdown cleanup
- scene restart에서 emitter/listener 중복 없음

## 접근성

- reduced motion에서 screen shake, flash와 particle count를 줄인다.
- 빠른 고대비 깜빡임을 제한한다.
- 색상 외 shape/outline로 위험 종류를 구분한다.
- 장비 강화 particle을 끄더라도 combat telegraph는 사라지지 않는다.
