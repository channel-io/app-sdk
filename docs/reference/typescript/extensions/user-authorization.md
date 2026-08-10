# User Authorization Extension

Use the `userAuthorization` Extension to declare which app Functions can require end-user
verification. The Extension metadata contract is `v1`; each metadata response declares one target
`systemVersion` shared by every Function in the snapshot.

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

const TargetSystemVersionSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9._-]+$/);
const DescriptionSchema = z.object({ description: z.string() });
const PathSchema = z.object({ path: z.string().min(1) });
const UserAuthorizationConfigSchema = z.object({
  targetSystemVersion: TargetSystemVersionSchema,
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
      targetSystemVersion: "v2",
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
provider and enable SDK auto-registration, or explicitly call
`registerExtension("userAuthorization", "v1")`.

## Snapshot Rules

- `targetSystemVersion` selects the one app Function version whose authorization snapshot this
  response replaces. It is independent from the `userAuthorization` Extension contract version.
- `functions` is the complete protected Function list for `targetSystemVersion`. Omitting it or
  returning an empty array removes all protected Functions from that target-version snapshot.
- Every Function in the response shares the top-level `targetSystemVersion`; do not add a
  Function-level `systemVersion` field.
- `functionName` must exactly match a Function exposed by discovery for the target version.
- Both dot-notation identifier paths must resolve to strings at runtime. The type value is `phone`,
  `email`, or `memberId`; the value path identifies the value to verify.
- `enabledByDefault` defaults to `true` when omitted. Channel-specific settings can override it.
