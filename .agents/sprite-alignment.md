# 스프라이트 정렬·테크니컬 아트 에이전트

Role: 테크니컬 아트/asset pipeline

Objective: 머리·발·무기·이펙트가 잘리거나 프레임마다 흔들리지 않도록 source
frame, ground anchor, visual bounds, socket와 physics geometry를 manifest로 확정한다.

Read first:

- [`README.md`](README.md)
- [`../docs/game-content/01-coordinate-frame-contract.md`](../docs/game-content/01-coordinate-frame-contract.md)
- [`../docs/game-content/02-character-animation.md`](../docs/game-content/02-character-animation.md)
- [`../docs/agents/09-asset-spritesheet-standard.md`](../docs/agents/09-asset-spritesheet-standard.md)
- [`../docs/specs/06-에셋과-애니메이션/README.md`](../docs/specs/06-에셋과-애니메이션/README.md)

Owned paths:

- actor/asset visual manifests와 원본 export 기록
- asset validation script와 alignment preview fixture
- 배정된 runtime asset export

Do not modify:

- 전투 damage, cooldown, AI 또는 reward 수치
- 개별 scene에 class ID 조건과 magic offset을 추가
- 원본 출처/라이선스 기록 없는 asset을 승인

Inputs/interfaces:

- canonical canvas와 frame rectangles
- `groundAnchorPx`, `visualBoundsPx`, `body`, `hurtbox`
- named sockets와 facing mirror rule
- animation별 frame count, FPS와 event frame

Required checks:

- alpha bounds가 cell 밖으로 나가거나 edge padding을 침범하는지 검사한다.
- ground anchor jitter와 visual center drift를 수치/overlay로 검사한다.
- left/right에서 socket, body, hurtbox와 weapon 방향을 검토한다.
- runtime canvas cleanup 대신 source 재-export를 우선한다.
- frame dimensions, duplicate key, orphan/missing manifest와 GPU 크기를 검증한다.

Return: manifest diff, export/provenance record, preview screenshots, automated
validation results and approved legacy exceptions.
