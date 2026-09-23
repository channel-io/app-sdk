# Issue Extension v1

The non-exclusive `issue` extension exposes external issues through five canonical functions:

| Function | Requirement | Result |
| --- | --- | --- |
| `extension.issue.core.searchIssues` | Required | `{issues, next?}` |
| `extension.issue.core.getIssue` | Required | `{issue}` |
| `extension.issue.core.getIssues` | Required | `{results}` |
| `extension.issue.core.getIssueTransitions` | Optional, together with execute | `{stateToken, transitions}` |
| `extension.issue.core.executeIssueTransition` | Optional, together with transitions | `{issue}` |

Use `@Extension({name: "issue", systemVersion: "v1", exclusive: false})`, implement
`IssueExtensionInterface`, and attach the exported `Issue…InputSchema` and
`Issue…OutputSchema` to the corresponding `@Func("core.…")` methods.

All top-level inputs accept and strip extra keys. Authentication and tenant identity must
come from `Context`, never from extra input keys. Single lookup accepts exactly one of
`issueId` or an absolute HTTPS `url`. Search uses `since` / `next`; omit `next` on the final
page. Batch lookup preserves input order and returns exactly one issue or error per ID.

Provider adapters own authorization, pagination and state normalization. `state` is one
of `open`, `unstarted`, `started`, `completed`, `canceled`; preserve original state details
in `providerState`. An unmappable state is `unsupported`, not an invented `open` value.
Return that error per item for batch lookup and at function level for search/single lookup.

Available transitions require a flat input schema. Complex actions may be `externalOnly`
with a reason and provider URL; this does not bypass authorization. Providers must bind
`stateToken` to the issue, caller and current transition conditions, and revalidate at execution.
Deduplicate execution durably by request ID. An uncertain mutation is `outcomeUnknown`;
do not blindly repeat it. Success is `{issue}` without an `operationId` property.

The Go SDK exposes the same functions through `extension/issue.Extension()` and generated
request/response aliases. Wire schemas are shared with the TypeScript canonical registry.
