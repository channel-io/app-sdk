# Issue Extension v1

The non-exclusive `issue` extension exposes external issues through canonical functions:

| Function                                      | Requirement                             | Result                      |
| --------------------------------------------- | --------------------------------------- | --------------------------- |
| `extension.issue.core.searchIssues`           | Required                                | `{issues, next?}`           |
| `extension.issue.core.getIssue`               | Required                                | `{issue}`                   |
| `extension.issue.core.getIssues`              | Required                                | `{results}`                 |
| `extension.issue.core.getIssueTransitions`    | Optional, together with execute         | `{stateToken, transitions}` |
| `extension.issue.core.executeIssueTransition` | Optional, together with transitions     | `{issue}`                   |
| `extension.issue.core.getCreateSchema`        | Optional, together with createIssue     | Creation form schema        |
| `extension.issue.core.createIssue`            | Optional, together with getCreateSchema | `{issue}`                   |
| `extension.issue.core.createComment`          | Optional, independent                   | `{commentId, url?}`         |

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

## Optional issue creation

Register `extension.issue.core.getCreateSchema` and `extension.issue.core.createIssue`
together. TypeScript apps can implement the separate `IssueCreateExtensionInterface`;
existing `IssueExtensionInterface` implementations remain valid. Use the corresponding
`IssueGetCreateSchemaInputSchema`, `IssueGetCreateSchemaOutputSchema`,
`IssueCreateIssueInputSchema`, and `IssueCreateIssueOutputSchema`. The Go Issue builder
exposes the same optional pair and request/response types. These SDK definitions require
corresponding platform function definitions before they can be invoked.

`getCreateSchema` accepts optional `selected` (a partial `IssueCreateValues`) and
`page: {key, since}`. An `available` response has an opaque `accountRef` and `fields`;
`externalOnly` instead has `reason` and `externalUrl`. The account reference binds the
form to the current external account and must be returned unchanged on creation. A normal
response describes the whole form; a page response contains only the requested field.
Omit a field's `next` on its last choice page. Invalid or expired cursors are `invalidCursor`.

`IssueCreateFormField` describes a form field with a unique
`key`, `label`, `type` (`text`, `textarea`, `number`, `checkbox`, `select`, or
`multiselect`), optional `required`, `readOnly`, `description`, `defaultValue`, `choices`,
`min`, `max`, `maxLength`, `maxItems`, `next`, and `triggerFieldKeys`. Values are strings,
finite numbers, booleans, or arrays of strings or numbers; choices have a label and a string
or number value. Select choices use one value type, and multiselect values contain no
duplicates. `maxLength` counts UTF-16 code units, `maxItems` counts selections, and
`min`/`max` are inclusive. Omitted `required` and `readOnly` mean false. Required values
cannot be absent, blank, or empty arrays; zero and false are valid. A read-only field has a
default and is not submitted. `triggerFieldKeys` contains `containerId` or `templateId`;
changes to those values require refreshing dependent fields and their pages. A selected or
default choice may be outside the current page; apps must validate it against the live
provider rather than requiring it to appear on that page.

`createIssue` takes `containerId`, optional `title`, `description`, `templateId`, and
`fields: {key, value}[]`, plus `requestId`, `accountRef`, and optional `recoveryOnly`.
The four named values are top-level; other values belong in `fields`. Reject duplicate,
reserved, or undefined field keys, nulls, nested objects, unauthorized values, and invalid
choices. Validate defaults using the same rules. SDK schemas validate the shared shape,
types, and bounds; the app must validate the current dynamic field schema, provider choices,
permissions, and account binding before creation. Success returns `{issue: ExternalIssue}` with `container` required, along with the other
required issue properties.
The request ID is a lowercase UUIDv4 identifying one logical creation. The app owns durable
idempotency and result records: preserve the original input for retries,
reject conflicting reuse, preserve a confirmed issue ID, and do not automatically retry an
uncertain mutation. `recoveryOnly: true` only checks a previously recorded result and must
not create an issue. Return `outcomeUnknown` when no durable record exists, creation has not
executed, is still in flight, or its completion is unknown. Keep the same input and
`requestId`; do not automatically retry creation with a new ID. Return a definitive failure
only when a stored result confirms the original attempt ended without creating an issue.
`unsupported` is for capability gaps, such as an unregistered `createComment`, a disabled
feature, or an unmappable state; an empty recovery result is not a capability gap.

`IssueError` additionally supports `fieldErrors: {key, message}[]` for `invalidInput` and
`recovery: {sourceIssueId, externalUrl?}` when a created issue is known. `rateLimited`
requires a nonnegative integer `retryAfterMs`. Do not expose provider secrets in errors.

## Optional comment creation

Register `extension.issue.core.createComment` independently of issue creation and other
optional functions. Implement `IssueCommentExtensionInterface` and use
`IssueCreateCommentInputSchema` and `IssueCreateCommentOutputSchema`.
The SDK definition requires a corresponding platform function definition before invocation.

Authenticate the manager's personal account and authorize access to the target issue.
`issueId` identifies the stable target, and `accountRef` must exactly match the account
bound to the request. `body` must be nonblank and at most 16,000 UTF-16 code units; pass
it without transformation. Use a dedicated lowercase UUIDv4 `requestId` for each logical
comment. Success returns a nonempty `commentId` and optionally an absolute HTTPS `url`.

The app owns durable deduplication: return the recorded result for the same request and
reject reuse with changed input. `recoveryOnly: true` only reads a previously recorded
result, including by a previously recorded provider comment ID. If there is no record,
it must not create a comment. If a write outcome is unknown, do not resend the write;
recover the recorded result instead. Provider-specific behavior belongs in the adapter,
not the wire contract.
