# Channel App SDK 가이드

이 가이드는 Channel 앱 개발자가 TypeScript SDK와 Go SDK를 같은 개념으로 사용할 수 있도록 정리합니다.

## 권장 문서 순서

1. [첫 앱 만들기 Quickstart](quickstart.md): private app을 만들고 Command, WAM, 메시지 전송까지 실행합니다.
2. [핵심 개념](concepts.md): Function, Extension, WAM, 인증, token의 경계를 이해합니다.
3. [Function 등록](functions.md): wire contract와 standalone typed app Function을 정의합니다.
4. [Command 가이드](extensions/command.md): metadata, action, autocomplete를 구현합니다.
5. [WAM 가이드](wam.md): React UI, host authorization, app/native Function 호출을 구현합니다.
6. [Extension 전체 가이드와 16개 TypeScript/Go 상세 문서](extensions.md): Extension의 등록 흐름을 이해하고 필요한 기능과 구현 계약을 선택합니다.
7. [프로덕션 준비 가이드](app-development.md): 출시 전 보안, 신뢰성, 운영, 배포, rollback을 검증합니다.
8. 언어별 API는 [TypeScript 레퍼런스](../../reference/typescript/README.md) 또는
   [Go 레퍼런스](../../reference/go/README.md)에서 확인합니다.
9. 구현 중에는 완성된 [TypeScript 앱 튜토리얼](https://github.com/channel-io/app-tutorial-ts) 또는
   [Go 앱 튜토리얼](https://github.com/channel-io/app-tutorial)을 함께 봅니다.

## 기능별 가이드

- [User Authorization 가이드](extensions/user-authorization.md): 사용자 식별자 확인과 앱의 리소스 소유권 검증 책임을 구분합니다.

## 선택 기준

TypeScript SDK는 NestJS, Zod, WAM React 개발에 적합합니다. Go SDK는 Go 서비스에서 typed
function, native client, extension helper를 사용할 때 적합합니다.

현재 계약은 가이드와 공개 SDK export가 정의하고, 튜토리얼은 그 계약의 완성된 실행 구현을
제공합니다.

## 실행 예제

- [TypeScript 앱 튜토리얼](https://github.com/channel-io/app-tutorial-ts)
- [Go 앱 튜토리얼](https://github.com/channel-io/app-tutorial)

## 언어별 레퍼런스

- [TypeScript 레퍼런스 맵](../../reference/typescript/README.md)
- [Go 레퍼런스](../../reference/go/README.md): Function, 서버, 인증과 토큰, Extension, native Function, WAM 연동
