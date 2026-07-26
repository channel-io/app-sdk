# 앱 개발 가이드

이 문서는 [첫 앱 Quickstart](./quickstart.md)를 완료한 다음 필요한 설계, 보안, 배포, 운영
판단을 설명합니다. 정확한 API는 [TypeScript 레퍼런스](../../reference/typescript/README.md)와
[Go 레퍼런스](../../reference/go/README.md)를 기준으로 확인하세요. 전체 실행 코드는
[TypeScript 튜토리얼](https://github.com/channel-io/app-tutorial-ts)과
[Go 튜토리얼](https://github.com/channel-io/app-tutorial)에서 확인할 수 있습니다.

## 1. 기능 경계 설계

사용자 작업에서 시작해 그 작업을 노출하는 가장 작은 Extension family를 선택합니다.
Extension은 버전이 있는 기능과 metadata/runtime Function을 공개합니다. 독립 Function은
Extension이나 WAM이 참조할 수 있는 typed RPC입니다. WAM은 Channel 안에서 실행되는 선택적
React UI이며, 비즈니스 규칙과 권한이 필요한 provider 호출은 서버에 둡니다.

구현 전에 다음을 적어 두세요.

- 사용자 작업과 지원할 Channel 화면
- Extension family와 필요한 Function
- 입출력 schema와 안정적인 error type
- app scope와 channel scope Native Function 권한
- WAM 필요 여부
- 멱등성, 재시도, timeout, provider rate limit 정책

[핵심 개념](./concepts.md), [Function 가이드](./functions.md),
[Command 가이드](./extensions/command.md), [WAM 가이드](./wam.md),
[Extension 선택 가이드](./extensions.md)를 함께 확인하세요.

## 2. 신뢰 영역 분리

세 영역을 명확히 나눕니다.

1. **Channel host:** 현재 manager를 인증하고 WAM context를 제공합니다.
2. **WAM:** host data를 검증해 표시하고 범위가 좁은 app/native action을 요청합니다.
3. **앱 서버:** 서명된 Function 요청을 검증하고 credential을 보관하며, scope에 맞는 token으로
   provider와 Channel operation을 호출하고 business authorization을 적용합니다.

App Secret, Signing Key, refresh token, provider credential을 WAM에 넣지 마세요. WAM argument는
신뢰하지 말고 schema로 검증합니다. 권한이 필요한 대상을 WAM에 전달해야 한다면 서버가 짧은
수명의 target을 서명하고, 돌아온 요청에서 channel과 caller identity를 다시 확인합니다.

## 3. 인증과 권한

모든 inbound Function 요청은 raw body와 Signing Key로 검증합니다. 직접 HMAC 코드를 만들지 말고
SDK signature middleware/guard를 사용합니다. Signature 검증 생략은 명시적인 로컬 테스트에만
허용합니다.

Token cache와 refresh는 `TokenManager`에 맡깁니다.

- app token: Extension 등록과 app-owned operation
- channel token: 설치된 한 Channel의 server-side operation
- host-authorized native call: WAM에서 현재 manager가 수행하는 action

선택한 흐름에 필요한 권한만 요청합니다. 유효한 token이 business authorization을 대신하지는
않습니다. 언어별 인증 및 Native Function 레퍼런스를 확인하세요.

## 4. 한 개의 수직 흐름 구현

Extension을 늘리기 전에 사용자에게 보이는 한 경로를 끝까지 완성합니다.

1. 공유 schema
2. Function handler와 Extension metadata
3. signature 검증과 auto-registration
4. 필요한 경우에만 WAM
5. typed Native Function 또는 provider 호출 하나
6. 단위 테스트와 실제 설치 앱 테스트

TypeScript 앱은 주로 NestJS decorator와 Zod를 사용합니다. Go 앱은 builder, struct, typed handler를
사용합니다. Go 서버도 TypeScript 앱과 같은 React WAM package를 제공할 수 있습니다.

## 5. Endpoint와 배포

개별 Function/WAM 이름이 아니라 HTTPS root를 설정합니다.

| 설정              | 예시 root                              |
| ----------------- | -------------------------------------- |
| Function Endpoint | `https://app.example.com/functions`    |
| WAM Endpoint      | `https://app.example.com/resource/wam` |

Function과 WAM route는 안정적인 root 아래에 둡니다. Health check는 별도 경로로 분리하세요.
Traffic을 받기 전에 schema와 migration을 준비하고, Extension auto-registration은 안전하게
재시도할 수 있어야 합니다. 여러 instance를 사용하면 shared token storage와 registration race를
함께 점검합니다.

## 6. 테스트와 운영

네 단계로 검증합니다.

- schema와 순수 business rule
- Function discovery, error, signature, token scope
- server/WAM build와 endpoint routing
- test Channel에 설치한 private app의 정상·권한 거부·재시도 흐름

Operation name, request ID, latency, 안정적인 error type만 기록합니다. Message body, token,
credential, customer/provider data는 로그에 남기지 않습니다. Signature 실패, registration 실패,
token refresh 오류, provider throttling, Function latency 상승에 alert를 설정합니다.

배포 전에는 rollback, secret rotation, token cache, permission 변경, 새 process에서의 등록과 실제
앱 동작을 확인합니다.

## 다음 문서

- [Command 가이드](./extensions/command.md)
- [WAM 가이드](./wam.md)
- [Extension recipe](./extensions.md)
- [TypeScript 레퍼런스 맵](../../reference/typescript/README.md)
- [Go 레퍼런스 맵](../../reference/go/README.md)
- [공통 protocol](../../reference/protocol.md)
