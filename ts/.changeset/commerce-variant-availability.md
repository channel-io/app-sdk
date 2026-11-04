---
"@channel.io/app-sdk-core": minor
---

Add optional useInventory and availableForSale to CommerceProductVariant so consumers can tell unmanaged inventory and variant-level sellability apart from stock quantity.

Rollout: the App Store validates extension responses against its commerce definition with `additionalProperties: false`, which rejects any field the definition does not declare. Emit these fields only after the App Store definition that accepts them is deployed; until then a getProducts response carrying either field is rejected as an invalid extension response.
