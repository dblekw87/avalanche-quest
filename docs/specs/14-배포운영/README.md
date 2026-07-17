# 배포와 운영 명세

주 담당: **릴리스 에이전트**. 권한·보상·자산·운영 데이터에 영향을 주면 작성자와
다른 검토자가 확인한다.

| 문서 | 핵심 범위 |
| --- | --- |
| [환경 모델](환경-모델.md) | local·preview·staging·testnet·mainnet을 분리한다. |
| [CI 파이프라인](ci.md) | 설치·lint·typecheck·test·build·artifact를 재현한다. |
| [컨트랙트 배포](컨트랙트-배포.md) | 고정·simulate·승인·broadcast·verify·역할 기록을 수행한다. |
| [웹 배포](웹-배포.md) | 비밀·migration·build·health·rollback을 검증한다. |
| [메인넷 릴리스](메인넷-릴리스.md) | multisig·독립 검토·해석된 승인 패킷을 요구한다. |
| [관측성](관측성.md) | API·RPC·인덱서·트랜잭션·사용자 영향을 감시한다. |
| [롤백과 봉쇄](롤백-봉쇄.md) | 오프체인 rollback과 불변 컨트랙트 봉쇄를 분리한다. |
| [운영 런북](운영-런북.md) | 검증된 절차·책임자·소통·사후 확인을 유지한다. |

공통으로 루트 `AGENTS.md`, `docs/agents/01-common-rules.md`,
`docs/agents/06-security-quality.md`를 적용한다.
