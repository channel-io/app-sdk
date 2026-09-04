---
"@channel.io/app-sdk-core": patch
---

Export Go aliases for the commerce order value types added alongside the widened order contract —
`TaxLine`, `Attribute`, `ShippingLine`, `Transaction`, and `Metafield`. Their generated code lives
under an internal package, so without an alias an app could see the fields in the schema but had no
way to construct the values.

A test walks the proto descriptors reachable from the order contract and fails when one of those
messages has no alias in the commerce package, so adding a message without exporting it is caught
rather than discovered by the first app that needs the value.
