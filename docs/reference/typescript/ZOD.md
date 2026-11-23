# Zod 4 migration

The TypeScript SDK uses Zod 4.6.7 or newer. Upgrade your app's direct `zod` dependencies together with the SDK, including shared server/WAM contracts. Do not force Zod 4 into an older SDK with a package-manager override: the older JSON Schema converter expects Zod 3.

## App-owned schemas

- Use `z.record(z.string(), valueSchema)` for string-keyed maps. A record with an enum key schema requires every enum key in Zod 4; use `z.partialRecord` when keys may be absent.
- Keep schemas passed to SDK decorators and the simple Function API on Zod 4. Zod 3 schemas are not supported.
- Replace Zod 3-specific introspection such as `ZodEffects` and `optionsMap` with Zod 4 APIs. Validation failures still expose `issues`.
- Review Zod 4's validation changes when migrating: integer schemas accept safe integers, string length checks count Unicode code points, and URL checks can normalize surrounding whitespace. The SDK's redirect schemas check the raw URL before normalization; Issue comment bodies retain their explicit 16,000 UTF-16 unit limit.

## Registration metadata

All SDK registration paths use the same native Zod exporter with JSON Schema Draft 7, input semantics, inline reused schemas, and no recursive references. This preserves the accepted input shape of transforms and defaults. Registration fails if a schema contains a recursive cycle or an unsupported non-JSON type such as `Date`, `bigint`, or `symbol`; convert those to JSON representations first.

Native export may add format patterns and safe integer bounds. Plain objects that strip unknown input keys no longer advertise `additionalProperties: false`; strict objects still do. Explicitly mark optional `z.unknown()` and `z.any()` properties with `.optional()` when omission is part of the contract. Runtime refinements remain server-side validation and are not all expressible in JSON Schema.

The Go extension registration fixture is generated from these same TypeScript schemas. The Go SDK's request validation implementation is unchanged.
