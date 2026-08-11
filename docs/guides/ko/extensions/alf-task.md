# ALF Task Extension

Version이 있는 app-provided automation task definition을 공개할 때 사용합니다.

## 계약

`extension.alfTask.alftask.getTasks`가 필수입니다. 공통 `registerExtension` 흐름으로
`alfTask:v1`을 등록하면 task version sync도 함께 시작됩니다.

각 predefined task는 stable version, name, trigger, typed memory schema, workflow node,
`startNodeId`를 포함합니다. Node ID와 `next` reference가 의도한 graph를 이루어야 하며 version은
deployment timestamp가 아니라 개발자가 관리하는 change detector입니다.

## TypeScript

`@Extension({ name: "alfTask", systemVersion: "v1" })`과 `GetAlfTasksResponseSchema`를 사용하고
server가 접근 가능한 뒤 등록합니다.
[TypeScript ALF task 레퍼런스](../../../reference/typescript/extensions/alf-task.md)를 확인하세요.

## Go

```go
err := app.Use(alftask.Extension().GetTasks(handler.GetTasks))
```

Auto-registration도 공통 `RegisterExtension` 흐름을 사용하며 ALF task sync를 시작합니다.

## 신뢰성·검증

- Task key를 안정적으로 유지하고 behavior가 바뀌면 definition version을 올립니다.
- Retry가 side effect를 반복할 수 있는 task execution은 idempotent하게 만듭니다.
- Discovery, extension registration, secondary sync, version readback, invalid definition, 이전
  version rollback을 테스트합니다.
- Task definition에 private workflow data나 secret을 넣지 않습니다.

[Go native 레퍼런스](../../../reference/go/NATIVE.md)도 확인하세요.
