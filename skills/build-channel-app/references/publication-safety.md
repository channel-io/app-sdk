# Public Artifact Safety

Private implementations may confirm which public SDK patterns work in production, but they are not
source material for public artifacts.

## Allowed evidence

- Public package names, exports, schemas, protocol names, and documented endpoints.
- General lifecycle patterns such as registration, token caching, WAM/server separation, retries,
  idempotency, and permission checks after they are verified against the public SDK.
- Failure modes rewritten as provider-neutral guidance.

## Never publish

- Private repository, service, project, customer, provider, tenant, app, channel, manager, or user
  identifiers.
- Private URLs, domains, Function names, configuration keys, environment-variable conventions,
  deployment topology, screenshots, task links, or operational data.
- Provider-specific workarounds, mapping logic, algorithms, payloads, or comments copied from a
  private implementation.
- Credentials, tokens, cookies, signing material, UUIDs, real timestamps, or production records.

## Derivation workflow

1. Record the required capability without copying source text or identifiers.
2. Verify it against public SDK exports, schemas, tests, and public provider documentation.
3. Write a new example with neutral names such as `example-provider`, `resource-123`, and
   `https://api.example.com`.
4. Include only the minimum fields needed to explain the public contract.
5. Scan the final diff for private identifiers, non-example domains, secrets, and copied long lines.
6. If a behavior cannot be justified from a public contract, omit it or label it as an unsupported
   integration-specific adapter; never disclose the private implementation.

When in doubt, keep the observation private and document only the stable public boundary.
