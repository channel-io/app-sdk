# User Authorization Extension

Use the `userAuthorization` Extension to declare which app Functions can require end-user
verification. Extension `v1` is a metadata and routing contract only: it describes the Functions
that carry user-authorization policy metadata.

> Current AppStore enforcement is limited to ALF Task invocations with a trusted User. Command,
> Widget, CustomTab, general Function, Manager/System, and legacy direct ALF calls bypass this
> policy. Do not rely on this Extension to protect those surfaces.

For the end-to-end contract, rollout guidance, and the boundary between identity verification and
app-owned resource authorization, read the developer guide in
[English](../../../guides/en/extensions/user-authorization.md),
[Korean](../../../guides/ko/extensions/user-authorization.md), or
[Japanese](../../../guides/ja/extensions/user-authorization.md).

## Metadata Function

Implement `metadata.getConfig` with the generic decorators. The SDK intentionally does not export a
shared schema or helper for this metadata, so keep its validation schema in the app:

```ts
import { z } from "zod";
import {
  Extension,
  Func,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

const DescriptionSchema = z.object({ description: z.string() });
const PathSchema = z.object({ path: z.string().min(1) });
const UserAuthorizationConfigSchema = z.object({
  functions: z
    .array(
      z.object({
        functionName: z.string().min(1),
        identifier: z.object({ type: PathSchema, value: PathSchema }),
        enabledByDefault: z.boolean().optional(),
        description: z.string().optional(),
        i18nMap: z
          .object({
            ko: DescriptionSchema.optional(),
            en: DescriptionSchema.optional(),
            ja: DescriptionSchema.optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

@Extension({ name: "userAuthorization", systemVersion: "v1" })
export class UserAuthorizationExtension {
  @Func("metadata.getConfig")
  @InputSchema(z.object({}))
  @OutputSchema(UserAuthorizationConfigSchema)
  getConfig() {
    return {
      functions: [
        {
          functionName: "orders.get",
          identifier: {
            type: { path: "identifier.type" },
            value: { path: "identifier.value" },
          },
          enabledByDefault: false,
        },
      ],
    };
  }
}
```

The routed metadata Function name is
`extension.userAuthorization.metadata.getConfig`. Register the decorated class as a NestJS
provider and enable SDK auto-registration. For controlled registration, first deploy a compatible
Function Endpoint that can answer external discovery and metadata requests. AppStore may call
`getFunctions` immediately after registration. Then obtain an app token and call
`nativeClient.registerExtension(appId, "userAuthorization", "v1", appToken.accessToken)`.

## Contract Rules

- `functions` contains the app Functions for which the response declares user-authorization
  metadata. Omit it or return an empty array when there are no such Functions.
- `functionName` must exactly match the canonical Function name exposed by discovery. For example,
  use `orders.get` when discovery exposes `orders.get`; do not use an alias or display label.
- Policy identity is the app ID and canonical Function name. The SDK registry routes the canonical
  Function name to its handler globally; this Extension does not add a separate dispatch rule.
- The Extension contract version is `v1`. It does not impose an app Function version, a capability
  declaration, or an SDK major-version requirement.
- Both dot-notation identifier paths must resolve to strings at runtime. The type value is `phone`,
  `email`, or `memberId`; the value path identifies the value to verify.
- `enabledByDefault` defaults to `true` when omitted. Channel-specific settings can override it.
