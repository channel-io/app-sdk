---
"@channel.io/app-sdk-core": patch
---

Export Go aliases for the commerce order value types added alongside the widened order contract —
`TaxLine`, `Attribute`, `ShippingLine`, `Transaction`, and `Metafield`. Their generated code lives
under an internal package, so without an alias an app could see the fields in the schema but had no
way to construct the values. A compile-time test now fails if a future message is added without one.
