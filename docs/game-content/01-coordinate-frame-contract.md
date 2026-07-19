# 좌표와 프레임 계약

상태: **설계 기준선**

## 문제를 만드는 좌표 혼용

다음 좌표는 서로 다른 값이며 하나의 `center`로 대체할 수 없다.

1. source image pixel
2. sprite-sheet cell-local pixel
3. trimmed atlas frame pixel
4. actor ground-anchor local coordinate
5. Phaser display coordinate
6. physics body/hurtbox coordinate
7. world coordinate
8. camera/screen coordinate

`getCenter()`는 표시 사각형의 중앙이지 발, 가슴, 손 또는 무기 socket이 아니다.
캐릭터별 예외 Y값으로 VFX를 붙이면 scale, action과 trim이 달라질 때 다시 어긋난다.

## canonical actor frame

새 actor export는 다음을 지킨다.

- 한 actor의 action은 canonical cell size를 공유한다.
- 모든 grounded frame의 ground contact가 같은 `groundAnchorPx`에 놓인다.
- 머리, 무기, 꼬리와 glow가 cell edge safe padding을 침범하지 않는다.
- source facing은 하나로 고정하고 mirror 불가 요소만 별도 sheet로 선언한다.
- 투명 alpha bounds가 frame별로 크게 튀지 않는다.

Phaser origin:

```text
originX = groundAnchorPx.x / frameWidth
originY = groundAnchorPx.y / frameHeight
```

sprite의 world `(x, y)`는 ground anchor 위치다. animation 변경 시 origin을 다시
바꾸지 않는다.

## actor visual manifest

개념적 타입:

```ts
type PixelPoint = Readonly<{ x: number; y: number }>;
type PixelRect = Readonly<{ x: number; y: number; width: number; height: number }>;

type ActorVisualManifest = Readonly<{
  id: string;
  version: number;
  textureKey: string;
  sourceFacing: 'left' | 'right';
  frameSize: Readonly<{ width: number; height: number }>;
  displayScalePermille: number;
  groundAnchorPx: PixelPoint;
  visualBoundsPx: PixelRect;
  bodyPx: PixelRect;
  hurtboxesPx: readonly PixelRect[];
  sockets: Readonly<Record<SocketId, PixelPoint>>;
  animations: readonly ActorAnimationManifest[];
  source: Readonly<{
    owner: string;
    license: string;
    record: string;
    exportedAt: string;
  }>;
}>;
```

실제 타입은 closed union과 runtime schema를 사용하고 `any`를 허용하지 않는다.

## named sockets

최소 socket:

- `ground`
- `center`
- `head`
- `chest`
- `left-hand`
- `right-hand`
- `weapon-tip`
- `muzzle`
- `cast-origin`
- `aura-center`
- `foot-left`
- `foot-right`

모든 actor가 모든 socket을 가질 필요는 없지만 skill/presentation이 요구하는
socket이 없으면 load validation이 실패하거나 명시적 fallback을 사용한다.

frame별 손/무기 위치가 크게 움직이는 animation은 socket keyframe을 선언한다.
ground anchor와 physics body는 frame별 socket 움직임 때문에 바뀌지 않는다.

## facing transform

source가 오른쪽을 향하고 ground anchor가 `(gx, gy)`일 때:

```text
right localX = socket.x - gx
left localX  = -(socket.x - gx)
localY       = socket.y - gy

worldX = actor.x + localX * displayScale
worldY = actor.y + localY * displayScale
```

asymmetric sprite, 글자, 방패 손과 조명은 단순 `flipX`가 가능한지 manifest에
선언한다. physics body는 facing에 따라 임의로 다른 크기가 되지 않는다.

## body, hurtbox와 hitbox

- body: platform/collision movement용이며 locomotion 중 안정적
- hurtbox: 피해 받을 수 있는 actor 영역
- attack hitbox: skill definition이 생성하는 순간/지속 영역
- VFX bounds: 표시 영역이며 판정이 아님

공격 animation 때문에 몸을 숙이는 경우 hurtbox profile을 명시적으로 바꿀 수
있지만 frame alpha bounds에서 자동 추론하지 않는다.

## legacy 보정

기존 asset의 재-export가 즉시 불가능하면 다음을 manifest에 제한적으로 허용한다.

```text
legacySourceRect
legacyVisualOffsetPx
legacySocketOverrides
reason
owner
removeByContentVersion
```

scene 코드의 `if (characterId)` offset, runtime `clearRect`, 임시 texture copy는 새로
추가하지 않는다. 기존 예외는 한 클래스씩 source export로 제거한다.

## 자동 검증

- image dimensions와 declared cell divisibility
- frame count/row/column bounds
- alpha bounds와 edge safe padding
- grounded frame의 ground-contact jitter
- visual center drift
- socket/frame bounds와 mirror result
- body/hurtbox가 frame cell 안에 있는지
- duplicate texture/animation key와 orphan asset
- compressed/decoded size

threshold는 preview fixture에서 확정하고 예외는 owner와 만료 version을 가진다.
