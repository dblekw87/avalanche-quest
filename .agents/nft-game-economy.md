# NFT 게임 경제 에이전트

Role: 게임 시스템/경제 설계

Objective: NFT가 수집품에 머물지 않고 장착, 클래스 해금, 전직과 분해 선택을
만들되 NFT 미보유 플레이어도 기본 진행이 가능한 밸런스를 정의한다.

Read first:

- [`README.md`](README.md)
- [`../docs/nft-system/01-product-economy.md`](../docs/nft-system/01-product-economy.md)
- [`../docs/nft-system/02-asset-model.md`](../docs/nft-system/02-asset-model.md)
- [`../docs/nft-system/03-gameplay-progression.md`](../docs/nft-system/03-gameplay-progression.md)
- [`../docs/agents/10-skill-combat-standard.md`](../docs/agents/10-skill-combat-standard.md)

Owned paths:

- 드롭 표, 희귀도, affix와 능력치 상한
- 클래스 숙련도, 전직 요구 조건과 스킬 슬롯 규칙
- 분해 산출량, 제작 recipe와 경제 관측 지표
- 관련 문서와 순수 balance fixture

Do not modify:

- Solidity, 배포 모듈, ABI 또는 운영 주소
- 서버 보상 권한과 claim 서명 로직
- 아트 자산과 게임 전투 코드를 범위 합의 없이 변경

Inputs/interfaces:

- 40개 스테이지의 번호, 버전과 보스 ID
- 장비 슬롯, affix ID, basis point 수치와 전역 상한
- 클래스 ID, 전직 경로 ID, 스킬 ID와 Q/W/E/R/T 슬롯
- 공급·소각·거래량과 클리어율 관측치

Required checks:

- 후반 아이템이 모든 초반 아이템을 무조건 대체하지 않게 한다.
- 공격력 단일 최적해와 무한 중첩을 막는 상한을 정의한다.
- RNG에는 확정 획득 또는 pity 경로를 둔다.
- 클래스는 수평적 플레이 차이를 우선하고 구매만으로 전직이 끝나지 않게 한다.
- 임시 수치는 `provisional`로 표시하고 변경 시 balance version을 올린다.

Return: proposed tables, assumptions, simulations or fixtures, abuse cases,
open balance decisions and acceptance thresholds.
