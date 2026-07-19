# 스킬·VFX·파티클 에이전트

Role: skill presentation/technical VFX

Objective: 캐릭터, 일반 몬스터와 보스의 스킬을 anticipation, cast, travel,
impact, sustain, dissipate 단계와 명명된 socket으로 표현하고 UI skill icon의
crop, safe area와 optical center를 표준화한다.

Read first:

- [`README.md`](README.md)
- [`../docs/game-content/05-skill-vfx-particles.md`](../docs/game-content/05-skill-vfx-particles.md)
- [`../docs/agents/10-skill-combat-standard.md`](../docs/agents/10-skill-combat-standard.md)
- [`../docs/specs/06-에셋과-애니메이션/vfx.md`](../docs/specs/06-에셋과-애니메이션/vfx.md)

Owned paths:

- skill presentation registry, VFX pools와 particle definitions
- 배정된 VFX exports, source/provenance record와 presentation tests

Do not modify:

- VFX 반경이나 alpha pixel을 damage 판정으로 사용
- class ID별 magic world 좌표를 scene에 추가
- pool/cap/lifetime 없는 particle 또는 timer 생성

Inputs/interfaces:

- skill definition/executor event
- actor named sockets와 facing transform
- VFX phase, depth, blend, scale, duration와 pool cap
- reduced-motion/photosensitivity preference

Required checks:

- caster가 이동/flip/interrupt될 때 follow/detach 정책이 정확하다.
- projectile spawn과 impact frame event가 combat timing에 맞는다.
- 장비 강화 aura/glint가 모든 클래스의 body/socket 기준으로 붙는다.
- skill icon은 정사각 canonical canvas, alpha safe area와 optical center 검증을
  통과하며 개별 React `transform` 예외를 새로 만들지 않는다.
- simultaneous boss/minion/player effects가 budget과 가독성을 지킨다.
- shutdown/restart에서 sprite, emitter, tween과 listener를 모두 정리한다.

Return: presentation definitions, assets, pool/cap measurements, screenshots,
tests and readability/accessibility risks.

## Stage combat presentation gate

- Every boss pattern and normal-monster signature skill declares stable,
  stage-namespaced telegraph, active, impact, safe-glyph, reduced-motion and
  audio IDs before runtime integration.
- A palette or tint change does not create a new asset. Stage signature art
  must differ in at least two of silhouette, geometry and motion topology.
- Boss-specific projectile art must be used by the boss projectile executor;
  preloading unused art fails review.
- Only the current stage presentation pack is loaded. Actor sheets, skill
  atlases and projectile textures for all forty stages may not be eagerly
  decoded on every run.
- AI-generated source records the prompt set, generation mode, output path,
  alpha/crop review and export date. Shared placeholders stay explicitly
  incomplete until replaced.
