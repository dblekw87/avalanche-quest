# NFT 진행 시스템 구현 로드맵

상태: **제안 / 순서 기준선**

각 phase는 저장소를 실행 가능한 상태로 남기며, 서로 다른 balance 변경과 구조
리팩터링을 한 작업에 섞지 않는다.

## Phase 0 — 결정 잠금

Deliverables:

- [08-decisions-risks-tests.md](08-decisions-risks-tests.md)의 필수 미정 항목 확정
- 장비/class/material stable ID registry
- V1 유지 또는 testnet reset에 대한 사람 결정
- role graph와 Fuji migration ADR

Exit:

- 3슬롯, hold-to-use class와 같은 token 전직 의미가 승인된다.
- rarity/affix 범위와 cap이 fixture로 표현된다.
- contract action과 서버 권위가 충돌하지 않는다.

## Phase 1 — Typed catalog와 순수 resolver

예상 영역:

- `src/game/config`의 versioned stats/class/skill catalog
- `src/game/systems`의 순수 modifier resolver
- shared serializable progression types
- boundary unit tests

Exit:

- `any` 없이 legacy item과 V2 definition을 해석한다.
- modifier 순서, cap, rounding과 invalid version 테스트가 통과한다.
- Phaser는 wallet, ABI, metadata 또는 DB를 import하지 않는다.

## Phase 2 — 서버 loadout과 attempt snapshot

Deliverables:

- forward DB migration, constraints와 RLS
- equipment/class/skill loadout API
- batched ownership validation
- immutable attempt snapshot/hash
- stale transfer/listing 처리

Exit:

- 소유하지 않은 token, 중복 slot, 6번째 skill과 unsupported version을 거부한다.
- 두 동시 attempt 또는 저장 race가 entitlement를 복제하지 못한다.
- snapshot 기반 game start와 verifier가 같은 version을 사용한다.

## Phase 3 — 장비 UI vertical slice

Deliverables:

- Inventory의 durable trait 표시
- 3슬롯 loadout과 stat comparison
- stage preflight
- legacy `GameItem` adapter

Exit:

- 현재 V1 NFT 한 개를 장착해 local stage modifier를 적용할 수 있다.
- 판매/전송 후 다음 attempt에서 자동 거부되고 복구 UI가 보인다.
- empty/loading/stale/error와 접근성 검사가 통과한다.

이 phase는 새 컨트랙트 없이도 서버/game 경계를 먼저 검증할 수 있다.

## Phase 4 — V2 컨트랙트와 local E2E

Deliverables:

- `EquipmentNFTV2`
- `ProgressionMaterial`
- `ProgressionController`의 equipment/material action
- `CollectionMarketplaceV2` equipment listing
- adversarial tests와 deployment simulation

Exit:

- server-selected V2 equipment claim이 한 번만 mint된다.
- salvage가 NFT 소각과 material 발행을 원자적으로 처리한다.
- fake collection, replay와 malicious receiver/token 테스트가 통과한다.
- 독립 보안 검토에서 High 이상 finding이 없다.

## Phase 5 — Class NFT와 선택

Deliverables:

- `ClassNFT` mint와 ownership entitlement
- starter class fallback
- class inventory/selection과 Q/W/E/R/T loadout
- marketplace class listing과 판매 경고

Exit:

- NFT 소유/판매가 다음 attempt의 class 사용 가능 여부에 반영된다.
- wallet mastery와 skill loadout은 판매 후에도 보존된다.
- advanced token entitlement 규칙을 resolver가 테스트한다.

## Phase 6 — 전직

Deliverables:

- class mastery와 boss/stage requirement
- advancement claim, material recipe와 same-token evolution
- 전직 UI와 metadata refresh
- 전직 스킬 upgrade/replace

Exit:

- rank skip, wrong owner/path, expired/replayed claim이 실패한다.
- material burn과 class evolution이 하나의 transaction으로 성공/실패한다.
- Q/W/E/R/T 최대 5슬롯이 keyboard/mobile에서 동일하게 동작한다.

## Phase 7 — 경제 튜닝과 Fuji 준비

Deliverables:

- 40 stage drop table, pity와 supply dashboard
- V1 signer containment/runbook
- chain registry/ABI/indexer 병렬 version
- Fuji approval packet과 smoke plan

Exit:

- 발행/소각과 class 선택 지표를 test fixture로 검토한다.
- compile, contract tests, lint, typecheck, build와 E2E가 통과한다.
- 배포 주소, signer, admin, pauser와 rollback/containment가 기록된다.
- 사람이 Fuji 배포를 명시적으로 승인한다.

## 작업 분리 원칙

- Phase 1 resolver 작성과 전투 밸런스 변경을 별도 commit/task로 나눈다.
- contract 작성자와 보안 reviewer를 분리한다.
- ABI 변경은 frontend/server/indexer fixture를 함께 갱신한다.
- 적용된 migration과 생성 ABI를 손으로 고치지 않는다.
- NFT 진행 구현 중 보스 패턴/에셋 리팩터링을 같은 change에 섞지 않는다.
