# 스마트 컨트랙트 에이전트 규칙

이 규칙은 `contracts` 전체에 적용한다. `docs/specs/10-스마트컨트랙트`,
`12-보안`, `14-배포운영`을 먼저 읽는다.

- 구현 전에 공급량, 권한, 재전송, 에스크로와 자산 보존 불변조건을 기록한다.
- OpenZeppelin의 검토된 구현을 우선하며 임의 토큰·서명·권한 구현을 피한다.
- mint, pause, admin, signer와 treasury 권한을 분리하고 최소 권한을 적용한다.
- EIP-712는 모든 의미 있는 필드, chain ID, verifying contract, nonce와 deadline을 묶는다.
- 상태를 외부 호출 전에 갱신하고 reentrancy와 악성 token/receiver 동작을 테스트한다.
- 이벤트는 `(chainId, txHash, logIndex)` 기반 indexer가 상태를 재구성할 만큼 충분해야 한다.
- 작성자는 유일한 보안 검토자가 될 수 없고 mainnet 작업은 사람 승인을 요구한다.
- compile, adversarial contract test, 배포 simulation과 역할 검증을 완료한다.
