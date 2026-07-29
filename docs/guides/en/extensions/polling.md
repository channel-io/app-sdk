# Polling Extension

Use Polling when AppStore should schedule repeated channel- or manager-scoped work. AppStore owns scheduling and
queueing; the app owns target paging, cursors, provider calls, and idempotency.

## Contract

| Function                                | Requirement | Purpose                                 |
| --------------------------------------- | ----------- | --------------------------------------- |
| `extension.polling.metadata.getPollers` | Required    | Declares schedules and target Functions |
| `extension.polling.target.getChannels`  | Conditional | Pages through installed channel targets |
| `extension.polling.target.getManagers`  | Conditional | Pages through channel/manager targets    |
| Poller `functionName`                   | Per poller  | Executes one bounded polling batch      |

Each poller has a positive `intervalSeconds`; `timeoutSeconds` defaults to 30 when omitted, and
`maxConcurrency`/`rps` may bound worker load. `executionScope` defaults to `channel`; choose `manager`
to run with a manager caller. Implement the resolver for every declared scope. Both resolvers receive
the Function name, optional cursor, and a positive limit up to 500. If `hasNextPage` is true,
`nextCursor` is required.

## TypeScript

Use `@Extension({ name: "polling", systemVersion: "v1" })` with
`GetPollersOutputSchema`, `GetPollingTargetChannelsInputSchema`, and
`GetPollingTargetChannelsOutputSchema`, or their `Managers` counterparts. Register the poller handler named by metadata. See the
[TypeScript Polling reference](../../../reference/typescript/extensions/polling.md).

## Go

```go
err := app.Use(polling.Extension().
  GetPollers(handler.GetPollers).
  GetChannels(handler.GetChannels).
  GetManagers(handler.GetManagers))
appsdk.MustRegister(app, "example.poll", handler.Poll)
```

## Authentication and reliability

- Store cursors durably per target/provider connection; never rely on process memory.
- Bound page size, execution time, and provider concurrency. Check cancellation and checkpoint only
  committed progress.
- Use credentials only for the authorized caller in Function context. Manager callers hydrate existing
  manager OAuth, API key, and config paths; Polling does not query credential tables.
- Test pagination, empty pages, duplicate delivery, partial batch failure, rate limits, and retry
  after process restart.

See the [Go Extension reference](../../../reference/go/EXTENSIONS.md).
