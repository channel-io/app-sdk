# Production Readiness Guide

Use this guide after the app works end to end in an installed test Channel. It is not required to
finish the first-app Quickstart. Its purpose is to turn a working Function, Extension, and optional
WAM into a release that can be deployed, rolled back, observed, and operated safely.

Complete the [Concepts](concepts.md), [Extension guide](extensions.md), and the relevant family
recipes first. Exact APIs remain in the [TypeScript reference](../../reference/typescript/README.md)
and [Go reference](../../reference/go/README.md).

## How to use this guide

Treat each section as a release gate. Record the owner, evidence, and rollback decision for every
item that applies to the app.

| Gate        | Evidence before release                                                   |
| ----------- | ------------------------------------------------------------------------- |
| Contract    | Function schemas, Extension discovery, and permissions reviewed           |
| Security    | Signature, credential, authorization, and secret rotation tests pass      |
| Reliability | Retry, idempotency, timeout, token cache, and provider limits are bounded |
| Operations  | Safe logs, metrics, alerts, runbook, and rollback are ready               |
| Runtime     | Server and WAM builds pass in an installed private app                    |

## 1. Freeze the public contract

- Review every public Function name, input/output schema, stable error type, Extension metadata ID,
  and `systemVersion` before release.
- Confirm `getFunctions` discovery contains every metadata Function and referenced runtime Function.
- Exercise one real call for each released capability; registration success alone is not evidence of
  runtime behavior.
- Deploy the compatible Function Endpoint before registration or schema changes because AppStore may
  call discovery immediately.
- Treat permission additions as a product rollout. Verify how existing installations receive or
  approve the new permission before depending on it.

Keep provider-specific operations standalone when they are not part of a standard Extension
contract. Follow the [Function registration guide](functions.md) and
[Extension guide](extensions.md) instead of maintaining a second contract description here.

## 2. Close security and data-handling gaps

- Require App ID, App Secret, and Signing Key at process startup; fail closed when any required value
  is missing.
- Verify every inbound Function request with `x-signature` over the exact raw body. Never disable
  verification in a deployed environment.
- Keep App Secret, Signing Key, refresh token, provider credentials, and server access tokens out of
  WAM bundles, source maps, logs, analytics, and `wamArgs`.
- Validate Function input and WAM host data. A valid token or signature does not replace business
  authorization for the requested Channel, user, manager, or provider resource.
- Document secret rotation order, overlap period, revocation, and verification. Test secret rotation
  before an incident requires it.
- Define log retention, redaction, and deletion policies for customer and provider data.

## 3. Bound failure and concurrency

- Set client, server, and provider timeouts. Do not allow a Function request to wait indefinitely.
- Retry only transient failures with bounded exponential backoff and jitter. Respect provider
  throttling and `Retry-After` when available.
- Give mutations an idempotency key or durable deduplication record. Test duplicate Function, hook,
  polling, and webhook delivery.
- Use shared token cache storage for multiple replicas. Verify refresh locking and fallback token
  issue behavior without exceeding the app token rate limit.
- Make Extension auto-registration idempotent and bounded. Multiple replicas may race at startup, so
  share token state and ensure a registration race cannot create an unbounded retry storm.
- Separate liveness from readiness. A process should not receive traffic until required schema,
  migration, credential, and provider checks have completed.
- Bound queues, batch sizes, cursor progress, WAM payload size, and provider response size.

## 4. Test the release candidate

Verify four layers:

1. schema, serialization, and pure business rules;
2. signature rejection, token scope, permission denial, and structured Function errors;
3. Function discovery, Extension metadata, server/WAM build, and endpoint routing;
4. installed private-app flows in a test Channel, including success, denial, retry, duplicate
   delivery, provider outage, and recovery.

Use the same artifact and configuration shape that production will run. Test TypeScript and Go
server behavior against the same public contract when the app supports both implementations. A Go
server can serve the same React WAM package used by a TypeScript server.

## 5. Add safe observability

Record only fields needed to operate the app:

- operation or full Function name;
- request/correlation ID;
- app deployment version and Extension system version;
- latency, outcome, stable error type, retry count, and provider status category.

Do not log message bodies, tokens, credentials, raw Function input, customer records, provider
payloads, or signed request bodies. Sanitize errors before they reach logs or traces.

Alert on sustained signature failures, Extension registration failure, token refresh errors,
provider throttling, queue lag, Function latency/error-rate increases, and repeated rollback
conditions. Link each alert to an owner and runbook rather than alerting on every individual failure.

## 6. Deploy and roll back safely

- Make database and schema migrations backward compatible with both the previous and next app
  versions. Separate destructive cleanup into a later release.
- Roll out the server before metadata that points to new Functions. Publish WAM assets with immutable
  filenames or verified cache invalidation.
- Use a canary or bounded test installation when the provider, permission set, or Extension contract
  changes materially.
- Define rollback triggers such as elevated Function errors, discovery failure, authorization
  regression, provider saturation, or data-integrity risk.
- Keep the previous server/WAM artifact, configuration, migration position, and permission behavior
  available for rollback. Confirm that registration and discovery return to the compatible contract
  after rollback.
- Run post-deploy smoke tests from an installed Channel and watch the agreed metrics for the release
  window.

## 7. Final launch checklist

- [ ] Public Function and Extension contracts are reviewed and discovery is verified.
- [ ] Signature, permission, business authorization, and secret rotation tests pass.
- [ ] Token cache, registration race, idempotency, timeout, retry, and provider throttling are bounded.
- [ ] Logs and traces contain no credentials or customer/provider payloads.
- [ ] Alerts, dashboards, ownership, and incident runbooks exist.
- [ ] Migration, deployment order, smoke tests, and rollback have been rehearsed.
- [ ] The exact production artifact works in an installed private app.

## Reference map

- [Extension guide and family recipes](extensions.md)
- [Function registration](functions.md)
- [WAM guide](wam.md)
- [TypeScript reference](../../reference/typescript/README.md)
- [Go reference](../../reference/go/README.md)
- [Common protocol](../../reference/protocol.md)
- [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts)
- [Go tutorial](https://github.com/channel-io/app-tutorial)
