# Web3 프론트엔드 에이전트 규칙

이 규칙은 `src/features/web3`에 적용한다. `docs/specs/09-web3`와
`docs/specs/07-프론트엔드/트랜잭션-ui.md`를 먼저 읽는다.

- 체인과 주소는 숫자 chain ID 기반 중앙 레지스트리에서 가져온다.
- 쓰기 전에 chain ID, 주소의 bytecode, 계정, 값과 calldata를 검증하고 simulate한다.
- 모든 쓰기는 서명 대기, 제출, 확인 중, 성공, 거절, 교체, revert, 오체인을 표현한다.
- 제출 hash만으로 성공 처리하지 않고 설정된 confirmation receipt를 기다린다.
- token 수치는 base unit 정수로 처리하며 부동소수점으로 계산하지 않는다.
- 사용자 대신 서명하거나 네트워크를 조용히 변경하지 않는다.
- 비밀 RPC, private key, signer 또는 server credential을 client bundle에 넣지 않는다.
- ABI·주소 변경은 배포 기록, indexer와 소비 기능을 함께 갱신한다.
