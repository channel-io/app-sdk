# ALF Task Extension

Use ALF task to publish versioned app-provided automation task definitions.

## Contract

`extension.alfTask.alftask.getTasks` is required. Register `alfTask:v1` through the common
`registerExtension` flow. Successful registration also synchronizes task versions.

Each predefined task contains a stable version, name, trigger, typed memory schema, workflow nodes,
and `startNodeId`. Node IDs and `next` references must form the intended graph; a version is the
developer-owned change detector, not a deployment timestamp.

## TypeScript

Use `@Extension({ name: "alfTask", systemVersion: "v1" })` with
`GetAlfTasksResponseSchema`. Register after the server is reachable. See the
[TypeScript ALF task reference](../../../reference/typescript/extensions/alf-task.md).

## Go

```go
err := app.Use(alftask.Extension().GetTasks(handler.GetTasks))
```

Auto-registration uses the common `RegisterExtension` flow and triggers ALF task sync.

## Reliability and verification

- Keep task keys stable and increment the definition version for behavior changes.
- Make task execution idempotent where a retry can repeat side effects.
- Verify discovery, extension registration, secondary sync, returned versions, invalid definitions,
  and rollback to a previous version.
- Do not include private workflow data or secrets in task definitions.

See the [Go native reference](../../../reference/go/NATIVE.md).
