# Config OAuth Client Credentials Design

## Goal

Allow a Config Extension to declare which persisted fields contain the OAuth client ID and client secret used for that Config. Apps that omit the declaration continue using their app-level OAuth client credentials.

## Public contract

`GetConfigSchemaOutput.oauth` gains an optional `clientCredentials` property:

```typescript
{
  oauth: {
    clientCredentials: {
      clientIdFieldKey: "clientId",
      clientSecretFieldKey: "clientSecret",
    },
  },
}
```

The two values are field-key references, not OAuth credentials. They identify fields persisted by the Config Extension. The SDK preserves the declaration when it parses the Config schema; the platform resolves and validates the referenced values when an OAuth operation needs them.

The protobuf source of truth adds:

```proto
message ConfigOAuthClientCredentials {
  string client_id_field_key = 1;
  string client_secret_field_key = 2;
}

message ConfigOAuth {
  repeated ConfigOAuthAdditionalParam additional_params = 1;
  ConfigOAuthClientCredentials client_credentials = 2;
}
```

TypeScript and Go expose the generated contract through their existing Config Extension APIs. `ConfigOAuth.additionalParams` remains unchanged.

## Validation and compatibility

The new property is optional. A schema without `oauth.clientCredentials` has the same parsed representation and behavior as before.

Both field-key strings are required when `clientCredentials` is present. The SDK does not cross-validate the references against Config blocks or require a particular storage class. The platform owns runtime lookup and error handling because stored values and active Config selection are unavailable while the SDK parses the schema.

No OAuth token, client ID, or client secret is added to registration payloads beyond the existing Config values. Only field names are declared in the schema.

## Implementation

The protobuf contract remains the source of truth. Generated TypeScript, Zod, and Go files are regenerated rather than edited by hand. The handwritten TypeScript schema, public exports, Go aliases, and Config Extension reference documentation expose the new message consistently.

The TypeScript package receives a minor changeset because this is an additive public API.

## Verification

- A Config schema test proves that parsing preserves both field-key references.
- Proto field-parity coverage includes the new public message.
- Generated artifacts are checked with the repository's Proto checks.
- `make verify` validates linting, formatting, generated-code parity, builds, and tests.
