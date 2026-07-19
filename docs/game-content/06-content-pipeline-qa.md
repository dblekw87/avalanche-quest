# 콘텐츠 제작 파이프라인과 QA

상태: **설계 기준선**

## 제작 흐름

```text
content brief and stable IDs
→ art direction / pattern design
→ source asset production
→ canonical export
→ manifest authoring
→ automated validation
→ alignment/pattern preview
→ runtime integration
→ independent visual/gameplay QA
→ performance and cleanup gate
```

검증을 통과하지 않은 asset을 scene에서 임시 crop/offset으로 보정해 완료 처리하지 않는다.

## source record

모든 asset에 다음을 기록한다.

- asset ID와 owner
- original/commissioned/generated 여부
- 제작자 또는 사용 도구
- AI 생성이면 prompt/reference와 생성일
- license/ownership statement
- editable source 위치
- export preset/version과 날짜
- human review 결과

저작권이 있는 타 게임 캐릭터, UI, map, logo와 ripped sprite를 사용하지 않는다.

## export preset

actor:

- canonical cell/frame size
- row/action과 column/frame 순서
- alpha/color space
- source facing
- ground anchor와 safe padding

VFX:

- phase, origin, blend와 alpha
- loop 가능 여부
- edge padding과 maximum visual bounds

icon:

- square canvas
- safe area와 optical center
- transparent/baked background 정책
- mask preview sizes

map:

- layer dimensions, compression과 tile/segment
- collision surface/exported marker
- parallax/depth metadata

## automated validator

최소 검사:

- 파일 존재, MIME, dimensions와 maximum texture size
- sheet divisibility, frame count와 frame range
- alpha bounds, edge clipping과 empty/duplicate frame
- ground anchor jitter와 visual center drift
- socket/hitbox bounds
- animation event frame bounds
- icon safe area, optical center와 alpha coverage
- texture/animation/skill/entity ID 중복
- orphan/unreferenced asset
- compressed bytes, decoded memory 추정
- source/provenance record 존재

CI는 invalid asset을 실패시키고 warning exception에는 owner, reason과 만료
content version을 요구한다.

## preview tools

### Actor alignment lab

- 고정 ground line과 center line
- 모든 action 연속 재생
- left/right toggle
- body/hurtbox/hitbox/socket/alpha bounds overlay
- scale, DPR와 background contrast toggle
- 강화 aura와 Q/W/E/R/T attachment preview

### Enemy/boss pattern lab

- arena bounds와 safe-zone overlay
- phase/pattern 직접 선택
- telegraph/active/recovery clock
- player speed profile 선택
- deterministic seed replay
- forbidden overlap과 cleanup counter

### Icon contact sheet

- 모든 skill icon을 동일 frame에 grid 표시
- `48/56/80px`, light/dark background와 mask 비교
- alpha bounds, safe area와 optical center crosshair
- class별 색 frame을 content crop과 분리해 확인

### Stage encounter lab

- collision/platform/spawn/camera overlay
- encounter trigger와 maximum simultaneous actor
- foreground occlusion toggle
- boss arena/pattern compatibility

## independent QA matrix

| 대상 | 최소 축 |
| --- | --- |
| 캐릭터 | class × action × facing × scale/DPR |
| 스킬 | Q/W/E/R/T × phase × interrupt × facing |
| 아이콘 | skill × UI surface × size × theme |
| 일반 몬스터 | archetype × pattern × encounter combination |
| 보스 | phase × 12–15 entries × player speed profile |
| map | viewport × checkpoint × encounter × camera |
| VFX | normal/reduced motion × quality setting × simultaneous load |

## visual defect severity

- Critical: 진행 불가, 화면 전체 가림, photosensitivity 위험
- High: actor/telegraph 잘림, 안전지대와 판정 불일치, 잘못된 row/frame
- Medium: ground jitter, socket drift, icon optical-center 불일치, 명확한 seam
- Low: 작은 색/spacing/particle polish

High 이상은 해당 콘텐츠 release를 차단한다.

## 성능과 정리

정확한 threshold는 최소 기기 측정 후 확정한다.

- decoded texture/GPU memory
- asset request와 load time
- active sprite/projectile/emitter/tween 수
- boss raid worst-case frame time
- garbage collection spike
- scene shutdown/restart 후 남은 object/listener/timer

고해상도 asset은 품질 검토와 별개로 budget을 통과해야 한다. particle을 끄거나
reduced motion을 켜도 gameplay timing과 판정이 바뀌지 않는다.

## QA 인계

```text
Asset/content IDs:
Source/export version:
Manifest version:
Test scene and deterministic seed:
Expected screenshots:
Observed defects:
Performance numbers:
Checks:
Owner and release recommendation:
```
