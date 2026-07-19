# NFT 진행 시스템 설계

상태: **설계 기준선 / 구현 전**

이 디렉터리는 Avalanche Quest의 NFT를 단순 보상 이미지에서 장비, 클래스 해금,
전직, 스킬 빌드, 분해와 거래가 연결된 진행 시스템으로 확장하기 위한 기준선이다.
현재 코드에 이미 구현되었다는 뜻이 아니며, 각 문서의 `현재`와 `목표`를 구분한다.

## 목표

```text
스테이지 플레이
→ 서버 검증
→ 장비 또는 클래스 조각 획득
→ 장착 / 판매 / 분해 선택
→ 캐릭터·클래스 성장
→ 전직과 새 스킬 빌드
→ 상위 스테이지 재도전
```

- 장비 NFT가 전투 수치와 빌드 선택에 실제 영향을 준다.
- 클래스 NFT 보유로 클래스를 사용할 수 있고, 같은 NFT가 전직 상태를 가진다.
- 중복 NFT는 분해 재료가 되어 공급 누적을 완화한다.
- 장착은 가스 없는 서버 loadout으로 유지하고, attempt 시작 시 소유권을 검증한다.
- 드롭, 옵션, 전직과 재료 발행은 클라이언트가 결정하지 않는다.
- 기존 비업그레이드 컨트랙트는 보존하고 V2 배포와 점진적 마이그레이션을 사용한다.

## 현재 구현 기준

2026-07-19 저장소 기준:

- `src/game/config/stages.ts`에 40개 stage가 있다.
- `src/game/innate-classes.ts`의 대부분 클래스는 Q/W/E/R/T 5개 스킬을,
  일부 특수 클래스는 추가 슬롯을 가진다.
- `GameItem`은 ERC-721이며 `itemType`, `rarity`, 단일 `power`와 metadata URI를
  서버 서명 claim으로 mint한다.
- `RewardDistributor`는 현재 ERC-20 보상만 mint한다.
- `ItemMarketplace`는 하나의 `GameItem` 컬렉션만 escrow 거래한다.
- `SkillShopV2`, `SkillEnhancementV2`, `CharacterUpgradeV3` 등 토큰 기반 성장
  계약이 별도로 존재한다.
- NFT loadout, 클래스 NFT, NFT 전직, ERC-1155 재료와 분해는 아직 없다.

## 문서 지도

| 문서 | 결정 범위 |
| --- | --- |
| [01-product-economy.md](01-product-economy.md) | 플레이 루프, 공정성, 공급·소각 |
| [02-asset-model.md](02-asset-model.md) | NFT 종류, stable ID, metadata와 버전 |
| [03-gameplay-progression.md](03-gameplay-progression.md) | 장착, 클래스, 전직과 스킬 슬롯 |
| [04-contract-architecture.md](04-contract-architecture.md) | V2 컨트랙트, 권한, claim과 migration |
| [05-server-data-security.md](05-server-data-security.md) | 서버 snapshot, DB, API와 보안 |
| [06-ux-flows.md](06-ux-flows.md) | 인벤토리, loadout, 전직, 분해와 마켓 UX |
| [07-implementation-roadmap.md](07-implementation-roadmap.md) | 단계별 vertical slice와 완료 조건 |
| [08-decisions-risks-tests.md](08-decisions-risks-tests.md) | 확정/미정 결정, 위험과 테스트 매트릭스 |

## 확정된 방향

- 첫 장착은 `무기 / 방어구 / 장신구` 3슬롯이다.
- 추후 `신발 / 유물`을 추가해 최대 5슬롯으로 확장한다.
- 장비 NFT와 클래스 NFT는 서로 다른 ERC-721 계열이다.
- 전직은 매 단계 새 NFT를 mint하지 않고 같은 클래스 token ID의 상태를 진화시킨다.
- 조각과 분해 정수는 개별 ERC-721이 아니라 ERC-1155 계열을 사용한다.
- 클래스 NFT는 보유 중 사용 권한을 제공한다. 판매 후 진행 기록은 보존되지만
  해당 권한은 다음 소유권 검증부터 잠긴다.
- 실제 전투에는 최대 5개 스킬만 장착한다.

## 아직 확정하지 않은 수치

희귀도 확률, pity 횟수, affix 범위, 분해 산출량, recipe 비용, 클래스별 전직
요구 숙련도와 최종 능력치 상한은 구현 전에 데이터 fixture와 테스트로 확정한다.
문서의 예시 수치는 `provisional`이며 경제적 약속이 아니다.

## 범위 밖

- mainnet 배포와 실제 가치 보장
- NFT 담보, 대여, royalty, auction, bridge
- PvP 밸런스와 현금 환전
- 프록시 upgrade
- 모든 전투 계산의 온체인 실행

## 시작 조건

첫 구현 작업은 [07-implementation-roadmap.md](07-implementation-roadmap.md)의
Phase 0 결정 잠금과 Phase 1 typed catalog/resolver부터 시작한다. 컨트랙트부터
독립적으로 배포하거나 현재 `GameItem` storage를 억지로 확장하지 않는다.
