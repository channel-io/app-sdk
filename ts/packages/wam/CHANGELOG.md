# @channel.io/app-sdk-wam

## 0.23.1

### Patch Changes

- Updated dependencies [186ad95]
  - @channel.io/app-sdk-core@0.23.1

## 0.23.0

### Patch Changes

- Updated dependencies [49eb8be]
- Updated dependencies [3db1aac]
- Updated dependencies [2e304e0]
  - @channel.io/app-sdk-core@0.23.0

## 0.22.0

### Patch Changes

- Updated dependencies [cd0e937]
- Updated dependencies [4b31e78]
- Updated dependencies [2794296]
  - @channel.io/app-sdk-core@0.22.0

## 0.21.1

### Patch Changes

- Updated dependencies [cc224b5]
  - @channel.io/app-sdk-core@0.21.1

## 0.21.0

### Patch Changes

- Updated dependencies [aac3364]
  - @channel.io/app-sdk-core@0.21.0

## 0.20.1

### Patch Changes

- Updated dependencies [7632db8]
- Updated dependencies [2ca28c1]
  - @channel.io/app-sdk-core@0.20.1

## 0.20.0

### Patch Changes

- @channel.io/app-sdk-core@0.20.0

## 0.19.1

### Patch Changes

- @channel.io/app-sdk-core@0.19.1

## 0.19.0

### Patch Changes

- 56e6092: Add versioned app-function WAM render snapshot contracts and a compatibility hook for legacy public snapshots.
- Updated dependencies [b3b2ed3]
- Updated dependencies [56e6092]
  - @channel.io/app-sdk-core@0.19.0

## 0.18.2

## 0.18.1

## 0.18.0

## 0.17.2

## 0.17.1

## 0.17.2

## 0.16.5

## 0.16.4

## 0.16.3

## 0.16.2

## 0.16.1

## 0.16.0

### Minor Changes

- 825e4bd: Replace the Store extension's runtime-oriented `profile` response with the persisted App Store metadata contract. `getStoreProfile` now returns `relatedAppIds` and localized `i18nMap` content (`images`, `intro`, and `faqs`) directly.

## 0.15.8

### Patch Changes

- 18aaa89: Add notebook extension contracts and native app notebook helpers.

## 0.15.7

## 0.15.6

## 0.15.5

## 0.15.4

## 0.15.3

## 0.15.2

## 0.15.1

## 0.15.0

## 0.14.0

## 0.13.1

## 0.13.0

## 0.12.1

## 0.12.0

## 0.11.1

## 0.11.0

## 0.10.0

## 0.9.1

## 0.9.0

## 0.8.0

## 0.7.3

## 0.7.2

## 0.7.1

## 0.7.0

### Minor Changes

- 63114c2: Add the first-class `config` extension surface, including schema exports, interfaces, decorator support, and `context.config` for runtime handlers and tests.

  Align the config schema with AppStore's setup WAM contract and mark the legacy API key extension as deprecated for new setup surfaces.

## 0.6.12

## 0.6.11

## 0.6.10

## 0.6.9

## 0.6.8

## 0.6.7

## 0.6.6

## 0.6.5

## 0.6.4

## 0.6.3

## 0.6.2

## 0.6.1

## 0.6.0

## 0.5.0

## 0.4.2

## 0.4.1

## 0.4.0

### Minor Changes

- 1053ead: Unify context types and improve server infrastructure
  - Remove `ExtensionContext` and `FunctionContext`; unify into single `Context` type aligned with Go `ChannelContext`
  - Add `apiCredentials` to `Context`
  - Change `ValidateCredentialsInput` from wrapped object to flat record; remove `ValidateCredentialsInputSchema`
  - Update `ApiKey` extension schema and CLI `add` command
  - Improve `NativeFunctionClient` design and add token caching to `ChannelAppService`
  - Fix extension registration timing based on `HttpAdapterHost`

## 0.3.1

## 0.3.0

### Minor Changes

- ### Bug Fixes
  - **SignatureGuard**: Fix raw body handling for HMAC signature verification

  ### Features
  - **TokenManager**: TTL-based token caching with auto-refresh, thundering herd prevention, app/channel/manager/user token support
  - **MessageBuilder**: Chaining API for message composition with typed blocks, buttons, files, and mention() helper
  - **Native Function Types**: Typed wrappers for registerExtension, registerCommands, registerAlfTasks, getAlfTaskVersions
  - **ProxyAPI Types**: Typed wrappers for writeGroupMessage, getManager, searchManagers, getUser, and 11 more Channel API functions
  - **Core Extension**: Auto-register "core" extension for apps without @Extension decorators
  - **CJS Compatibility**: Add "default" export condition for CommonJS consumers

### Patch Changes

- cfb8641: Add "default" condition to package exports for CJS compatibility

  Generated NestJS apps compile to CommonJS (`"module": "commonjs"`), but the SDK
  only had `"import"` condition in exports, causing `ERR_PACKAGE_PATH_NOT_EXPORTED`
  at runtime. Adding `"default"` as a fallback condition resolves this.

## 0.2.0

## 0.1.1

### Patch Changes

- 9e5680f: Add "default" condition to package exports for CJS compatibility

  Generated NestJS apps compile to CommonJS (`"module": "commonjs"`), but the SDK
  only had `"import"` condition in exports, causing `ERR_PACKAGE_PATH_NOT_EXPORTED`
  at runtime. Adding `"default"` as a fallback condition resolves this.

## 0.1.0

### Minor Changes

- Initial release of Channel.io App SDK packages
