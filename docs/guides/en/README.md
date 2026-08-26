# Channel App SDK Guides

These guides give Channel app developers one shared model for the TypeScript and Go SDKs.

## Recommended reading order

1. [Quickstart](quickstart.md): create a private app and run the Command, WAM, and message flows.
2. [Concepts](concepts.md): learn the Function, Extension, WAM, authentication, and token boundaries.
3. [Function registration](functions.md): read the wire contract and define standalone typed app Functions.
4. [Command guide](extensions/command.md): implement metadata, actions, and autocomplete.
5. [WAM guide](wam.md): implement the React UI, host authorization, and app/native Function calls.
6. [Extension guide and family recipes](extensions.md): understand registration, select a capability, and implement its contract.
7. [Production readiness guide](app-development.md): verify security, reliability, operations, deployment, and rollback before launch.
8. Use the [TypeScript reference map](../../reference/typescript/README.md) or
   [Go reference](../../reference/go/README.md) for language-specific APIs.
9. Keep the [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) or
   [Go tutorial](https://github.com/channel-io/app-tutorial) open as a complete implementation.

## Feature guides

- [`userAuthorization` Extension guide](extensions/user-authorization.md): separate ALF identity verification from app-owned resource authorization.

## Choosing a SDK

Use the TypeScript SDK for NestJS, Zod, and WAM React development. Use the Go SDK for typed
functions, native calls, and extension helpers in a Go service.

The guides and public SDK exports define the current contract. The tutorials provide complete,
runnable implementations of that contract.

## Runnable examples

- [TypeScript app tutorial](https://github.com/channel-io/app-tutorial-ts)
- [Go app tutorial](https://github.com/channel-io/app-tutorial)

## Language references

- [TypeScript reference map](../../reference/typescript/README.md)
- [Go reference](../../reference/go/README.md), including Functions, server, auth and tokens, Extensions, native Functions, and WAM integration
