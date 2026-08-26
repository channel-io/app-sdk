# `userAuthorization` Extension guide

The `userAuthorization` Extension tells AppStore to verify that the current Channel User may use
an identifier in the request before a sensitive app Function runs. Supported identifiers are phone
numbers (`phone`), email addresses (`email`), and member IDs (`memberId`).

For example, when ALF calls `orders.cancel`, the request follows this flow:

```text
ALF calls the order cancellation Function
  → AppStore reads the Function's verification setting
  → AppStore reads the phone number, email address, or member ID from the input
  → Verification fails: AppStore does not call the app Function
  → Verification succeeds: AppStore calls the app Function
  → The app server checks order ownership and cancellation state
  → The app cancels the order only when every business condition passes
```

Think of AppStore verification as an identity check at a building entrance. The app server is the
service desk inside the building, where it must still verify that the person owns the order or
account. Passing the entrance does not grant access to another person's order.

> [!IMPORTANT]
> AppStore currently applies `userAuthorization` only to ALF Task invocations whose `invokeSource`
> is `alfTask` and whose caller is a trusted User. Command, Widget, CustomTab, general Function,
> Manager/System, and legacy direct ALF calls bypass this policy. Keep a separate protection flow
> in the app if those surfaces also require identity verification.

## AppStore and app server responsibilities

### What AppStore verifies

When protection is enabled on a supported invocation, AppStore:

- finds the policy by the exact Function name recorded during discovery;
- applies the Function-level ON/OFF setting saved by the Channel manager;
- verifies that the trusted ALF User matches the `context.user` projected to the app;
- verifies a valid proof for the same Channel, User, and identifier for `phone` and `email`;
- compares the requested `memberId` byte for byte with the current Core User's `memberId`;
- blocks the request before loading OAuth, API key, or Config credentials and before calling the
  app Function when verification fails; and
- attempts one OTP delivery for a missing `phone` or `email` proof and, when accepted, returns the
  information the caller needs to continue verification.

If a protected Function is enabled and AppStore dispatches it for a supported ALF Task User call,
the identifier declared by that request has passed AppStore verification.

### What the app developer must still verify

`userAuthorization` does not decide the app's business authorization. The app server must:

- verify that the User owns the requested order, reservation, account, or document;
- verify business conditions such as order state, refund period, role, and plan;
- compare the AppStore-verified identifier with the owner identifier in app storage;
- protect mutations with a transaction, conditional update, or idempotency key;
- trust `context` only after verifying the AppStore signature on the Function request; and
- keep identifiers, OTPs, tokens, and credentials out of normal logs and error messages.

Both requests below can pass AppStore's `memberId` check when `member-42` is the current User's
correct member ID:

```json
{
  "orderId": "my-order",
  "authorization": { "type": "memberId", "value": "member-42" }
}
```

```json
{
  "orderId": "another-users-order",
  "authorization": { "type": "memberId", "value": "member-42" }
}
```

AppStore verifies that `member-42` belongs to the current User. Only the app server can determine
whether `another-users-order` belongs to `member-42`. Skipping that ownership check can let one
User change another User's order.

## Before you start

- Use TypeScript SDK `@channel.io/app-sdk-server` `0.21.0` or later.
- Confirm that the protected Function is invoked by an ALF Task on behalf of a User.
- Choose string fields in the Function input for the identifier type and value.
- When using `phone` or `email`, confirm that the calling ALF flow supports OTP input and retrying
  the original request. Do not enable the production setting until that flow is ready.
- Start with `enabledByDefault: false` and enable protection in a test Channel first.

The SDK does not currently export a dedicated schema for `userAuthorization` metadata. Define the
Zod schema and metadata Function in the app.

```bash
pnpm add @channel.io/app-sdk-server@^0.21.0 zod
```

## Implement with TypeScript

### 1. Design the protected Function input

Include the identifier type and value explicitly in the Function input. This example supports
phone numbers, email addresses, and member IDs.

```ts
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Context } from "@channel.io/app-sdk-server";
import {
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

export const CancelOrderInputSchema = z
  .object({
    orderId: z.string().min(1),
    authorization: z
      .object({
        type: z.enum(["phone", "email", "memberId"]),
        value: z.string().min(1),
      })
      .strict(),
  })
  .strict();

const CancelOrderOutputSchema = z
  .object({
    cancelled: z.boolean(),
  })
  .strict();

@Injectable()
export class OrderFunctions {
  constructor(private readonly orders: OrdersService) {}

  @Func("orders.cancel")
  @InputSchema(CancelOrderInputSchema)
  @OutputSchema(CancelOrderOutputSchema)
  async cancelOrder(
    @Ctx() ctx: Context,
    @Input() input: z.infer<typeof CancelOrderInputSchema>,
  ) {
    const cancelled = await this.orders.cancelIfOwned({
      channelId: ctx.channel.id,
      orderId: input.orderId,
      identifierType: input.authorization.type,
      identifierValue: input.authorization.value,
    });

    if (!cancelled) {
      throw new Error("The caller cannot cancel this order");
    }

    return { cancelled: true };
  }
}
```

`cancelIfOwned` represents one atomic mutation. It checks ownership and the cancellable state in
the same transaction or conditional update that changes the order. If cancellation also triggers
a refund or another external side effect, use an idempotency key or durable deduplication record so
concurrent calls and retries cannot perform that side effect twice.

Narrow the choices when a Function supports only one identifier. For example, use this schema for
a Function that accepts only phone verification:

```ts
const PhoneAuthorizationSchema = z.object({
  type: z.enum(["phone"]),
  value: z.string().min(1),
});
```

When AppStore builds a Function input UI from this schema, `type` shows only the phone option.

### 2. Implement the metadata Function

The `userAuthorization` metadata Function tells AppStore which Functions to protect and where to
read each identifier from the input.

```ts
import { z } from "zod";
import {
  Extension,
  Func,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

const DescriptionSchema = z
  .object({
    description: z.string().min(1),
  })
  .strict();

const PathSchema = z
  .object({
    path: z.string().min(1),
  })
  .strict();

const UserAuthorizationFunctionSchema = z
  .object({
    functionName: z.string().min(1),
    enabledByDefault: z.boolean().optional(),
    description: z.string().optional(),
    i18nMap: z
      .object({
        ko: DescriptionSchema.optional(),
        en: DescriptionSchema.optional(),
        ja: DescriptionSchema.optional(),
      })
      .strict()
      .optional(),
    identifier: z
      .object({
        type: PathSchema,
        value: PathSchema,
      })
      .strict(),
  })
  .strict();

const UserAuthorizationConfigSchema = z
  .object({
    functions: z.array(UserAuthorizationFunctionSchema).optional(),
  })
  .strict();

@Extension({ name: "userAuthorization", systemVersion: "v1" })
export class UserAuthorizationExtension {
  @Func("metadata.getConfig")
  @InputSchema(z.object({}).strict())
  @OutputSchema(UserAuthorizationConfigSchema)
  getConfig(): z.infer<typeof UserAuthorizationConfigSchema> {
    return {
      functions: [
        {
          functionName: "orders.cancel",
          enabledByDefault: false,
          description:
            "Cancel an order after verifying the customer identifier.",
          i18nMap: {
            ko: {
              description: "주문자 본인 확인 후 주문을 취소합니다.",
            },
            ja: {
              description: "注文者の本人確認後に注文をキャンセルします。",
            },
          },
          identifier: {
            type: { path: "authorization.type" },
            value: { path: "authorization.value" },
          },
        },
      ],
    };
  }
}
```

The full metadata Function name exposed by SDK discovery is:

```text
extension.userAuthorization.metadata.getConfig
```

#### Metadata fields

| Field                   | Purpose                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `functions`             | The app's complete current policy snapshot. Omit it or return an empty array when no Functions are protected. |
| `functionName`          | The exact full Function name exposed through discovery.                                                       |
| `identifier.type.path`  | The input path that resolves to `phone`, `email`, or `memberId`.                                              |
| `identifier.value.path` | The input path that resolves to the identifier string to verify.                                              |
| `enabledByDefault`      | The initial Channel setting. It is `true` when omitted.                                                       |
| `description`           | The default description shown in settings.                                                                    |
| `i18nMap`               | Localized descriptions for `ko`, `en`, and `ja`.                                                              |

`functions` is the app's complete policy snapshot, not a patch. If a Function from the previous
snapshot is missing during re-registration, AppStore removes that policy and its Channel settings.

Registration fails when the snapshot contains a duplicate `functionName`, declares a Function
that is not in discovery, or uses the same path for both identifier fields. AppStore rejects the
whole invalid snapshot and preserves the last valid snapshot.

### 3. Register providers and auto-registration

Add both classes to the NestJS module's `providers`. The SDK cannot discover a class that is not a
provider.

```ts
import { Module } from "@nestjs/common";
import { ChannelAppModule } from "@channel.io/app-sdk-server";

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env.APP_ID!,
      appSecret: process.env.APP_SECRET!,
      signingKey: process.env.SIGNING_KEY!,
      autoRegister: true,
    }),
  ],
  providers: [OrderFunctions, UserAuthorizationExtension],
})
export class AppModule {}
```

Auto-registration is suitable for development and single-instance apps. In a production service
with multiple instances and a rolling deployment, wait until every instance returns identical
`getFunctions` and `getConfig` responses, then run registration once. Registering while different
releases are serving traffic can leave an older metadata response as the latest snapshot.

For controlled registration, obtain an app token and call
`nativeClient.registerExtension(appId, "userAuthorization", "v1", appToken.accessToken)`. Register
only after the Function Endpoint is ready to accept external requests.

### 4. Enable protection in a Channel

After the app is installed in a Channel and registration completes, AppStore settings show one
toggle per Function. AppStore resolves the effective value as follows:

```text
The Channel has an explicit ON/OFF value
  → use the saved value

The Channel has no explicit value
  → use enabledByDefault
```

Omitting `enabledByDefault` means `true`. A newly registered policy can therefore become active in
every existing installation immediately. For an initial rollout, set it to `false` explicitly and
enable it in a controlled test Channel first.

The app must enforce resource authorization even when the setting is OFF. Ownership and state
checks in the app server should always use the same rules.

## Metadata rules

### Match the exact Function name

`functionName` must match the canonical Function name from SDK discovery exactly.

```text
Discovery: orders.cancel
Metadata:  orders.cancel            ✅
Metadata:  extension.orders.cancel  ❌
Metadata:  Extension.Orders.Cancel  ❌
```

AppStore does not trim whitespace, change case, add or remove a prefix, or resolve an alias. For a
supported ALF User invocation of a registered app, calling a name outside the catalog returns
`-32601` even when that Function is not protected.

### Point paths to string fields

A path is a dot-separated JSON object path. The final field for each path must be a string in the
Function input schema.

```json
{
  "authorization": {
    "type": "phone",
    "value": "01012345678"
  }
}
```

Use these paths for that input:

```json
{
  "identifier": {
    "type": { "path": "authorization.type" },
    "value": { "path": "authorization.value" }
  }
}
```

AppStore does not search similar keys or traverse arrays. It validates both paths against the
discovery schema during registration and reads the same paths at runtime.

### Do not add Function versions to metadata

The policy identity is:

```text
(appId, canonicalFunctionName)
```

`systemVersion: "v1"` is the `userAuthorization` metadata contract version, not the protected
Function version. Do not add `targetSystemVersion` or a per-Function `systemVersion` to metadata.
The same canonical Function uses the same policy through versioned and unversioned routes.
AppStore rejects obsolete version fields during registration.

## Guarantees by identifier type

| Type       | What AppStore verifies                                 | What the app server must still verify                        |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `phone`    | A valid proof for the phone number, Channel, and User  | The number matches the order, reservation, or account record |
| `email`    | A valid proof for the email address, Channel, and User | The address matches the app account or protected resource    |
| `memberId` | An exact match with the current Core User's `memberId` | The `memberId` owns the protected resource                   |

A phone or email proof is not permanent ownership. The proof expires, and a phone number or account
record can change. Apply additional controls appropriate to the risk of the operation.

The proof identity does not include an app ID. A proof created by the same User for the same
identifier in the same Channel can be reused by another app's protected Function.

The personal-auth app normalizes phone numbers and email addresses when resolving a proof, but the
protected Function receives the original `params`. Normalize both values according to the app's
storage rules before comparing them.

`memberId` comparison does not trim whitespace, change case, or resolve aliases. Use the same
identity in app storage.

## Runtime results

Supported ALF Task User calls follow this matrix:

| State                                                                  | Result                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| The app did not register `userAuthorization`                           | Call the original method                                |
| The app registered it, but the requested name is absent from discovery | `-32601`; do not call the app Function                  |
| The Function is in the catalog but absent from metadata                | Call the canonical Function without verification        |
| Protection metadata exists, but the setting is OFF                     | Call the canonical Function without verification        |
| Protection is ON, but identifier input is invalid                      | `-32602`; do not call the app Function                  |
| Protection is ON, and verification is required                         | `-32801`; do not call the app Function                  |
| Protection is ON, and AppStore, Core, DB, or personal-auth fails       | `-32000`; do not call the app Function                  |
| Protection is ON, and verification succeeds                            | Call the app Function                                   |
| The request is an ALF Task call without a trusted User                 | Bypass `userAuthorization` and call the original method |
| The invocation is not an ALF Task User call                            | Bypass `userAuthorization` and call the original method |

When a request enters the policy and fails, AppStore does not call the protected Function. The app
server does not receive these errors. The Function caller, such as ALF, receives the error and
chooses the next action.

## OTP verification flow

When a `phone` or `email` proof is missing, AppStore requests one OTP delivery through the
personal-auth app and returns `-32801`. Only an accepted delivery request adds follow-up invocation
data to the error:

```json
{
  "userAuthorization": {
    "otp": {
      "sent": true,
      "appId": "personal-auth-app-id",
      "method": "verifyCode",
      "systemVersion": "v1",
      "identifierType": "email",
      "identifier": "customer@example.com"
    }
  }
}
```

`sent: true` means that the delivery request was accepted. It does not guarantee that the code
arrived on the user's device or in the inbox. A rate limit, delivery failure, or `memberId` failure
can return `-32801` without this `data`. Because `identifier` contains the original value, the
caller must not write this error `data` to normal logs.

The calling ALF integration must:

1. inspect `-32801` and `data.userAuthorization.otp`;
2. ask the User for the OTP;
3. call the provided `verifyCode@v1` Function with the same Channel and User context; and
4. retry the original Function request after verification succeeds.

AppStore does not retry the original request automatically. Make the app Function idempotent so a
retry cannot cause a duplicate cancellation or refund. The protected app server does not need to
accept the OTP or call the personal-auth app directly.

## Error handling

| Code     | Meaning                                                | What to check                                                                  |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `-32601` | Canonical Function not found                           | Exact match among `functionName`, discovery, and the called method             |
| `-32602` | Identifier type or value is missing or invalid         | Function input schema and metadata paths                                       |
| `-32801` | Verification is required or failed                     | Continue when OTP data exists; otherwise explain that verification is required |
| `-32000` | Temporary AppStore, Core, DB, or personal-auth failure | Treat the operation as not executed and retry with a limit                     |

Errors returned after the app Function runs keep their existing contract. Do not copy raw phone
numbers, email addresses, or member IDs into verification error messages.

## Deployment and re-registration

Use this rollout order when changing a policy:

1. Deploy the new Function and metadata to every app server instance.
2. Confirm that every instance returns the same `getFunctions` and `getConfig` responses.
3. Register or re-register `userAuthorization:v1` once.
4. Confirm the Function list and descriptions in a test Channel.
5. Turn on the setting for each Function.
6. Test both verification outcomes and the app's resource authorization.
7. Open the target ALF traffic after verification passes.

When adding or renaming a Function, complete re-registration before sending traffic to the new
name. A new name outside the registered catalog is rejected with `-32601`. To pause protection,
turn the Channel setting OFF instead of unregistering the Extension. Unregistering removes the
snapshot and all Function settings.

## Release checklist

- [ ] The app uses `@channel.io/app-sdk-server` `0.21.0` or later.
- [ ] The protected Function is invoked by a supported ALF Task User flow.
- [ ] `functionName` exactly matches the canonical discovery name.
- [ ] `identifier.type.path` and `identifier.value.path` point to strings in the input schema.
- [ ] `functions` is the app's complete policy snapshot, not a partial update.
- [ ] The initial rollout sets `enabledByDefault: false` explicitly.
- [ ] Every app server instance serves identical discovery and metadata before registration.
- [ ] OFF, ON, invalid input, missing proof, and successful verification have been tested.
- [ ] The app compares `phone`, `email`, and `memberId` with the protected resource owner.
- [ ] Manager calls and excluded invocation surfaces have their own app authorization.
- [ ] Mutations use a transaction, conditional update, or idempotency protection.
- [ ] Identifiers, OTPs, tokens, and credentials do not appear in logs or errors.

Also read [Function registration](../functions.md), the [Extension guide](../extensions.md), the
[TypeScript User Authorization reference](../../../reference/typescript/extensions/user-authorization.md),
and the [production readiness guide](../app-development.md).
