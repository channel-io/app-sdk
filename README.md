# Channel App SDK

Official TypeScript and Go SDKs, developer guides, and runnable examples for building Channel apps.

> **Building your first Channel app?**
> Start with the first-app Quickstart in [Korean](docs/guides/ko/quickstart.md),
> [English](docs/guides/en/quickstart.md), or [Japanese](docs/guides/ja/quickstart.md).
> It takes you from creating a private app through running a Command, React WAM, and bot/manager
> message flows.

## Choose Your Path

| Goal                            | Start here                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Build and run a first app       | [First-app Quickstart](docs/guides/en/quickstart.md)                                                                                 |
| Understand Channel app concepts | [Guide index](docs/guides/en/README.md) and [Concepts](docs/guides/en/concepts.md)                                                   |
| Build a Command or WAM          | [Command guide](docs/guides/en/extensions/command.md) and [WAM guide](docs/guides/en/wam.md)                                         |
| Build with TypeScript           | [TypeScript reference](docs/reference/typescript/README.md) and [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) |
| Build with Go                   | [Go SDK reference](docs/reference/go/README.md) and [Go tutorial](https://github.com/channel-io/app-tutorial)                        |
| Use a coding agent              | [Build Channel App skill](skills/build-channel-app/SKILL.md)                                                                         |
| Contribute to this SDK          | [SDK contributor workflow](#contributing-to-the-sdk)                                                                                 |

The localized guide indexes provide the same map in
[Korean](docs/guides/ko/README.md), [English](docs/guides/en/README.md), and
[Japanese](docs/guides/ja/README.md).

## Recommended Documentation Order

Start with the Quickstart before reading package references. Continue in this order when you need
to customize or ship the app:

1. **Build and run the first app:** [Korean](docs/guides/ko/quickstart.md),
   [English](docs/guides/en/quickstart.md), or [Japanese](docs/guides/ja/quickstart.md)
2. **Learn Function, Extension, WAM, and authentication boundaries:**
   [Korean](docs/guides/ko/concepts.md), [English](docs/guides/en/concepts.md), or
   [Japanese](docs/guides/ja/concepts.md)
3. **Define typed app Functions and understand the wire contract:** [Korean](docs/guides/ko/functions.md),
   [English](docs/guides/en/functions.md), or [Japanese](docs/guides/ja/functions.md)
4. **Implement Command metadata, actions, and autocomplete:**
   [Korean](docs/guides/ko/extensions/command.md),
   [English](docs/guides/en/extensions/command.md), or
   [Japanese](docs/guides/ja/extensions/command.md)
5. **Build the WAM React UI and host-authorized calls:**
   [Korean](docs/guides/ko/wam.md), [English](docs/guides/en/wam.md), or
   [Japanese](docs/guides/ja/wam.md)
6. **Design, secure, deploy, and operate the app:**
   [Korean](docs/guides/ko/app-development.md),
   [English](docs/guides/en/app-development.md), or
   [Japanese](docs/guides/ja/app-development.md)
7. **Choose an Extension family and follow its recipe:**
   [Korean](docs/guides/ko/extensions.md), [English](docs/guides/en/extensions.md), or
   [Japanese](docs/guides/ja/extensions.md)
8. **Use the language-specific API reference:**
   [TypeScript reference](docs/reference/typescript/README.md), or
   [Go reference](docs/reference/go/README.md)
9. **Keep a complete implementation open while coding:**
   [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) or
   [Go tutorial](https://github.com/channel-io/app-tutorial)

The Quickstart ends with this same reading map. The guides and public SDK exports define the current
contract; the tutorials show it as complete server-and-WAM apps.

## SDKs and Runnable Examples

### TypeScript

Use the TypeScript packages for a NestJS app server, typed Functions, Extension metadata, token and
signature handling, React WAM hooks, and WAM UI components.

- [TypeScript SDK overview](ts/README.md)
- [TypeScript reference](docs/reference/typescript/README.md)
- [Runnable TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts)

### Go

Use `github.com/channel-io/app-sdk/go` for a Go app server, typed Functions, Extension builders,
token and signature handling, and native calls. A Go app can use the same TypeScript/React WAM SDK
for its frontend.

- [Go SDK reference](docs/reference/go/README.md)
- [Go feature parity](docs/reference/go-feature-parity.md)
- [Runnable Go tutorial](https://github.com/channel-io/app-tutorial)

## Contributing to the SDK

The commands below are for developing this SDK repository. App projects should follow the
[Quickstart](docs/guides/en/quickstart.md) and their selected tutorial instead.

### Repository layout

- `proto/`: shared SDK contracts
- `go/`: Go SDK module
- `ts/`: TypeScript SDK workspace and npm packages
- `docs/guides/`: app developer guides in Korean, English, and Japanese
- `docs/reference/`: protocol and language-specific SDK references
- `skills/build-channel-app/`: reusable coding-agent workflow

### Install, build, and test

```bash
make install
make lint
make build
make test
make verify
```

Language-specific targets include `make build-ts`, `make test-go`, `make lint-go`, and
`make proto-lint`.

### Pull requests and releases

Before opening a pull request, run the relevant checks above. When changing protocol definitions or
generated schemas, commit the generated files and run:

```bash
make proto-check
```

TypeScript package releases are managed with Changesets. Add a changeset for a user-visible package
change:

```bash
cd ts
pnpm changeset
```

Do not edit package versions or changelog release sections by hand. The release workflow creates a
release pull request and publishes npm packages when that pull request is merged.

The Go SDK is released separately with module tags such as `go/v0.1.0`. Keep the module path as
`github.com/channel-io/app-sdk/go`.

Because this repository is public, pull requests, commit messages, changelogs, fixtures,
screenshots, and generated files must not include private service URLs, credentials, tokens,
customer data, private repository names, internal task IDs, or organization-specific UUIDs.
Authors and reviewers are responsible for this full policy. CI detects known private identifiers
and internal task IDs with `scripts/check-public-content.sh` and scans secret patterns with
Gitleaks. Report suspected vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Reference Index

- Guide indexes: [Korean](docs/guides/ko/README.md), [English](docs/guides/en/README.md),
  [Japanese](docs/guides/ja/README.md)
- [Agent guide](AGENT.md)
- [Build Channel App skill](skills/build-channel-app/SKILL.md)
- TypeScript: [reference map](docs/reference/typescript/README.md) and
  [package overview](ts/README.md)
- Go: [overview](docs/reference/go/README.md),
  [Functions and schemas](docs/reference/go/FUNCTIONS.md),
  [server and routing](docs/reference/go/SERVER.md),
  [authentication and tokens](docs/reference/go/AUTH-AND-TOKENS.md),
  [Extensions](docs/reference/go/EXTENSIONS.md),
  [native Functions](docs/reference/go/NATIVE.md), and
  [WAM integration](docs/reference/go/WAM.md)
- Shared wire contract: [cross-language protocol](docs/reference/protocol.md)
- Localized WAM guides: [Korean](docs/guides/ko/wam.md), [English](docs/guides/en/wam.md),
  and [Japanese](docs/guides/ja/wam.md)

## License

MIT
