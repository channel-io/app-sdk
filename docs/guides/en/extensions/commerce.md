# Commerce Extension

The Commerce extension registers commerce order lookups, claim actions, and product catalog reads through a helper. The read model is the `id`-based `CommerceOrder` (with `CommerceOrderItem`), and actions wrap their result in an `ActionResult`.

## Go

```go
app := appsdk.New(appsdk.Options{AppID: appID})
err := app.Use(commerce.Extension().
  GetAppConfigs(handler.GetAppConfigs).
  GetOrders(handler.GetOrders).
  RequestCancelOrder(handler.RequestCancelOrder).
  RequestReturnOrder(handler.RequestReturnOrder).
  AcceptReturnOrder(handler.AcceptReturnOrder).
  RequestExchangeOrder(handler.RequestExchangeOrder).
  GetExchangeableItems(handler.GetExchangeableItems).
  ChangeShippingAddress(handler.ChangeShippingAddress).
  GetProducts(handler.GetProducts),
)
```

Supported methods:

- `extension.commerce.core.getAppConfigs`
- `extension.commerce.order.getOrders`
- `extension.commerce.order.requestCancelOrder`
- `extension.commerce.order.requestReturnOrder`
- `extension.commerce.order.acceptReturnOrder`
- `extension.commerce.order.requestExchangeOrder`
- `extension.commerce.order.getExchangeableItems`
- `extension.commerce.order.changeShippingAddress`
- `extension.commerce.product.getProducts`

Reuse the SDK-exported value types for addresses, payments, fulfillment, and claims.

`getProducts` is a catalog read, not a search. Its `searchFilter` accepts `productId` (one id or
several), `state`, and `createdAt`; advertise the keys you accept as the enum `allowedValues` of
`getProductsOptions.fieldConfigs["searchFilter.key"]`, reject any other key, and do not accept
`name`. Each `allowedValues` entry pairs a filter key name (`value`) with the name a person sees when
picking it (`label`). `since` carries the previous `next` cursor, and the app applies a default
`limit` of 10 and caps it at 50.

A product's `state` is the closed set `active` / `inactive`: map a mall-specific state to one of the
two, or leave it unset when you cannot; any other value fails validation for the whole response, not
just the field. The product-level `price` may be absent when a mall prices only its variants — leave
it unset rather than emitting `0`, and read `variants[].price` instead. `currency` is the currency of
the mall connection; emit it together with `price`. `productCode` and `variants[].sku` carry the same
values as `items[].productCode` and `items[].sku` on an order. `sellerProductCode` is the code a
seller assigns to a product by hand, as opposed to the platform-assigned `productCode`; it is a
separate value from `variants[].sku`, not one the variants inherit, and stays unset on platforms that
have no product-level seller code. It is output only and is not defined as a common `searchFilter`
key. As of this version an order's `items[]` and `bundleItems[]` have no counterpart field, and there
is no variant-level seller code slot — do not put one into `variants[].sku`.

## TypeScript

Use `@Extension({ name: "commerce", systemVersion: "v1" })` and the canonical schemas exported by
`@channel.io/app-sdk-server`: `CommerceGetAppConfigsOutputSchema`,
`CommerceGetOrdersInputSchema`/`CommerceGetOrdersOutputSchema`, the action input schemas,
`CommerceResultSchema`, and `CommerceGetProductsInputSchema`/`CommerceGetProductsOutputSchema` for
the product catalog. Use the exact relative names listed above and add the class to the NestJS
providers.

## Authentication, reliability, and testing

- Read provider credentials from Config or OAuth context; never accept credentials from a WAM.
- Bind the requested shop/order to trusted Function context before using an app/channel token.
- Re-read provider order state before every mutation and return an explicit unsupported or failed
  `ActionResult` when the operation cannot be applied.
- Use an idempotency key for cancel, return, exchange, acceptance, and address-change requests.
- Test lookup pagination, partial orders, already-completed claims, duplicate mutation delivery,
  provider timeout, permission denial, and unsupported capabilities.

See the [TypeScript Extension reference](../../../reference/typescript/EXTENSIONS.md) and
[Go Extension reference](../../../reference/go/EXTENSIONS.md).
