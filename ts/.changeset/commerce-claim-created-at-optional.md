---
"@channel.io/app-sdk-core": minor
---

`Claim.createdAt` is no longer required in the commerce (and legacy order) contract. Some malls do
not return a claim creation timestamp at all, and because the proto3 field is a plain `double` with
no presence, an unset value is indistinguishable from `0` and JSON serialization drops the key
entirely. Declaring it required meant output validation rejected responses those malls legitimately
produce, so the contract stops promising a field it cannot guarantee.

Only the canonical schema's `required` list changes; the generated field type is unaffected, so no
builder or accessor code needs updating. Consumers that read `claim.createdAt` should now treat it
as possibly absent.
