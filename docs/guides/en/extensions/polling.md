# Polling Extension

Use Polling when AppStore should schedule repeated channel-scoped work. AppStore owns scheduling and
queueing; the app owns target paging, cursors, provider calls, and idempotency.

## Contract

| Function                                | Requirement | Purpose                                 |
| --------------------------------------- | ----------- | --------------------------------------- |
| `extension.polling.metadata.getPollers` | Required    | Declares schedules and target Functions |
| `extension.polling.target.getChannels`  | Required    | Pages through installed channel targets |
| Poller `functionName`                   | Per poller  | Executes one bounded polling batch      |

Each poller has a positive `intervalSeconds`; `timeoutSeconds` defaults to 30 when omitted, and
`maxConcurrency`/`rps` may bound worker load. `getChannels` receives the Function name, optional
cursor, and a positive limit up to 500. If `hasNextPage` is true, `nextCursor` is required.

## TypeScript

Use `@Extension({ name: "polling", systemVersion: "v1" })` with
`GetPollersOutputSchema`, `GetPollingTargetChannelsInputSchema`, and
`GetPollingTargetChannelsOutputSchema`. Register the poller handler named by metadata. See the
[TypeScript Polling reference](../../../reference/typescript/extensions/polling.md).

## Go

```go
err := app.Use(polling.Extension().
  GetPollers(handler.GetPollers).
  GetChannels(handler.GetChannels))
appsdk.MustRegister(app, "example.poll", handler.Poll)
```

## Authentication and reliability

- Store cursors durably per channel/provider connection; never rely on process memory.
- Bound page size, execution time, and provider concurrency. Check cancellation and checkpoint only
  committed progress.
- Use channel tokens only for the authorized target in Function context.
- Test pagination, empty pages, duplicate delivery, partial batch failure, rate limits, and retry
  after process restart.

See the [Go Extension reference](../../../reference/go/EXTENSIONS.md).
