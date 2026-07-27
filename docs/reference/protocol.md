# Cross-Language Protocol

This page describes the wire contract shared by the TypeScript and Go SDKs. App code should use
the selected language API instead of constructing these envelopes or generated proto values by
hand.

## Function request and response

Channel app Functions use a JSON-RPC-like request:

```json
{
  "method": "extension.example.getThing",
  "params": {},
  "context": {
    "caller": { "type": "manager", "id": "manager-id" },
    "channel": { "id": "channel-id" }
  },
  "systemVersion": "v1"
}
```

`method` selects the Function, `params` is its typed input, `context` carries the current runtime
identity, and `systemVersion` selects the Extension contract version. Successful calls return
`{"result": ...}`. Expected app failures return an `error` envelope:

```json
{
  "error": {
    "code": 2,
    "type": "invalidParams",
    "message": "failed to decode params"
  }
}
```

Common codes are `1` for unprocessable input, `2` for bad request, `3` for not found, `4` for
unauthorized, `-32601` for method not found, and `-32603` for internal error. Use a stable `type`
for programmatic handling, a safe human-readable `message`, and optional structured `data`. Never
return credentials or sensitive customer data in errors.

Function discovery uses the reserved `extension.core.function.getFunctions` method. SDK servers
answer it from registered Function schemas.

## JSON Schema

Registration exposes input and output JSON Schemas. TypeScript uses Zod schemas. Go derives a
baseline schema from structs and `json`/`schema` tags and supports explicit schema overrides for
unions, enums, formats, or existing contracts. Public JSON field names are camelCase in both
languages.

Keep schemas deterministic and validate at the Function boundary. Language-specific examples are
in the [TypeScript Extension reference](./typescript/EXTENSIONS.md) and
[Go Functions reference](./go/FUNCTIONS.md).

## Native Function transport

Native Functions reverse the direction: an app calls a Channel-provided operation through
AppStore. The transport uses HTTP `PUT`, a body containing `method` and `params`, and
`x-access-token` when authentication is required. Token scope depends on the operation. Use
`TokenManager` and the typed or generic native clients described in the
[TypeScript Native reference](./typescript/NATIVE.md) and [Go Native reference](./go/NATIVE.md).

## Proto source and generated APIs

The `channel.app.sdk.v1` proto package is the cross-language contract source:

- `context.proto`: caller and runtime context;
- `function.proto`: Function envelopes, discovery, and schemas;
- `error.proto`: Function errors;
- `native.proto`: Native Function envelopes;
- `common.proto`: shared messages, users, chats, WAM results, and availability values;
- `extension.proto`: Extension-family Function inputs and outputs.

Generated code is an SDK implementation detail. TypeScript exports higher-level Zod schemas and
types; Go Extension packages expose generated DTOs directly or through ergonomic aliases. Import
those public language packages rather than generated internal paths.
