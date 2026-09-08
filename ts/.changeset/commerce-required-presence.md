---
"@channel.io/app-sdk-core": minor
---

Stop dropping order-contract fields whose zero value is a real value. protojson omits a field
without presence when it holds the zero value, so fields the contract declares as required went
missing in common situations — `claims` on an order with no claims, `shippingAmount` on free
shipping, `success: false` on a failed action. The declaration and the wire format disagreed, and
consumers read `undefined` where the contract promised a value.

**Given presence so the value is emitted** (still required) — zero and `false` are real values here:

- `CommerceResultBody.success`
- `OrderPayment.totalAmount` / `itemsAmount` / `shippingAmount` / `discountAmount` /
  `requireRefundBankAccount`
- `CommerceOrderItem.amount`
- `CommerceExchangeableVariant.additionalAmount`

The Go types change from `float64`/`bool` to `*float64`/`*bool`, so an app that fills these must
set them through a pointer. Leaving one unset omits the key exactly as before.

**Dropped from required** — these are repeated fields, and protobuf does not allow `optional` on
them, so an empty list is indistinguishable from an absent one:

- `Order.claims` / `Order.fulfillments`
- `OrderPayment.methods`
- `OperationOptions.required` / `OperationOptions.optional`

The last two are shared by the `order` and `commerce` extensions, so both contracts change.
