# Polling Extension

AppStore가 channel 또는 manager 단위 작업을 반복 실행해야 할 때 사용합니다. AppStore는 scheduling과 queueing을,
앱은 target paging, cursor, provider 호출, idempotency를 담당합니다.

## 계약

| Function                                | 필수 여부     | 역할                             |
| --------------------------------------- | ------------- | -------------------------------- |
| `extension.polling.metadata.getPollers` | 필수          | Schedule과 target Function 선언  |
| `extension.polling.target.getChannels`  | 조건부        | 설치된 channel target pagination |
| `extension.polling.target.getManagers`  | 조건부        | channel/manager target pagination |
| Poller의 `functionName`                 | Poller별 필수 | 제한된 polling batch 실행        |

각 poller의 `intervalSeconds`는 양수입니다. `timeoutSeconds`를 생략하면 30초이며
`maxConcurrency`/`rps`로 worker 부하를 제한할 수 있습니다. `executionScope`의 기본값은 `channel`이며,
manager caller로 실행하려면 `manager`를 사용합니다. 선언한 scope별 resolver를 구현해야 합니다. 두 resolver는
Function name, optional cursor, 최대 500의 양수 limit을 받습니다. `hasNextPage`가 true면 `nextCursor`가 필수입니다.

## TypeScript

`@Extension({ name: "polling", systemVersion: "v1" })`과 `GetPollersOutputSchema`,
`GetPollingTargetChannelsInputSchema`, `GetPollingTargetChannelsOutputSchema` 또는 대응하는 `Managers` schema를 사용합니다. Metadata가
지정한 poller handler도 등록합니다. [TypeScript Polling 레퍼런스](../../../reference/typescript/extensions/polling.md)를
확인하세요.

## Go

```go
err := app.Use(polling.Extension().
  GetPollers(handler.GetPollers).
  GetChannels(handler.GetChannels).
  GetManagers(handler.GetManagers))
appsdk.MustRegister(app, "example.poll", handler.Poll)
```

## 인증·신뢰성

- Cursor는 target/provider connection별 durable storage에 저장합니다.
- Page size, 실행 시간, provider concurrency를 제한하고 committed progress만 checkpoint합니다.
- Function context가 인가한 caller의 credential만 사용합니다. Manager caller는 기존 manager OAuth, API key,
  config 경로를 hydrate하며 Polling이 credential table을 직접 조회하지 않습니다.
- Pagination, empty page, duplicate delivery, partial batch failure, rate limit, process restart 뒤
  retry를 테스트합니다.

[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)도 확인하세요.
