# Issue Extension v1

The non-exclusive `issue` extension exposes external issues through five canonical functions:

| Function                                      | Requirement                         | Result                      |
| --------------------------------------------- | ----------------------------------- | --------------------------- |
| `extension.issue.core.searchIssues`           | Required                            | `{issues, next?}`           |
| `extension.issue.core.getIssue`               | Required                            | `{issue}`                   |
| `extension.issue.core.getIssues`              | Required                            | `{results}`                 |
| `extension.issue.core.getIssueTransitions`    | Optional, together with execute     | `{stateToken, transitions}` |
| `extension.issue.core.executeIssueTransition` | Optional, together with transitions | `{issue}`                   |

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

Batch item errors use `invalidInput` for invalid issue IDs, matching function input errors.
The legacy `invalidArgument` and `validationFailed` item types are no longer accepted.
Deploy with the corresponding App Store Issue v1 definition update; existing apps must
upgrade their SDK and return the common error type together.

## Optional subscriptions

Register `extension.issue.subscription.start` and `extension.issue.subscription.stop`
together in addition to the core read functions. Existing read-only implementations
are unchanged. TypeScript can implement `IssueSubscriptionExtensionInterface` and use
`@Func("subscription.start")` / `@Func("subscription.stop")` with the exported schemas.
Go exposes `StartSubscription` / `StopSubscription` on the Issue builder.

Start accepts `{subscriptionId, issueId}` and returns `{status:"active", issue,
providerTenantId}` for one issue. Prepare event handling before reading the initial
snapshot; persist the first successful result and return it unchanged on retries.
App Store supplies `context.issueSubscription` with the subscription ID, logical
connection ID and positive connection generation. Authenticate the invocation before
trusting this context, and use channel OAuth only.

Stop accepts `{subscriptionId}` and returns `{stopped:true}` after stopping that
subscription's publications and queued retries. It does not require provider OAuth
or remove provider webhooks. Remember stop for unknown IDs so a delayed start cannot
revive them. A never-started subscription may have no connection context.

These SDK contracts do not enable platform routing or persistence by themselves.
Deploy the corresponding App Store subscription authorization/routing implementation
before registering this optional group. Event publication and the Issue receiver are
separate dependencies; a schema-valid response is not proof of durable processing.
