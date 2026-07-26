# Extension 전체 가이드

Extension은 typed app Function을 Channel의 표준 기능에 연결합니다. Handler를 작성하기 전에
공식 Extension을 선택하고 SDK schema와 function name을 재사용하세요. 앱 고유 비즈니스 동작은
standalone Function으로 둡니다. Extension 등록과 실제 실행은 별개이므로 `registerExtension`
성공만으로 metadata discovery와 handler 동작이 확인된 것은 아닙니다.

모든 Extension은 다음 순서로 구현합니다.

1. Function이 실제로 사용하는 최소 permission만 활성화합니다.
2. SDK schema로 metadata Function과 metadata가 참조하는 Function을 구현합니다.
3. App token으로 Extension을 한 번 등록합니다.
4. Discovery, 정상 호출, 잘못된 입력, 권한 누락, retry를 테스트합니다.
5. App Secret, Signing Key, app/channel token, provider credential을 WAM에 넣지 않습니다.

TypeScript는 일반적으로 `@Extension`과 `@Func`를 사용합니다. Go는
`extension/{family}` typed builder를 우선 사용하세요. 아래 각 family 상세 문서가 두 언어의 구현,
인증, WAM, 신뢰성, 테스트를 함께 설명하고 정확한 TypeScript schema와
[Go Extension 레퍼런스](../../reference/go/EXTENSIONS.md)를 연결합니다.

먼저 [Function 등록](functions.md)에서 공통 wire contract를 확인하고, UI를 여는 Extension은
[WAM 가이드](wam.md)를 함께 적용하세요.

## Config

`config`는 API key, `client_credentials`, shop identifier, scope별 설정에 사용합니다.
`extension.config.metadata.getConfigSchema`를 구현하고, 필요하면 validation/save/delete Function을
추가합니다. Secret field는 credential로 표시하고 안정적인 key가 아니라 label만 번역하세요.
주입된 값은 Function context에서 읽고 WAM으로 전달하지 않습니다.

[Config 상세](extensions/config.md)

## OAuth

`oauth`는 외부 provider의 Authorization Code flow에만 사용합니다.
`extension.oauth.metadata.getAuthConfig`를 구현하고 `oauth:v1`을 등록합니다. Redirect state와
연결 정보는 AppStore가 관리하고 provider token은 `ctx.authToken`으로 주입합니다. API key나
`client_credentials`는 OAuth가 아니라 Config에 저장합니다.

[OAuth 상세](extensions/oauth.md)

## Command

`extension.command.metadata.getCommands`가 Desk command를 공개합니다. 각 command는 standalone
또는 Extension Function의 정확한 전체 이름을 참조해야 합니다. Command는 text를 반환하거나
동작을 수행하거나 WAM을 열 수 있습니다. Command discovery와 action handler를 각각 테스트하세요.

[Command 상세](extensions/command.md) · [WAM 가이드](wam.md) ·
[TypeScript 튜토리얼](https://github.com/channel-io/app-tutorial-ts) ·
[Go 튜토리얼](https://github.com/channel-io/app-tutorial)

## Widget

`extension.widget.metadata.getWidgets`가 context별 widget을 공개합니다. Metadata는 노출 surface와
action Function을 정하고 action은 WAM을 열 수 있습니다. Chat, user, manager context는 surface에
따라 없을 수 있으므로 optional로 처리하고 native action의 permission을 확인합니다.

[Widget 상세](extensions/widget.md)

## Custom tab

`extension.customtab.metadata.getCustomTabs`가 앱 tab을 공개합니다. Tab identifier는 안정적으로
유지하고 action에는 정확한 Function 이름을 지정하며 상호작용 UI는 WAM으로 제공합니다. Metadata와
`wamArgs`에 token이나 private record를 넣지 않습니다.

[Custom tab 상세](extensions/customtab.md)

## Hook

`extension.hook.metadata.getHooks`가 event-driven Function을 선언합니다. Handler는 idempotent하게
만들고 서명된 app Function 요청만 처리하며 비동기 처리할 수 있는 event에는 빠르게 응답합니다.
공개 `webhook.received` target은 public `targetId`, entropy가 높은 `endpointToken`, payload 검증,
replay 방지, secret rotation이 필요합니다.

[Hook 상세](extensions/hook.md)

## Polling

`extension.polling.metadata.getPollers`가 schedule poller를 선언합니다. `target.getChannels` 같은
target resolver가 설치 채널을 page 단위로 반환하고 각 poller는 호출할 전체 Function 이름을
지정합니다. Cursor를 영구 저장하고 retry를 idempotent하게 만들며 batch 크기와 실행 시간을
제한하고 부분 실패를 테스트하세요.

[Polling 상세](extensions/polling.md)

## Calendar

`calendar`는 calendar/event type 조회, availability, booking 생성·취소·변경·조회에 사용합니다.
Provider credential은 server에 두고 timezone을 명시적으로 정규화하며 booking mutation을
idempotent하게 만드세요. Slot 선택 UI는 WAM이, provider 호출은 server Function이 담당합니다.

[Calendar 상세](extensions/calendar.md)

## Store

`extension.store.metadata.getStoreProfile`이 store identity와 presentation metadata를 공개합니다.
AppStore는 등록·동기화 때 이 profile을 읽습니다. 안정적인 ID와 번역 label을 분리하고 provider
credential을 profile에 포함하지 않습니다.

[Store 상세](extensions/store.md)

## DataSource

DataSource metadata는 catalog, table, column, table description을 제공합니다. Query는 일반 app
Function route가 아니라 인증된 DataSource gRPC endpoint에서 실행됩니다. `x-access-token`을
검증하고 catalog/table allowlist, parameterized SQL, row/time limit을 적용하며 Arrow 호환 결과를
stream하세요. SDK는 PostgreSQL과 BigQuery용 runner를 제공합니다.

[DataSource 상세](extensions/datasource.md) ·
[Go 예제](../../reference/go/EXTENSIONS.md#datasource-extension-and-query-server)

## Commerce

새 commerce 앱은 재설계된 `commerce` Extension을 사용합니다. ID 기반 order model, buyer,
order 조회, cancel/return/exchange request, 교환 가능 상품, 배송지 변경, 구조화된 `ActionResult`를
제공합니다. Mutation 전에 provider 상태를 검증하고 provider가 지원하지 않는 동작은 명시적인
unsupported 결과로 반환하세요.

[Commerce 상세](extensions/commerce.md)

## WMS

`wms`는 warehouse/order-management provider를 연결합니다. Order 조회, cancel/return/exchange
restore flow, 배송지 변경에는 ID 기반 `extension.wms.order.*` Function을 사용합니다. Shop 설정을
명시적으로 요구하고 변경 작업은 안전한 환경에서 복구 가능성까지 테스트하세요.

[WMS 상세](extensions/wms.md)

## Messaging

Messaging은 inbox, prebuilt messaging, follow-up, medium-link, CHX integration을 포함합니다.
다른 family보다 AppStore contract 의존성이 높아 generic registration과 여러 channel-scoped
native Function을 함께 사용합니다. 필요한 native claim을 먼저 설계하고 외부 conversation/message
mapping을 저장하며 webhook·polling delivery를 idempotent하게 만드세요. 적절한 user/manager
authorization 없이 사용자를 대신하지 않습니다.

[Messaging 상세](extensions/messaging.md)

## ALF task

`extension.alfTask.alftask.getTasks`가 versioned automation task를 공개합니다. 등록은
`registerExtension("alfTask", "v1")`과 `registerAlfTasks` 두 단계입니다. Task key를 안정적으로
유지하고 동작이 바뀌면 version을 올린 뒤 sync된 version을 확인하세요.

[ALF task 상세](extensions/alf-task.md)

## Notebook

`extension.notebook.core.getNotebooks`가 versioned notebook definition을 공개하고 등록 후
`registerAppNotebooks` sync가 필요합니다. Notebook/cell key는 안정적으로 유지하고 definition이
바뀌면 version을 올리며 외부 data를 render할 때는 untrusted input으로 처리합니다.

[Notebook 상세](extensions/notebook.md)

## Mail relay

`mailRelay`는 `extension.mailRelay.inbound.onMailReceived`로 정규화된 mail event를 받습니다.
TypeScript `0.17.2`에서는 이 전체 이름을 standalone `@Func`로 등록하고
`registerExtension("mailRelay", "v1")`을 명시적으로 호출합니다. Go에는 typed builder가 있습니다.
Relay token을 검증하고 attachment/body 크기를 제한하며 message ID를 deduplicate하고 mail 원문을
log에 남기지 않습니다.

[Mail relay 상세](extensions/mail-relay.md)

## 검증 체크리스트

- Metadata가 SDK schema와 정확한 전체 Function 이름을 사용합니다.
- Extension provider 또는 Go builder가 한 번만 등록됩니다.
- Signature가 없거나 잘못된 Function 요청을 거부합니다.
- App/channel token은 cache·refresh하고 manager/user authorization은 WAM host에 맡깁니다.
- Provider credential은 Config/OAuth에서 주입하고 client에 반환하지 않습니다.
- Mutation은 idempotent하거나 안전하게 retry할 수 있고 permission failure가 명확합니다.
- 설치된 test app에서 discovery와 실제 호출을 한 번 이상 통과합니다.
