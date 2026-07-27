# TypeScript SDK Reference

Start with the localized Quickstart before using this API map. These pages describe exact
TypeScript SDK surfaces; runnable end-to-end code lives in the
[TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts).

## Read by task

| Task                                               | Reference                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Understand server/WAM package boundaries           | [Architecture](./ARCHITECTURE.md)                                        |
| Configure credentials, signatures, and token scope | [Authentication and tokens](./AUTH-AND-TOKENS.md)                        |
| Define and register an Extension                   | [Extensions](./EXTENSIONS.md) and [family index](./extensions/README.md) |
| Call Channel operations from the server            | [Native Functions](./NATIVE.md)                                          |
| Build a React WAM                                  | [WAM SDK](./WAM.md)                                                      |
| Use WAM layout, states, and Bezier presets         | [WAM UI](./WAM-UI.md)                                                    |
| Generate a starter project                         | [CLI](./CLI.md)                                                          |
| Inspect the shared wire envelope                   | [Cross-language protocol](../protocol.md)                                |

## Recommended implementation order

1. Define shared Zod contracts for server and WAM data.
2. Configure `ChannelAppModule`, raw-body capture, `SignatureGuard`, and auto-registration.
3. Implement typed Functions and one Extension family.
4. Add a React WAM only when the flow needs UI.
5. Use `TokenManager` plus typed native clients for server-side Channel operations.
6. Test schema failures, permissions, retries, and the installed app flow.

The installed package exports are authoritative when prose and code disagree. Public JSON payloads
use camelCase.
