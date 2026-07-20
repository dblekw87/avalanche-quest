# Avalanche Quest

Avalanche Fuji Testnet에서 동작하는 사이드 스크롤 Web3 액션 RPG입니다. 지갑을 연결해 50개 스테이지를 공략하고, 서버가 플레이 결과를 검증한 뒤 ERC-20 게임 토큰 `AQT`와 확률형 ERC-721 장비 보상을 승인합니다. 획득한 NFT 장비는 전투에 장착하거나 AQT 마켓에서 거래할 수 있고, 희귀 클래스 라이선스도 온체인 소유권과 게임 권한이 연결됩니다.

- 네트워크: Avalanche Fuji C-Chain (`43113`)
- 배포: [https://avalanche-quest.vercel.app](https://avalanche-quest.vercel.app)
- 저장소: [GitHub](https://github.com/dblekw87/avalanche-quest)

## Web3 프론트엔드 포트폴리오 핵심

단순히 지갑을 연결하는 데모가 아니라, **게임 플레이 → 서버 검증 → 서명된 온체인 보상 → NFT 활용과 거래**까지 하나의 사용자 경험으로 완성한 프로젝트입니다.

| 해결한 문제 | 구현 내용 |
| --- | --- |
| 복잡한 Web3 진입 과정 | RainbowKit 지갑 연결, Fuji 체인 확인, 잘못된 네트워크 안내를 게임 시작 흐름에 통합 |
| 불명확한 트랜잭션 UX | 구매·강화·민팅·리스팅·구매마다 `pending / success / error` 상태와 사용자 행동 메시지 제공 |
| 클라이언트 보상 조작 위험 | Phaser는 플레이 이벤트만 전달하고, Next.js 서버가 결과와 이벤트 순서를 검증한 뒤 EIP-712 claim 발급 |
| 중복 보상과 재사용 공격 | `attemptId`, `claimId`, wallet nonce, deadline을 사용하고 컨트랙트에서 중복 claim과 attempt 차단 |
| ERC-20 승인 과정의 마찰 | AQT allowance를 먼저 조회하고 부족할 때만 approve한 뒤 실제 구매 트랜잭션 진행 |
| NFT 소유권과 게임 권한 연결 | ERC-721 장비 인벤토리, 희귀 클래스 `balanceOf` 확인, 에스크로 등록 시 사용 권한 중지까지 UI에 반영 |
| NFT의 실제 게임 효용 | 무기·방어구·장신구 NFT를 장착하면 공격력·생명력·피해 감소·쿨다운·이동 속도 보정이 모든 클래스에 동일한 규칙으로 적용 |
| 게임과 dApp 상태의 결합 | Phaser Scene과 React/wagmi 계층을 분리하고 제한된 이벤트 브리지로 상태 전달 |
| 다양한 플레이 환경 | 데스크톱 키보드, 모바일 터치, 가로 화면과 전체 화면을 동일한 전투 로직 위에 구현 |

## 최근 업데이트

| 업데이트 | 구현 내용 |
| --- | --- |
| 50 스테이지 UI | 일반·특수·Apocalypse 구간을 한 화면에서 탐색하고 선택할 수 있는 반응형 스테이지 UI |
| NFT 장비 로드아웃 | 무기·방어구·장신구 3슬롯, 장착 상태, 희귀도와 전투 보너스를 한 화면에 표시 |
| 온체인 소유권 연동 | 게임 시작 전 서버가 실제 NFT 소유권과 옵션을 확인하고 검증된 장비만 전투에 적용 |
| 가방 상태 UX | 착용 중인 NFT를 강조하고 가격 입력과 거래소 등록을 비활성화해 다음 행동을 명확히 안내 |
| AQT NFT 마켓 | ERC-721 에스크로 listing과 AQT approve·구매·취소·receipt 확인 흐름을 UI로 연결 |

### 담당 범위

- Next.js App Router 기반 반응형 dApp UI와 게임 허브 설계
- wagmi·viem·RainbowKit을 이용한 지갑, 체인, 컨트랙트 read/write 연동
- 트랜잭션 승인부터 receipt 확인, 성공 후 데이터 재조회까지의 상태 흐름 구현
- Phaser 3 게임을 React 생명주기 안에서 안전하게 생성·해제하고 결과 이벤트 연결
- EIP-712 보상 claim을 소비하는 ERC-20·ERC-721 민팅 UX 구현
- AQT 결제 기반 스킬·강화 상점과 NFT 에스크로 마켓플레이스 구현
- Solidity 컨트랙트, Hardhat 배포·테스트, Vercel 프로덕션 배포까지 end-to-end 구성

## 핵심 사용자 흐름

1. 사용자가 RainbowKit으로 지갑을 연결하고 Avalanche Fuji 네트워크를 확인합니다.
2. 클래스·스테이지·NFT 장비를 선택하면 서버가 장비 소유권과 슬롯을 검증하고 지갑에 귀속된 만료 시간 포함 attempt와 장비 스냅샷을 생성합니다.
3. Phaser는 고정된 세션 설정만 받아 이동·전투·보스 처리를 수행하고 제한된 telemetry와 StageResult만 React로 전달합니다.
4. 서버가 플레이 시간, 체크포인트 순서, 처치 결과, attempt 서명과 상태를 검증합니다.
5. 검증 성공 시 서버가 AQT 보상을 계산하고 장비 드롭과 희귀 클래스 당첨을 판정한 뒤 온체인 nonce가 결합된 EIP-712 claim을 서명합니다.
6. 사용자는 AQT·장비·클래스 보상을 각각 지갑에서 승인하고, 프론트엔드는 receipt 확정 후 잔액·인벤토리·거래 내역을 갱신합니다.
7. 획득한 NFT 장비는 다음 attempt부터 전투 능력치에 적용하거나 AQT 가격으로 등록·구매·취소할 수 있으며, 에스크로 상태가 실제 소유권과 게임 권한에 반영됩니다.

## NFT 활용 흐름

스테이지에서 획득한 NFT는 가방에만 보관되는 수집품이 아니라 장착·전투 보정·거래로 이어지는 게임 자산입니다.

| 상태 | 사용자에게 보이는 정보 |
| --- | --- |
| 미착용 | 장착 버튼과 AQT 판매 가격 입력·거래소 등록 기능 |
| 착용 중 | `ACTIVE LOADOUT`, 적용 능력치, 가방의 `현재 착용 중`과 `거래소 등록 잠금` |
| 거래소 등록 | 에스크로 listing, 판매자·AQT 가격·구매 또는 취소 버튼 |

장착은 가스 없이 처리하지만, 게임 시작 시 서버가 Fuji의 실제 소유권과 NFT 옵션을 다시 검증합니다. 거래소에 등록해 소유권이 에스크로로 이동한 NFT는 다음 플레이부터 장비로 사용할 수 없습니다.

## 플레이 화면

![Avalanche Quest 메인 화면](docs/screenshots/home-desktop.png)

![클래스 및 스테이지 선택](docs/screenshots/game-desktop.png)

![실제 게임 플레이](docs/screenshots/gameplay.png)

## 최근 구현 화면

### 50개 스테이지 선택 UI

![Stage 31부터 Stage 50까지의 반응형 스테이지 선택 화면](docs/screenshots/portfolio-stages-31-50.png)

### NFT 장비 로드아웃과 전투 보너스

![무기, 방어구, 장신구 NFT를 장착하고 보너스를 확인하는 화면](docs/screenshots/portfolio-nft-loadout-equipped.png)

### 가방의 장착·미착용·거래 잠금 상태

![착용 중인 NFT와 미착용 NFT, 거래소 등록 잠금을 구분하는 가방 화면](docs/screenshots/portfolio-inventory-equipped.png)

### AQT 기반 NFT 거래소

![AQT 가격과 구매 버튼을 제공하는 NFT 마켓플레이스](docs/screenshots/portfolio-marketplace.png)

## 주요 기능

- RainbowKit 기반 지갑 연결 및 Avalanche Fuji 네트워크 연동
- Phaser 3 기반 50개 사이드 스크롤 스테이지와 50개 고유 보스 전투 프로필
- PC 키보드와 모바일 터치가 동일한 전투 로직 사용
- 모바일 가로 화면, 전체 화면, 반응형 UI 지원
- 클래스별 이동·점프·공격·피격·사망·스킬 애니메이션
- AQT를 사용하는 스킬 구매, 스킬 강화, 장비 강화, 캐릭터 강화
- 서버 검증 후 EIP-712 서명으로 AQT·보스 장비 NFT·희귀 클래스 보상 발급
- 무기·방어구·장신구 NFT 로드아웃과 소유권 검증 전투 스냅샷
- ERC-721 장비 인벤토리와 AQT 에스크로 마켓
- 지갑별 트랜잭션 내역과 Snowtrace 링크 제공
- 특수·히든·희귀 클래스를 소개하는 반응형 홈 카드 슬라이드
- 사운드 기본 OFF, 강화 파티클 기본 ON 및 개별 설정

## 클래스

### 일반 클래스

각 클래스는 Q/W/E/R/T 5개 스킬을 가지며 AQT로 구매하고 최대 7단계까지 강화할 수 있습니다.

| 클래스 | 성별/전투 방식 |
| --- | --- |
| Warrior | 검을 사용하는 남성 근접 전사 |
| Mage | 원거리 마법사 |
| Spellblade | 마검과 순간 이동을 사용하는 근접 클래스 |
| Archer | 바람 화살을 사용하는 원거리 클래스 |
| Dualblade | 쌍검과 후방 이동을 사용하는 고속 클래스 |
| Brawler | 주먹과 충격파를 사용하는 격투가 |
| Dragon Knight | 창과 용의 불꽃을 사용하는 기사 |
| Gunslinger | 쌍권총을 사용하는 원거리 클래스 |
| Ssaulabi | 환도 검술을 사용하는 남성 클래스 |
| Kickfighter | 발차기 중심의 여성 격투가 |
| Venomancer | 독과 역병을 사용하는 여성 마법사 |
| Pyromancer | 불과 불사조 마법을 사용하는 여성 마법사 |
| Hammerguard | 거대한 망치를 사용하는 남성 중갑 전사 |
| Axe Reaver | 도끼와 돌진을 사용하는 여성 전사 |
| Warlock | 저주와 심연 마법을 사용하는 남성 금지술사 |

### 특수 진영 클래스

Conservative와 Progressive 클래스는 Q/W/E/R/Z/X/C/V 8개 전용 스킬을 즉시 사용하며, 별도 1:1 스페셜 맵과 일반 원정에서 플레이할 수 있습니다. Elementalist는 불·물·바람·대지·번개를 조합하는 9개 구매형 스킬을 사용하는 여성 원소 마법사입니다.

### 희귀 클래스: Asset Tycoon

Asset Tycoon은 주식, 부동산, 코인, 금, 사업 경험과 수많은 실패를 극복한 과정을 하나의 전투 콘셉트로 결합한 남성 최상위 클래스입니다.

- 검증된 스테이지 27~50 클리어 시 서버 CSPRNG 기준 1% 확률
- 천장 시스템 없음
- Q/W/E/R/Z/X/C/V/T 총 9개 스킬
- 모든 스킬 최대 강화 효과 적용
- 공격력·생명력·방어력 각각 20강 적용
- ERC-721 `AssetTycoonLicense`를 보유한 지갑만 선택 가능
- NFT를 마켓에 등록하면 에스크로로 이동하므로 판매자의 클래스 권한이 즉시 중지됨
- 구매가 완료되면 NFT와 클래스 사용 권한이 구매자에게 함께 이전됨

희귀 확률은 클라이언트가 결정하지 않습니다. 스테이지 결과 검증을 통과한 뒤 서버의 암호학적 난수로만 판정하고, 당첨된 attempt ID에 대해 서명된 NFT 민팅 권한을 발급합니다. 컨트랙트는 같은 attempt와 claim의 재사용을 차단합니다.

## 스테이지 난이도

| 스테이지 | 난이도 | 권장 스킬 강화 | 구성 |
| ---: | --- | ---: | --- |
| 1~10 | Veteran | +2 | 기본 패턴 학습과 3페이즈 보스 |
| 11~20 | Master | +4 | 강화된 체력·피해와 빨라진 적 스킬 주기 |
| 21~30 | Hard | +5 | 복합 패턴, 강화된 일반 몬스터와 3페이즈 고난도 보스 |
| 31~36 | Extreme Hard | +6 | 네임드 중간 보스 2체와 4페이즈 최종 보스 |
| 37~40 | Cataclysm | +7 | 더 높은 체력·피해와 촘촘한 패턴 연계 |
| 41~50 | Apocalypse | +7 | 58,000px 장거리 원정, 80~98체 일반 몬스터, 중간 보스 2체, 5페이즈 최종 보스 |

권장 강화 수치는 입장 제한이 아니라 밸런스 목표입니다. 각 스테이지는 서로 다른 보스 패턴 지문과 일반 몬스터 signature를 가지며, 일반 몬스터 조합은 Teach → Test → Combine 순서로 대응법을 학습시킵니다. 치명 패턴의 경고 시간은 최소 700ms, 적 투사체 속도는 최대 250px/s로 제한해 단순 속도 경쟁보다 패턴 학습과 위치 판단을 중심으로 설계했습니다. 난도가 높아질수록 서버가 계산하는 AQT 보상과 장비 드롭 확률도 증가합니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프레임워크 | Next.js App Router, React 19 |
| 언어 | TypeScript strict mode |
| 게임 엔진 | Phaser 3.90, Arcade Physics |
| UI | Tailwind CSS 4 |
| 지갑 | RainbowKit, wagmi |
| EVM 클라이언트 | viem |
| 스마트 컨트랙트 | Solidity 0.8.28, OpenZeppelin 5 |
| 개발·배포 | Hardhat 3, Hardhat Ignition |
| 블록체인 | Avalanche Fuji C-Chain |
| 상태 관리 | React state, Zustand |
| 데이터베이스 | Supabase 클라이언트·환경 기반, 영속 attempt 저장소 전환 설계 |
| 호스팅 | Vercel, GitHub |

## 구현 구조

게임과 블록체인 코드를 분리했습니다. Phaser는 지갑, 컨트랙트 주소, 보상량과 NFT token ID를 알지 못하고 플레이 이벤트만 React 경계로 전달합니다. API는 attempt 시작 시 NFT 소유권을 검증해 전투 보정 스냅샷을 만들고, 완료 시 이벤트 순서를 검증한 뒤 서버가 정한 보상만 EIP-712로 서명합니다.

```text
지갑
  └─ Next.js UI
      ├─ wagmi + viem ── Avalanche Fuji
      │   ├─ AQT / RewardDistributor
      │   ├─ GameItem / ItemMarketplace
      │   ├─ SkillShop / Enhancement contracts
      │   └─ AssetTycoonLicense / AssetTycoonMarketplace
      ├─ Phaser QuestScene
      │   ├─ 이동·충돌·전투·보스 AI
      │   ├─ 서버가 확정한 NFT 장비 보정 적용
      │   ├─ PC·모바일 공통 입력 로직
      │   └─ 제한된 StageResult 이벤트
      └─ Route Handlers
          ├─ POST /api/attempts
          ├─ NFT 소유권 검증과 attempt authorization
          ├─ 플레이 결과·이벤트 순서 검증
          └─ AQT·장비 드롭·희귀 클래스 EIP-712 서명
```

### 프론트엔드 설계 포인트

- **읽기와 쓰기 분리:** `publicClient.readContract`로 잔액·소유권·allowance를 조회하고 `writeContractAsync`는 명시적인 사용자 액션에서만 호출합니다.
- **Receipt 기준 완료 처리:** 지갑 서명만으로 성공 처리하지 않고 `waitForTransactionReceipt` 이후 상태와 화면 데이터를 갱신합니다.
- **오류 정규화:** 사용자 서명 거절, 잔액 부족, RPC·컨트랙트 오류를 공통 메시지 계층에서 읽을 수 있는 피드백으로 변환합니다.
- **엄격한 타입 경계:** TypeScript strict mode와 구체적인 ABI·도메인 타입을 사용하며 `any` 없이 게임 이벤트와 컨트랙트 데이터를 연결합니다.
- **보안 경계 유지:** 공개 컨트랙트 주소와 서버 전용 signer key를 분리하고, 보상량·희귀 드롭 판정을 클라이언트 번들에 두지 않습니다.
- **NFT 스냅샷:** 브라우저가 선택한 token ID를 신뢰하지 않고 서버가 `ownerOf`, 슬롯, 희귀도와 전투력을 조회해 attempt에 결합하며, 플레이 중 장비 변경은 다음 attempt부터 반영합니다.
- **반응형 게임 통합:** Phaser 캔버스 스케일, 모바일 입력, 전체 화면, 페이지 UI를 분리해 화면 크기가 달라도 게임 규칙은 동일하게 유지합니다.

## 폴더 구조

```text
avalanche-quest/
├─ contracts/                         Solidity 컨트랙트
│  ├─ GameToken.sol                   ERC-20 AQT
│  ├─ RewardDistributor.sol           서명 기반 AQT 보상
│  ├─ GameItem.sol                    서명 기반 ERC-721 장비
│  ├─ ItemMarketplace.sol             장비 AQT 마켓
│  ├─ AssetTycoonLicense.sol          희귀 클래스 ERC-721 라이선스
│  ├─ AssetTycoonMarketplace.sol      클래스 라이선스 AQT 마켓
│  ├─ SkillShop.sol                   클래스 스킬 구매
│  ├─ SkillEnhancement.sol            스킬 강화
│  ├─ ArmorEnhancement.sol            방어구 강화
│  └─ CharacterUpgradeV*.sol          공격·생명·방어 강화
├─ ignition/modules/RewardSystem.ts   배포 순서와 초기 권한·가격 설정
├─ public/assets/                     클래스·맵·보스·스킬·파티클 이미지
├─ scripts/process-combat-assets.mjs  전투 에셋 알파 제거·분할·런타임 변환
├─ src/app/                           페이지 및 API Route Handlers
├─ src/components/                    공통 반응형 UI
├─ src/features/
│  ├─ asset-tycoon/                   NFT 소유 확인·민팅·전용 마켓
│  ├─ rewards/                        플레이와 보상 트랜잭션 흐름
│  ├─ skills/                         스킬 상점·강화·ABI
│  ├─ upgrades/                       캐릭터 강화
│  ├─ items/                          장비 NFT·3슬롯 로드아웃
│  ├─ marketplace/                    장비 마켓
│  └─ web3/                           지갑·체인·트랜잭션 피드백
├─ src/game/
│  ├─ scenes/quest-scene.ts           메인 Phaser Scene
│  ├─ config/stages.ts                50개 스테이지 정의와 배치
│  ├─ config/difficulty.ts            6단계 난이도와 수치 경계
│  ├─ content/                        50개 전투 카탈로그와 에셋 manifest
│  ├─ systems/                        NFT 전투 보정과 공통 게임 시스템
│  ├─ innate-classes.ts               12개 확장 클래스 스킬 정의
│  ├─ asset-tycoon.ts                 희귀 클래스 9스킬 정의
│  ├─ mobile-game-controls.tsx        모바일 터치 조작
│  ├─ political-duel/                 특수 진영 1:1 전투
│  └─ audio/                          스테이지별 오디오 수명 관리
├─ src/server/
│  ├─ attempts/                       서명된 attempt authorization과 상태
│  ├─ items/                          NFT 장비 소유권·스냅샷 검증
│  └─ rewards/                        결과 검증과 서버 권위 장비 드롭
└─ docs/
   ├─ game-content/                   50개 전투·에셋 제작 기준
   ├─ nft-system/                     NFT 진행 시스템 목표 아키텍처
   ├─ specs/                          14개 영역·120개 세부 구현 명세
   └─ agents/                         역할·보안·품질 운영 매뉴얼
```

## 상세 기술 문서

- [전체 아키텍처](docs/architecture.md)
- [50개 스테이지 전투 카탈로그](docs/game-content/09-stage-combat-catalog.md)
- [전투 에셋 생성·가공 기록](docs/game-content/10-generated-combat-assets.md)
- [NFT 진행 시스템 목표 설계](docs/nft-system/README.md)
- [120개 세부 구현 명세](docs/specs/README.md)
- [에이전트 역할·보안·품질 운영 매뉴얼](docs/agents/README.md)

## Fuji 컨트랙트 주소

| 컨트랙트 | 주소 | 기능 |
| --- | --- | --- |
| GameToken | [`0xD182...05f9`](https://testnet.snowtrace.io/address/0xD182A7E85E201412D9f69D98Be3127eC126F05f9) | ERC-20 AQT |
| RewardDistributor | [`0x21F7...2f8b`](https://testnet.snowtrace.io/address/0x21F797e0c02F2bbec8a640Cf291298fe89ec2f8b) | 서명 검증 후 AQT 보상 |
| GameItem | [`0x5E30...D0be`](https://testnet.snowtrace.io/address/0x5E3076C3881c4c4b3543291B7536802455f6D0be) | ERC-721 장비 |
| ItemMarketplace | [`0x4cC7...8822`](https://testnet.snowtrace.io/address/0x4cC76E2CEb0212eb6797d8378461AA10A3568822) | 장비 NFT AQT 거래 |
| SkillShop V2 | [`0x641E...dc1f`](https://testnet.snowtrace.io/address/0x641E63684252CfA099F61512c8989482dC0Fdc1f) | 기본 Q 지급·기존 구매 승계·스킬 구매 |
| SkillEnhancement V2 | [`0x2664...2120`](https://testnet.snowtrace.io/address/0x2664aE0a8Fb2dF162C82f790b140ce180D9d2120) | 기존 레벨 승계·스킬 최대 7강 |
| ArmorEnhancement V2 | [`0xe465...ae8A`](https://testnet.snowtrace.io/address/0xe4653FF904fe334256B53313Ebb9D95ACB4cae8A) | 기존 레벨을 승계하는 Aegis Armor 강화 |
| CharacterUpgrade V3 | [`0x3A76...ACa6`](https://testnet.snowtrace.io/address/0x3A76d7936e8947d34dd3BAf1cB0877927245ACa6) | 공격·생명·방어 최대 20강 |
| AssetTycoonLicense | [`0x0384...51BF`](https://testnet.snowtrace.io/address/0x0384Fb612636836B42Cf1568DafFB8410A6E51BF) | 희귀 클래스 ERC-721 소유권 |
| AssetTycoonMarketplace | [`0xE7bc...FbBa0`](https://testnet.snowtrace.io/address/0xE7bc87eC32B2DA4AD017C8F6EF2db4a13B2FbBa0) | 희귀 클래스 AQT 에스크로 거래 |

MetaMask에 AQT를 추가할 때 사용하는 토큰 컨트랙트 주소는 `0xD182A7E85E201412D9f69D98Be3127eC126F05f9`, 기호는 `AQT`, 소수점은 `18`입니다.

## 환경 변수

`.env.local`은 Git에 커밋하지 않습니다. Vercel에서는 Project Settings → Environment Variables에 동일한 값을 등록합니다.

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_GAME_TOKEN_ADDRESS=
NEXT_PUBLIC_GAME_ITEM_ADDRESS=
NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS=
NEXT_PUBLIC_SKILL_SHOP_ADDRESS=
NEXT_PUBLIC_MARKETPLACE_ADDRESS=
NEXT_PUBLIC_CHARACTER_UPGRADE_ADDRESS=
NEXT_PUBLIC_SKILL_ENHANCEMENT_ADDRESS=
NEXT_PUBLIC_ARMOR_ENHANCEMENT_ADDRESS=
NEXT_PUBLIC_ASSET_TYCOON_LICENSE_ADDRESS=
NEXT_PUBLIC_ASSET_TYCOON_MARKETPLACE_ADDRESS=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

서버 전용 비밀값은 절대로 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.

```env
FUJI_RPC_URL=
SUPABASE_SERVICE_ROLE_KEY=
REWARD_SIGNER_PRIVATE_KEY=
DEPLOYER_PRIVATE_KEY=
```

## 로컬 실행과 검증

Node.js `22.13.0` 이상이 필요합니다.

```bash
npm install
# PowerShell
Copy-Item .env.example .env.local

npm run dev

npm run lint
npm run typecheck
npm run build
npm run contracts:compile
npm run contracts:test
```

현재 기준으로 ESLint, TypeScript strict typecheck, Next.js production build를 통과합니다. Solidity 변경은 Hardhat compile과 contract test를 별도로 실행하도록 스크립트를 분리했습니다.

## 보안 설계

- 클라이언트는 AQT 보상량이나 희귀 클래스 당첨 여부를 정하지 않습니다.
- claim에는 chain ID, verifying contract, player, attempt ID, claim ID, nonce, deadline이 포함됩니다.
- RewardDistributor와 NFT 컨트랙트가 중복 claim과 attempt를 차단합니다.
- 민팅 권한과 토큰 발행 권한은 관리자 또는 승인된 보상 컨트랙트로 제한합니다.
- 모든 트랜잭션 UI는 pending, success, error 상태를 표시합니다.
- `.env`, 개인키, Hardhat keystore 암호는 Git에 커밋하지 않습니다.

현재 attempt 상태 저장소는 개발용 메모리 구현이지만, 서버가 HMAC으로 서명한 wallet·stage·만료 시각·장비 스냅샷 hash를 클라이언트가 완료 요청에 다시 제출하므로 Vercel의 다른 인스턴스에서도 attempt를 복원해 검증할 수 있습니다. 다만 서버 계층의 원자적 중복 제출 차단을 위해서는 Supabase 테이블로 교체하고 `started → verifying → verified` 상태를 unique constraint와 함께 갱신해야 합니다. 온체인 nonce, claim ID와 attempt ID 재사용 방지는 별도의 최종 방어 계층으로 유지됩니다.

## 프로젝트를 통해 보여주는 역량

- 게임처럼 상태 변화가 빠른 UI와 블록체인처럼 확정이 느린 시스템을 하나의 예측 가능한 UX로 연결
- 온체인 소유권을 단순 조회하는 수준을 넘어 실제 게임 접근 권한과 거래 상태에 반영
- 클라이언트를 신뢰하지 않는 보상 구조와 재사용 방지 장치를 프론트엔드 흐름까지 일관되게 설계
- 컨트랙트 호출 전 사전 조건 확인, 트랜잭션 진행 상태, receipt 확정, 후속 데이터 동기화 구현
- 데스크톱과 모바일에서 사용할 수 있는 프로덕션 dApp을 설계하고 Vercel에 지속 배포

## 제작

PANGWOO의 Web3 프론트엔드 개발 포트폴리오 프로젝트입니다.
