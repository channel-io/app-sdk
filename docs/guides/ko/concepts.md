# 핵심 개념

Channel 앱은 **Function을 실행하는 서버**와, 필요한 경우 **WAM으로 만든 웹 UI**로 구성됩니다. Extension은 여러 Function을 Channel의 표준 기능에 연결하고, AppStore는 호출·등록·권한의 경계를 담당합니다.

```text
Channel 클라이언트 → AppStore → 서명된 PUT /functions/v1 → SDK 검증·dispatch → Function handler
Function 결과 → WAM 열기 → WAM SDK → 앱 Function 또는 Channel native function
```

## Function

Function은 앱 서버에서 실행되는 하나의 타입이 있는 동작입니다. 호출 요청은 다음 값을 포함합니다.

- `method`: 호출할 Function의 전체 이름
- `params`: 호출자가 보낸 입력
- `context`: AppStore가 구성한 호출자, 채널, 언어, 인증/config 정보

Handler는 보통 검증된 `context`와 `params`를 받아 `result`를 반환하고, 실패하면 구조화된 `error`를 반환합니다. `context`는 `x-signature` 검증이 성공한 요청에서만 신뢰하세요.

TypeScript에서는 `@Func`, `@InputSchema`, `@OutputSchema`, `@Ctx`, `@Input`을 사용합니다. SDK는 Zod schema를 JSON Schema로 공개하고, 입력과 출력을 실행 시점에도 검증합니다. Go에서는 `appsdk.Register` 또는 `appsdk.MustRegister`가 Go struct에서 schema를 만들고 typed handler를 등록합니다.

Function에는 두 종류가 있습니다.

- **Extension Function**: 표준 Extension 안의 Function입니다. 예를 들어 command의 `metadata.getCommands`는 `extension.command.metadata.getCommands`로 공개됩니다.
- **Standalone Function**: 앱 고유 비즈니스 동작입니다. 예를 들어 `tutorial.open`이나 `orders.sync`처럼 Extension 밖에 등록합니다. TypeScript에서는 `@Extension`이 없는 provider의 `@Func`를 사용하고, Go에서는 `appsdk.Register`를 사용합니다.

AppStore는 `extension.core.function.getFunctions`로 Function 이름과 input/output schema를 탐색합니다. SDK가 이 discovery 응답, `PUT /functions/:version` route, dispatch와 검증을 처리하므로 신규 앱에서 raw JSON-RPC router를 직접 만들 필요가 없습니다.

## Extension

Extension은 관련 Function과 metadata를 Channel의 기능으로 선언하는 **이름과 system version이 있는 capability contract**입니다. 단순한 코드 폴더나 클래스 분류가 아닙니다. 등록된 계약을 보고 AppStore는 command를 노출하거나 widget/custom tab을 열고, hook을 전달하거나 OAuth/config 흐름을 연결합니다.

대표적인 Extension은 command, widget, custom tab, hook, OAuth, config, calendar, polling, commerce, order, WMS, messaging입니다. 각 Extension은 정해진 Function 이름과 schema를 가집니다. 먼저 [Extension 전체 가이드](extensions.md)를 읽고 [TypeScript Extension 레퍼런스](../../reference/typescript/EXTENSIONS.md)와 언어별 helper를 확인하세요.

TypeScript의 현재 권장 경로는 다음과 같습니다.

```ts
@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  getCommands() {
    /* ... */
  }
}
```

`@Extension`은 SDK가 지원하는 표준 Extension 이름에만 사용합니다. 앱 고유 Function을 넣기 위해 가짜 Extension을 만들지 말고 standalone `@Func`를 사용하세요. Decorated class는 NestJS module의 `providers`에도 등록해야 discovery됩니다.

Go는 `extension/command`, `extension/oauth`, `extension/config` 같은 typed builder를 우선 사용합니다. 표준 helper가 없는 Function은 `appsdk.Register`로 등록하고, 정말 별도의 Extension 계약이 필요할 때만 generic builder를 사용합니다.

Auto-registration은 app token으로 `registerExtension(appId, extensionName, systemVersion)`을 호출합니다. 이어서 AppStore가 Function Endpoint의 discovery Function을 호출해 metadata와 schema를 읽습니다. 등록 성공은 handler 자체가 올바르게 동작한다는 뜻이 아니므로 discovery와 실제 Function 호출을 모두 테스트하세요.

## Schema와 Context

Input schema는 신뢰하지 않은 `params`의 형태를 제한하고, output schema는 앱이 AppStore 계약에 맞는 결과를 내는지 확인합니다. 표준 Extension에서는 SDK가 export하는 schema를 재사용하세요. 이름이 같은 자체 DTO를 다시 만들면 계약 변경을 놓치기 쉽습니다.

`context`에는 호출 표면에 따라 다음 값이 들어올 수 있습니다.

- `caller`: `user`, `manager`, `system`, `app` 중 호출 주체
- `channel`: 설치된 Channel의 식별 정보
- `user`, `userChat`, `language`: 해당 흐름에 존재할 때만 제공되는 사용자 문맥
- `authToken`: OAuth 연결에서 AppStore가 복호화해 주입한 provider access token
- `config`: config extension으로 저장한 현재 scope의 설정과 credential
- `webhooks`: Hook `targetId`별 AppStore 발급 manager callback URL

Optional 값은 항상 존재한다고 가정하지 말고 Function의 실행 surface와 schema에 맞게 검사하세요. `ctx.authToken`은 Channel App app/channel token이 아니라 외부 OAuth provider의 token입니다.

## WAM

WAM(Web App Module)은 Channel 클라이언트 안에서 열리는 앱의 웹 UI입니다. Command, widget, custom tab 등의 Function이 다음과 같은 action result를 반환하면 Channel 클라이언트가 등록된 WAM Endpoint 아래의 `{name}` UI를 로드합니다.

```json
{
  "type": "wam",
  "attributes": {
    "appId": "public-app-id",
    "name": "tutorial",
    "wamArgs": { "view": "summary" }
  }
}
```

빌드된 SPA는 `${WAM_ENDPOINT}/${name}`에서 제공하고, React root는 `WamProvider`로 감쌉니다.

- `useWamData` / `useTypedWamData`: `appId`, `channelId`, `managerId`, chat 문맥과 `wamArgs` 읽기
- `useCallFunction`: AppStore를 통해 자신의 앱 Function 호출
- `useNativeFunction`: 현재 Channel surface와 manager/user 권한으로 허용된 Channel native function 호출
- `useWamSize`, `useWamClose`: WAM 크기와 닫기 제어

React setup, runtime data, Function 호출, resize와 close의 전체 흐름은 [WAM 가이드](wam.md)를
확인하세요.

WAM은 `App Secret`, `Signing Key`, app token, channel token을 보관하거나 직접 발급하지 않습니다. `wamArgs`도 클라이언트에서 읽을 수 있으므로 secret, access token, 고객 원문을 넣지 마세요. Bot이나 서버 주체로 실행할 작업은 `useCallFunction`으로 앱 서버에 요청하고 서버가 channel token을 사용하게 합니다. 현재 manager/user 주체의 작업만 `useNativeFunction`으로 호출하세요.

## 인증, 서명, Token

서로 다른 자격 증명을 구분해야 합니다.

| 값                         | 의미                                                           | 보관 위치                                     |
| -------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| App ID                     | 앱의 공개 식별자                                               | 서버와 WAM에서 사용 가능                      |
| App Secret                 | app/channel token pair 발급에 쓰는 장기 비밀                   | 서버 secret manager만                         |
| Signing Key                | AppStore가 보낸 Function 요청의 `x-signature` 검증             | 서버 secret manager만                         |
| App token                  | Extension 등록과 app-scoped native operation                   | 서버 cache                                    |
| Channel token              | 설치된 Channel에서 서버가 수행하는 channel-scoped operation    | 서버 cache, channel별 분리                    |
| Manager/User authorization | Channel 클라이언트에서 현재 사용자가 수행하는 native operation | WAM host runtime이 관리                       |
| Provider OAuth token       | 연결된 외부 서비스 API 호출                                    | Function의 `ctx.authToken`으로 필요할 때 주입 |
| Config credential          | API key, `client_credentials`, shop별 secret 등                | AppStore가 저장하고 `ctx.config` 등에 주입    |

수신 Function 인증과 발신 native 인증은 별개입니다.

1. **수신 요청**: raw request body와 hex-encoded Signing Key로 HMAC-SHA256 `x-signature`를 검증합니다. TypeScript는 `SignatureGuard`와 NestJS `rawBody: true`, Go는 `server.WithSignature`를 사용합니다. 운영 환경에서 검증을 끄지 마세요.
2. **서버의 발신 요청**: `TokenManager`가 App Secret으로 app 또는 channel token을 발급하고 cache합니다. SDK는 만료 전에 refresh하고 동시에 들어온 발급/refresh를 합칩니다. 요청마다 `issueToken`을 호출하지 마세요.
3. **WAM의 발신 요청**: WAM SDK가 host bridge를 호출합니다. Manager/User 권한은 Channel runtime이 결정하며 앱 서버의 `TokenManager`가 만들지 않습니다.

### Token 발급 세부사항

직접 발급 API를 반복 호출하지 말고 `TokenManager`를 사용하세요. Low-level transport를 이해하거나
문제를 진단할 때는 다음 계약을 기준으로 합니다.

- `issueToken`과 `refreshToken`은 app별 **30분당 10회**의 제한을 공유합니다. 요청마다 token을
  발급하지 말고 access/refresh token pair를 cache하세요.
- `issueToken`에서 `channelId`를 생략하면 Extension 등록 같은 app-scoped operation에 쓰는 app
  token을 발급합니다.
- 설치된 Channel의 `channelId`를 지정하면 해당 Channel에서 server-side operation을 실행할 channel
  token을 발급합니다. App이 설치되지 않았거나 permission이 없으면 사용할 수 없습니다.
- 발급 결과의 핵심 필드는 `accessToken`, `refreshToken`, 초 단위 `expiresIn`입니다. Native Function
  요청에는 현재 `accessToken`을 `x-access-token` header로 전달합니다.
- Channel permission은 server가 channel token으로 실행하는 operation을 제한합니다. Manager/User
  permission과 authorization은 WAM host가 현재 사용자와 surface를 기준으로 적용합니다.

정확한 API와 cache 확장 방법은 [TypeScript 인증·Token 레퍼런스](../../reference/typescript/AUTH-AND-TOKENS.md)와
[Go 인증·Token 레퍼런스](../../reference/go/AUTH-AND-TOKENS.md)를 확인하세요.

기본 token cache는 단일 프로세스용 in-memory 저장소입니다. 여러 replica에서는 SDK의 cache interface를 구현한 Redis나 database 같은 shared cache로 token pair를 공유하세요. In-flight deduplication은 프로세스 안에서만 동작하므로 replica 간 refresh를 엄격히 조정해야 하면 storage-side lock도 구현해야 합니다. Access token, refresh token, provider token과 credential을 log나 오류 응답에 남기지 마세요.

OAuth Authorization Code flow는 OAuth Extension과 `ctx.authToken`을 사용합니다. 반면 `client_credentials`, API key, 매장별 credential은 사용자 redirect 기반 OAuth가 아니므로 Config Extension에 저장하고 server-side로 사용합니다.

## Native Function과 Endpoint

Native Function은 앱 Function과 반대 방향의 호출입니다. 앱 서버나 WAM이 AppStore를 통해 Channel이 제공하는 기능을 실행합니다.

- 서버: TypeScript `NativeFunctionClient`, Go `native.Client`
- token lifecycle: TypeScript/Go `TokenManager`
- WAM: `useNativeFunction`

모든 언어가 같은 typed wrapper를 제공한다고 가정하지 말고 [Go 기능 동등성](../../reference/go-feature-parity.md)을 확인하세요. Wrapper가 없을 때만 작은 transport adapter로 격리하고, method와 request/response 계약을 테스트하세요.

Developer portal에는 version이나 WAM 이름이 붙기 전의 root를 등록합니다.

- Function Endpoint: `https://app.example.com/functions`
- 실제 Function 호출: `PUT https://app.example.com/functions/v1`
- WAM Endpoint: `https://app.example.com/resource/wam`
- 실제 WAM UI: `https://app.example.com/resource/wam/tutorial`

## Proto

`proto/`는 TypeScript와 Go가 공유하는 wire contract의 원천입니다. 앱 개발자는 보통 generated proto code를 직접 다루지 않고 각 언어 SDK의 decorator, builder, schema와 타입을 사용합니다. 문서나 예제와 public export가 다르면 public export와 schema 구현을 우선하세요.

다음으로 [Function 등록](functions.md), [Command 가이드](extensions/command.md), [WAM 가이드](wam.md),
[Extension 전체 가이드](extensions.md), 마지막으로 [프로덕션 준비 가이드](app-development.md)를 확인하세요. 실행
가능한 코드는 [TypeScript 튜토리얼](https://github.com/channel-io/app-tutorial-ts)과
[Go 튜토리얼](https://github.com/channel-io/app-tutorial)을 참고하세요.
