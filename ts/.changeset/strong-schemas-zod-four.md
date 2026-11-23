---
"@channel.io/app-sdk-core": minor
"@channel.io/app-sdk-server": minor
"@channel.io/app-sdk": minor
---

Use Zod 4.6.7 for runtime validation and its native JSON Schema exporter. Update app-owned Zod dependencies and schema definitions together when upgrading the SDK; Zod 3 schemas are no longer supported.

Registration exports inline Draft 7 input schemas, including defaults and transforms. Unsupported non-JSON types and recursive schemas now fail registration explicitly. The shared Go registration fixture is regenerated from the same TypeScript schemas.

Preserve redirect URL validation before URL normalization and the Issue comment body's 16,000 UTF-16 unit limit. New TypeScript starters and bundled examples use Zod 4. See the Zod migration reference for other validation and metadata differences.
