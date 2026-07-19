# NFT Progression Standard

이 문서는 장비 NFT, 클래스 NFT, 전직, 스킬 로드아웃과 분해 재료를 추가할 때
적용하는 교차 도메인 구현 계약이다. 상세 제품·컨트랙트 설계는
[`docs/nft-system/README.md`](../nft-system/README.md)를 따른다.

## 제품 원칙

- NFT는 `장착`, `거래`, `분해`, `클래스 사용` 중 명확한 효용을 가져야 한다.
- 기본 클래스와 NFT 미장착 상태로도 필수 진행이 가능해야 한다.
- 클래스와 전직은 단순 상위 성능보다 플레이 스타일과 스킬 선택을 바꾼다.
- 낮은 tier NFT는 고유 affix, 분해 또는 제작 수요 중 하나로 잔존 가치가 있어야 한다.
- 확률 보상에는 서버 권위, 중복 방지와 확정 획득 또는 pity 경로가 필요하다.

## 자산 계열

| 계열 | 표준 | 책임 |
| --- | --- | --- |
| 장비 | ERC-721 | 슬롯, 희귀도, affix roll과 거래 가능한 개별 정체성 |
| 클래스 | ERC-721 | 클래스 사용 권한과 같은 token ID의 전직 상태 |
| 진행 재료 | ERC-1155 | 조각, 정수와 recipe 입력/출력 |

전직마다 새 컬렉션을 만들지 않는다. 코스튬과 업적은 별도 제품 결정 전까지
이 계약의 구현 범위가 아니다.

## 신뢰 경계

```text
chain ownership and token state
→ authenticated server ownership check
→ versioned loadout/class entitlement snapshot
→ immutable GameSessionConfig
→ deterministic Phaser stat/skill resolution
→ untrusted telemetry
→ server verification and server-selected reward
→ signed, replay-protected on-chain claim
```

- Phaser는 지갑, ABI, DB 또는 live contract를 읽지 않는다.
- 브라우저가 보낸 token ID 목록은 소유 증명이 아니다.
- 전투 중에는 체인 상태를 다시 읽어 수치를 바꾸지 않는다.
- attempt 시작 시 확정한 snapshot은 해당 attempt에만 유효하다.
- NFT가 실행 중 전송되면 현재 attempt 정책은 유지하되 다음 attempt에서는
  새 소유권을 반영한다.

## 버전 규칙

모든 해석에는 `stageVersion`, `balanceVersion`, `contentVersion`과 필요 시
contract version을 기록한다. NFT metadata의 표시 문자열을 파싱해 전투 수치를
정하지 않는다. 정수 또는 basis point를 사용하고 해석 순서는 다음과 같다.

```text
base
→ additive modifiers
→ multiplicative modifiers
→ category/global cap
→ documented integer rounding
```

지원하지 않는 버전은 attempt 시작 전에 거부한다. 밸런스 변경은 기존 token ID를
바꾸는 대신 새 balance version과 migration 정책으로 수행한다.

## 트랜잭션 UX

장착과 스킬 로드아웃 저장은 기본적으로 오프체인 작업이며 매번 지갑 서명을
요구하지 않는다. mint, class evolution, salvage, listing, cancellation과 purchase는
각각 별도의 트랜잭션 상태를 가진다.

```text
idle
→ awaiting-signature
→ submitted
→ confirming
→ confirmed
or rejected / replaced / reverted / wrong-network
```

NFT 소각과 전직은 비가역 효과, 대상 token, 결과, network와 contract를 서명 전에
명확히 보여준다.

## 필수 불변조건

- 클라이언트는 drop 종류, rarity, affix, roll, 재료 수량 또는 전직 결과를 정하지 못한다.
- 한 source/action reward는 동시 요청에서도 한 번만 claim된다.
- claim은 player, action, 모든 결과 필드, chain ID, verifying contract, nonce와
  deadline을 묶는다.
- 전직은 현재 소유자, 현재 class/rank와 정확한 다음 상태를 검증한다.
- 분해는 호출자가 소유한 NFT만 원자적으로 소각하고 정해진 재료만 발행한다.
- listing escrow 중인 token은 장착 snapshot 생성, 전직 또는 분해의 새 입력이 될 수 없다.
- marketplace는 allowlist된 프로젝트 컬렉션만 받고 fake NFT를 거부한다.
- contract 작성자는 유일한 보안 검토자가 될 수 없다.

## 작업 순서

1. 제품 결정과 수치의 provisional/accepted 상태를 기록한다.
2. stable ID, metadata, session snapshot과 이벤트 타입을 먼저 정의한다.
3. 순수 stat/skill resolver와 경계 테스트를 작성한다.
4. 서버 소유권 검증과 idempotent snapshot/claim 데이터를 구현한다.
5. 로컬 컨트랙트와 adversarial tests를 구현한다.
6. UI transaction state와 두 지갑 E2E를 연결한다.
7. 독립 보안 검토 후에만 Fuji 배포 승인을 요청한다.

구현 완료 조건은 코드 계층별 테스트에 더해 lint, typecheck, contract compile/test,
deployment simulation, 역할 검증과 문서 업데이트를 포함한다.
