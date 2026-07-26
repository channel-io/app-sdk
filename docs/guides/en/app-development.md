# App Development Guide

This guide covers the decisions that remain after the [first-app Quickstart](./quickstart.md):
architecture, security, deployment, and operations. Exact SDK APIs live in the
[TypeScript reference](../../reference/typescript/README.md) and
[Go reference](../../reference/go/README.md). Use the
[TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) or
[Go tutorial](https://github.com/channel-io/app-tutorial) for complete runnable code.

## 1. Design the capability boundary

Start from a user task, then choose the smallest Extension family that exposes it. An Extension
publishes a versioned capability and its metadata/runtime Functions. Standalone Functions are typed
RPCs that can be referenced by Extensions or WAMs. A WAM is optional React UI hosted inside
Channel; keep business rules and privileged provider calls on the server.

Before coding, write down:

- the user action and supported Channel surfaces;
- the Extension family and required Functions;
- input/output schemas and stable error types;
- app-scoped versus channel-scoped Native Function permissions;
- whether a WAM is necessary;
- idempotency, retry, timeout, and provider rate-limit behavior.

See [Concepts](./concepts.md), [Functions](./functions.md), the
[Command guide](./extensions/command.md), the [WAM guide](./wam.md), and the
[Extension decision guide](./extensions.md).

## 2. Separate trust zones

Use three explicit zones:

1. **Channel host:** authenticates the current manager and supplies WAM context.
2. **WAM:** renders validated host data and requests narrow app/native actions.
3. **App server:** verifies signed Function requests, stores credentials, obtains scoped tokens,
   calls providers and Channel operations, and enforces business authorization.

Never put App Secret, Signing Key, refresh tokens, or provider credentials in the WAM. Treat WAM
arguments as untrusted input. If the WAM needs to reference a privileged target, issue a short-lived
server-signed target and re-check channel/caller identity when it returns.

## 3. Authentication and permissions

Verify every inbound Function request against its raw body and Signing Key. Use the SDK signature
middleware/guard rather than hand-written HMAC code. Keep signature bypasses limited to explicit
local tests.

Use `TokenManager` for token caching and refresh:

- app token: Extension registration and app-owned operations;
- channel token: server-side operations in one installed Channel;
- host-authorized native call: actions performed by the current manager from a WAM.

Request only the permissions needed by the selected flow. A valid token does not replace
authorization checks. Read the language-specific authentication and Native Function references.

## 4. Build one vertical slice

Implement one user-visible path end to end before adding more families:

1. shared schema;
2. Function handler and Extension metadata;
3. signature verification and auto-registration;
4. WAM only if needed;
5. one typed Native Function or provider call;
6. unit tests plus an installed-app test.

TypeScript apps normally use NestJS decorators and Zod. Go apps use builders, structs, and typed
handlers. A Go server can serve the same React WAM packages as a TypeScript server.

## 5. Endpoints and deployment

Expose HTTPS roots, not individual Function or WAM names:

| Setting           | Example root                           |
| ----------------- | -------------------------------------- |
| Function Endpoint | `https://app.example.com/functions`    |
| WAM Endpoint      | `https://app.example.com/resource/wam` |

Keep Function and WAM routing under stable roots. Configure health checks separately. Run schema
and migration work before accepting traffic, and make Extension auto-registration safe to retry.
For multiple instances, use shared token storage and ensure registration does not create races.

## 6. Testing and release

Test at four levels:

- schemas and pure business rules;
- Function discovery, errors, signatures, and token scope;
- server/WAM build and endpoint routing;
- installed private app in a test Channel, including denied permissions and retries.

Log operation names, request IDs, latency, and stable error types. Do not log message bodies,
tokens, credentials, or customer/provider data. Define alerts for signature failures, registration
failures, token refresh errors, provider throttling, and elevated Function latency.

Before release, verify rollback, secret rotation, token cache behavior, permission changes, and the
installed app after a fresh process start.

## Next references

- [Command guide](./extensions/command.md)
- [WAM guide](./wam.md)
- [Extension recipes](./extensions.md)
- [TypeScript reference map](../../reference/typescript/README.md)
- [Go reference map](../../reference/go/README.md)
- [Cross-language protocol](../../reference/protocol.md)
