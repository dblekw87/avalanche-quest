# NFT 종류와 데이터 모델

상태: **설계 기준선**

## 자산 계열

| 계열 | 제안 표준 | 거래 | 핵심 상태 |
| --- | --- | --- | --- |
| Equipment | ERC-721 | 가능 | slot, rarity, affix rolls, version |
| Class License | ERC-721 | 가능 | class, advancement path/rank, version |
| Progression Material | ERC-1155 | 초기에는 불가 | shard/essence definition과 수량 |

전직은 별도 NFT 종류가 아니다. `Class License`의 같은 token ID가 정확히 한 단계씩
진화한다. 강화 조각과 정수는 동일한 다량 자산이므로 ERC-721로 만들지 않는다.

코스튬과 업적 badge는 이 세 계열과 섞지 않고 추후 별도 ADR에서 결정한다.

## 전역 식별 규칙

온체인 자산의 유일 키:

```text
(chainId, contractAddress, tokenId)
```

콘텐츠 definition의 stable ID:

```text
equipmentDefinitionId: bytes32
classId: bytes32
advancementPathId: bytes32
materialDefinitionId: uint256 or bytes32
affixId: bytes32
skillId: bytes32-compatible stable slug hash
```

표시 이름, 번역문과 이미지 URL은 ID가 아니다. ID는 재사용하거나 다른 의미로
바꾸지 않는다.

## Equipment token state

목표 V2 장비는 단일 `power` 대신 다음 durable state를 가진다.

```text
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
```

- `slot`: weapon, armor, accessory, 향후 boots와 relic
- `rarity`: 닫힌 enum이며 지원 범위를 컨트랙트와 catalog가 같이 검증
- `rollBps`: signed claim에 포함된 bounded 정수
- `contentHash`: metadata payload/URI의 무결성 참조

컨트랙트는 표시 description에서 수치를 읽지 않는다. 게임은 on-chain field를
versioned catalog와 결합해 최종 modifier를 해석한다.

## Class token state

```text
baseClassId
currentClassId
advancementPathId
rank
contentVersion
contentHash
```

- rank는 순차적으로만 증가한다.
- advanced class token은 자신의 base class 사용 권한도 포함한다.
- token의 rank와 경로는 거래 시 함께 이전된다.
- wallet별 숙련도, 퀘스트 완료와 스킬 loadout은 token metadata가 아니며
  구매자에게 이전되지 않는다.

이 분리를 통해 성장한 클래스 NFT는 거래 가치를 가지면서도 플레이어 계정 진행을
통째로 판매하는 문제를 막는다.

## Material state

재료 definition 예시:

- `equipment-essence`
- `class-shard:<classId>`
- `advancement-seal:<pathId>`
- `boss-core:<stageBand>`

수량은 정수이며 decimal을 사용하지 않는다. material mint와 burn은 recipe/version에
의해 제한되고, 브라우저가 output 수량을 전달해 결정하게 하지 않는다.

## 온체인과 오프체인 권위

| 데이터 | 권위 |
| --- | --- |
| NFT 소유자, class rank, material balance | 체인 |
| equipment durable rolls | 체인과 서명된 mint event |
| 표시 이름, 설명, 이미지 | content catalog/metadata |
| roll의 실제 전투 효과 | versioned balance catalog |
| 현재 장착과 skill loadout | 인증된 서버 DB |
| attempt의 확정 능력치와 스킬 | 서버가 만든 immutable snapshot |
| 전투 runtime 상태 | Phaser |
| stage reward 결정 | 서버 |

## Metadata 안전성

- HTTP/IPFS/data URI 응답은 크기와 MIME을 제한하고 runtime schema로 검증한다.
- `javascript:`, 임의 redirect, HTML/script와 서버 측 임의 URL fetch를 허용하지 않는다.
- 이미지는 Next.js allowlist 또는 검증된 gateway만 사용한다.
- metadata 장애가 소유권과 핵심 on-chain trait 조회를 막지 않아야 한다.
- 진화 시 metadata가 바뀌면 old/new content hash와 token ID를 이벤트로 남긴다.

## 버전과 호환성

- `balanceVersion`: 수치 resolver와 cap
- `contentVersion`: 이름, 아트, 스킬 presentation
- `contractVersion`: ABI와 state 형식
- `stageVersion`: 보상 pool과 완료 규칙

기존 `GameItem`은 `contractVersion = 1` legacy adapter로 해석한다. `power`는
기존 호환용 catalog mapping에만 쓰고 새 V2 NFT 발행에 재사용하지 않는다.
