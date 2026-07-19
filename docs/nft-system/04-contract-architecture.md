# NFT 진행 컨트랙트 아키텍처

상태: **목표 설계 / 미구현**

이 문서는 기존 Fuji 계약을 수정한 것처럼 가정하지 않는다. 현재 계약은
비업그레이드형이므로 새 기능은 새 버전 계약으로 배포하고, 프론트엔드와 서버가
contract version별 adapter를 사용하는 방식으로 이전한다.

## 현재 계약과 제약

| 현재 계약 | 현재 책임 | 확장 제약 |
| --- | --- | --- |
| `GameItem` | 서명 claim으로 ERC-721 장비 mint | 단일 `power`, 자체 signer, pause 없음 |
| `RewardDistributor` | ERC-20 stage reward | item/class/material을 다루지 않음 |
| `ItemMarketplace` | 단일 `GameItem` escrow 거래 | collection 주소가 immutable |
| `SkillShopV2` | AQT로 skill entitlement 구매 | NFT class/전직과 별도 소유권 |
| `CharacterUpgradeV3` | AQT로 wallet stat 강화 | NFT material과 비용 중복 가능 |
| `SkillEnhancementV2` | AQT로 skill level 강화 | class advancement와 중복 가능 |

기존 `GameItem`의 signer를 더 이상 사용하지 않는다고 해서 이미 배포된 bytecode가
사라지지 않는다. 전환 시 signer를 접근 불가능한 별도 주소로 교체하고, 기존
deadline이 남은 claim의 만료를 기다리는 봉쇄 절차가 필요하다.

## 목표 계약 지도

```text
GameToken (existing)
RewardDistributor (existing token reward)

ProgressionController
├─ EquipmentNFTV2
├─ ClassNFT
└─ ProgressionMaterial

CollectionMarketplaceV2
├─ allowlisted EquipmentNFTV2
└─ allowlisted ClassNFT
```

### `EquipmentNFTV2`

- ERC-721, enumerable 의존 여부는 gas/indexer 검토 후 결정
- durable item roll을 packed struct로 저장
- mint와 salvage consume은 `ProgressionController`의 좁은 역할만 허용
- metadata 변경이 필요하면 content hash와 event가 일치해야 함
- 임의 사용자의 unrestricted mint 금지

### `ClassNFT`

- ERC-721 class license
- `classId`, advancement path와 rank를 token별 저장
- 같은 token ID가 정확히 한 rank씩 진화
- controller만 mint/evolve 가능
- token owner가 claimant가 아니거나 escrow 중이면 진화 실패
- 진화 event는 old/new class, rank, path와 content hash를 포함

### `ProgressionMaterial`

- ERC-1155 class shard, essence와 advancement seal
- controller만 stage/crafting 결과를 mint
- controller만 검증된 recipe 안에서 burn
- material ID별 supply cap이 필요하면 배포 전 결정
- 초기 marketplace 거래는 범위 밖

### `ProgressionController`

- action별 EIP-712 claim 검증
- claim/source replay 방지
- equipment mint, class mint, class evolution과 deterministic salvage 조정
- `Pausable`, `ReentrancyGuard`, `AccessControl`
- NFT/재료 계약의 최소 역할만 보유하고 default admin은 보유하지 않음

### `CollectionMarketplaceV2`

- listing에 `collection`, `tokenId`, `seller`, `price`, `status` 저장
- admin allowlist에 등록된 ERC-721만 허용
- AQT 고정가 escrow
- 장비와 클래스 NFT를 구분하지 않고 동일한 settlement 불변조건 적용
- pause 중 새 listing/purchase는 차단하되 안전한 cancel은 허용

## claim 모델

generic `bytes data` 한 개로 모든 행동을 처리하지 않는다. 의미 있는 필드가
누락되지 않도록 action별 typehash를 사용한다.

### Equipment claim

```text
claimId
sourceId
player
definitionId
slot
rarity
stageTier
primaryAffixId
primaryRollBps
secondaryAffixId
secondaryRollBps
balanceVersion
contentHash
nonce
deadline
```

### Class mint claim

```text
claimId
sourceId
player
baseClassId
contentVersion
contentHash
nonce
deadline
```

### Advancement claim

```text
claimId
player
classTokenId
expectedCurrentClassId
expectedRank
nextClassId
nextPathId
nextRank
requirementsHash
materialRecipeId
balanceVersion
contentHash
nonce
deadline
```

서명 domain은 name, version, chain ID와 verifying contract를 포함한다. 한 wallet에
여러 보상이 동시에 발급될 수 있으므로 단순 증가 nonce 하나가 claim 순서를
불필요하게 막지 않도록 unordered nonce bitmap 또는 동등한 used-nonce 구조를
검토한다. `claimId`만 믿지 않고 다음을 함께 소비한다.

```text
usedClaims[claimId]
usedNonces[player][nonce]
usedSourceActions[keccak256(sourceId, actionType)]
```

## 분해

분해 output은 클라이언트 인자가 아니라 equipment rarity/definition과
`salvageVersion`의 온체인 또는 immutable catalog 규칙으로 결정한다.

```text
owner calls controller.salvage(tokenId, expectedOutput)
→ controller verifies owner and supported equipment contract
→ EquipmentNFTV2 consumes exact token for that owner
→ controller mints exact ERC-1155 output
→ one event records input token and outputs
```

`expectedOutput`은 slippage/설정 변경 보호용이며 output을 선택하는 권한이 아니다.
전체 호출이 revert되면 NFT와 재료 상태가 모두 원복되어야 한다.

## 전직

```text
owner receives server-authorized advancement claim
→ controller verifies signature/replay/deadline
→ verifies current owner, class ID and rank
→ burns exact material recipe
→ evolves same class token ID
→ consumes claim and emits advancement event
```

상태와 replay marker는 외부 호출 전에 갱신하되, 이후 호출 실패 시 EVM transaction
전체가 revert되는지 테스트한다. rank skip, 다른 path 덮어쓰기와 sold token claim을
거부한다.

## 역할 그래프

| 역할 | 권장 보유자 |
| --- | --- |
| 각 계약 `DEFAULT_ADMIN_ROLE` | Fuji 전용 admin, 배포자와 분리 |
| `PAUSER_ROLE` | 전용 pauser |
| `REWARD_SIGNER_ROLE` | 서버 signer 주소, admin 아님 |
| Equipment `MINTER/CONSUMER_ROLE` | `ProgressionController`만 |
| Class `MINTER/EVOLVER_ROLE` | `ProgressionController`만 |
| Material `MINTER/BURNER_ROLE` | `ProgressionController`만 |
| Marketplace collection admin | 전용 admin |

controller는 하위 token의 default admin 또는 marketplace admin이 되지 않는다.
배포자는 초기 설정 후 불필요한 역할을 제거한다.

## 마켓 상태 충돌

- escrow된 NFT owner는 marketplace이므로 사용자 전직/분해가 실패한다.
- 오프체인 loadout은 listing transaction 확인 후 stale 처리한다.
- 실행 중 attempt snapshot은 해당 attempt 종료까지 유지한다.
- class NFT listing 화면은 판매 후 클래스 잠금과 보존되는 wallet mastery를 표시한다.
- allowlist되지 않은 동일 interface의 가짜 NFT는 listing할 수 없다.

## 이벤트

indexer가 storage 전체를 순회하지 않고 다음 projection을 재구성할 수 있어야 한다.

- `EquipmentMinted`
- `EquipmentSalvaged`
- `ClassMinted`
- `ClassAdvanced`
- `MaterialMinted` / 표준 `TransferSingle`·`TransferBatch`
- `ListingCreated`
- `ListingCancelled`
- `ListingPurchased`
- signer/role/allowlist 변경 표준 이벤트

이벤트는 token/collection, player, definition/action ID, version과 결과를 indexed
가능한 범위에서 포함한다. 민감한 서버 proof나 원본 signature는 event/log에 넣지 않는다.

## 레거시 마이그레이션

1. V1/V2 주소와 deployment block을 chain registry에 병렬 등록한다.
2. 기존 `GameItem`은 legacy catalog로 계속 표시하고 V1 marketplace를 유지한다.
3. 서버 feature flag로 새 V1 item claim 발급을 중단한다.
4. V2 local deployment와 adversarial tests 후 Fuji에 새 계약을 배포한다.
5. 새 reward만 V2로 발급하고 inventory는 두 collection을 합쳐 보여준다.
6. legacy NFT migration은 별도 서명 claim으로 opt-in하며 강제 소각하지 않는다.
7. V1 signer containment, 남은 claim deadline과 role graph를 deployment record에 남긴다.

테스트넷 자산을 단순 초기화할지 보존할지는 사람의 제품 결정이다. mainnet migration은
이 문서 범위가 아니다.

## 필수 컨트랙트 테스트

- 모든 unauthorized mint/evolve/burn/admin 호출
- 모든 claim 필드 tampering과 wrong domain/chain/contract/signer
- claim ID, source/action과 nonce replay 및 동시 호출
- zero/unsupported ID, rarity, slot, roll, version과 expired deadline
- class rank skip, wrong path, wrong owner와 escrow owner
- salvage output 변조, double salvage와 receiver revert
- fake collection listing과 malicious ERC-721/ERC-20/receiver
- self purchase, stale/cancelled/sold listing과 reentrancy
- pause/unpause 권한과 pause 중 사용자 escrow 회수
- event 필드와 indexer replay
- deployment simulation, 최종 role graph와 임시 역할 revoke

컨트랙트 작성자는 이 테스트 결과의 유일한 보안 검토자가 될 수 없다.
