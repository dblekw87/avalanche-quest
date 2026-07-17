# 스마트 컨트랙트 명세

주 담당: **Solidity 에이전트**. 권한·보상·자산·운영 데이터에 영향을 주면 작성자와
다른 검토자가 확인한다.

| 문서 | 핵심 범위 |
| --- | --- |
| [컨트랙트 불변조건](불변조건.md) | 자산·공급·재전송·에스크로·권한 속성을 먼저 정의한다. |
| [접근 제어](접근제어.md) | admin·pauser·signer·minter를 최소 권한으로 분리한다. |
| [GameToken](게임토큰.md) | 상한 ERC-20과 배포자 전용 mint를 정의한다. |
| [GameItem](게임아이템.md) | ERC-721 정체성·메타데이터·제한 mint를 정의한다. |
| [RewardDistributor](보상배포자.md) | 서명 검증과 재전송 상태를 mint 전에 소비한다. |
| [Marketplace](마켓플레이스.md) | NFT 에스크로와 ERC-20 고정가 결제를 보호한다. |
| [이벤트와 오류](이벤트-오류.md) | 인덱싱 가능한 이벤트와 명확한 custom error를 정의한다. |
| [컨트랙트 테스트](컨트랙트-테스트.md) | 권한·변조·재전송·재진입·pause·rollback을 검증한다. |

공통으로 루트 `AGENTS.md`, `docs/agents/01-common-rules.md`,
`docs/agents/06-security-quality.md`를 적용한다.
