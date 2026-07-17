# 서버 에이전트 규칙

이 규칙은 `src/server`에 적용한다. 디렉터리가 아직 없더라도 새 서버 모듈은 이
경계에 둔다. `docs/specs/08-백엔드`, `11-데이터`, `12-보안`을 먼저 읽는다.

- 모든 외부 입력을 런타임 스키마로 검증하고 본문·배열·문자열 크기를 제한한다.
- 인증 nonce, stage attempt, submission과 reward claim은 만료되고 한 번만 사용된다.
- 보상액과 아이템은 버전된 서버 규칙으로 계산하며 client payload를 사용하지 않는다.
- 검증 완료와 claim 기록은 unique constraint를 포함한 원자적 상태 전이로 처리한다.
- service role, reward signer와 세션 비밀은 서버 전용이며 응답과 로그에 남기지 않는다.
- 주소 소유권, 세션, stage version, chain ID와 verifying contract를 명시적으로 결합한다.
- 경합·재전송·의존성 실패·만료·다른 사용자 접근에 대한 통합 테스트를 작성한다.
