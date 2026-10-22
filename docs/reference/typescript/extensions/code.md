# Code session extension

`code/v1` lets a supervising agent use a coding provider through a stable session
contract. The supervisor owns business decisions and user-facing messages. The
app owns provider sessions, persistence, input scheduling and observation.

| Function | Required | Input | Output |
| --- | --- | --- | --- |
| `extension.code.session.sendInput` | yes | `sessionKey`, `text`, optional `context: [{title,text,sourceUrl?}]` | `{sessionKey,accepted:true}` |
| `extension.code.session.getSession` | yes | `sessionKey` | `CodeSessionSnapshot` |
| `extension.code.session.stopSession` | no | `sessionKey`, optional `reason` | `{sessionKey,accepted:true}` |

Use `@Extension("code")`, `@Func("session.sendInput")`, and the exported input and
output schemas. The [reference wiring](../../../../ts/packages/server/src/examples/code-session.ts)
shows all three handlers with a persistence boundary. Register the extension and
its durable store as NestJS providers. It is an integration example, not a working
provider app or a bundled database. Omit the stop handler when unsupported.

`sendInput` finds or creates the provider session and accepts later instructions
or answers. A Receipt means the input or stop request is durably stored; it does
not mean execution or stopping completed. Preserve context after a stop. Keep
provider IDs and internal input IDs private. Resolve absent sessions as an error.

The example requires a verified platform `context.invocation.idempotencyKey` for
mutations and fails before storage when it is absent. The SDK type does not make a platform create,
sign or populate this metadata. A compatible platform runtime must supply it.
Scope deduplication by authenticated app, channel/owner, installation generation
and invocation key; bind the payload and reject a different payload for that key.
Do not infer identity or authority from unknown input fields. The store must
serialize each session and atomically persist input/stop, snapshot, sequence,
event and delivery outbox before returning. Tests with a mocked store only check
that the handler waits for the boundary, not crash recovery or durability.

`CodeSessionSnapshotSchema` validates explicit nullable fields, question/approval
routes, queue counts, errors and observation freshness. `needs_input` requires a
question, and provider UI questions require an HTTPS URL. `idle` does not certify
tests or issue resolution. Results and artifacts may belong to an earlier input.
`stopping` rejects new inputs until stopping is confirmed. Old stop retries must
not cancel newer accepted inputs. Preserve and reconcile uncertain provider POSTs
instead of automatically creating another remote execution.

`CodeSessionEventSchema` is a wire contract for `session.updated` and
`session.message`, not a streaming function. Each event has a stable eventId,
positive decimal sequence, sessionKey, recordedAt and optional occurredAt. An
updated payload must match sessionKey, sequence/version and recordedAt/updatedAt.
A message also advances the persisted snapshot version/time. Persist both facts
atomically. Retry the same ID, sequence and body after a lost acknowledgement.
The SDK validates event structure and updated-payload equality; it cannot verify
sequence continuity against storage. JSON Schema registration expresses structural
conditions; UTF-8 byte limits and equality require runtime validation.

There is no SDK native publication helper or agent wake-up runtime in this change.
A platform rollout must authenticate app publication, resolve a prebound session
owner, durably accept/deduplicate ordered events, and deliver them to an agent
inbox with serial execution. A declared event schema grants no publishing right.
The platform must allocate sessionKey uniquely across an app's owners and
installation generations, bind it before the first app invocation, and reject
reuse by another owner. A new session or reinstallation uses a fresh key.
Do not replace missing runtime support with a successful mock acknowledgement.

Inputs allow future top-level wire fields and strip them before handlers. Outputs
are strict. sendInput JSON is limited to 256 KiB; snapshots and events to 64 KiB.
String limits count Unicode code points. The schemas spell out the same blank
character set for TypeScript, Go and JSON Schema validators.
Timestamps use years 0001–9999, uppercase T/Z, required seconds and an optional
fraction. Numeric offsets require a colon. Leap seconds are excluded.
Use the exported runtime schemas at boundaries, including before sending an event.
Large results need summaries and artifact links with explicit limitations.

## Go

`go/extension/code` provides Proto-backed DTO aliases and the same optional
builder methods: `code.Extension().SendInput(...).GetSession(...)` and optional
`.StopSession(...)`. The builder preserves required zero counts, empty arrays
and nulls when marshaling snapshots. For unknown observation time, use
`structpb.NewNullValue()` in `Observation.ObservedAt`. The Go builder validates raw input against the canonical schema before Proto
decoding, checks output and byte limits, and verifies response session identity.
Both mutations require `fnCtx.Invocation.IdempotencyKey`; the standard request
decoder preserves this field. A compatible platform must still supply and sign
it. The builder does not implement persistent deduplication. Event payload is a Proto
Struct on the wire; validate the matching snapshot/message shape before publishing.

## Verification

Contract tests cover state constraints, event identity and UTF-8 limits. Discovery
tests exercise actual decorator wiring, persistence acknowledgement ordering,
missing trusted metadata, storage errors and output validation. Provider calls,
platform authorization and durable agent delivery require separate integration QA.
