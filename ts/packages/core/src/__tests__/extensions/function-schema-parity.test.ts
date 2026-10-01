import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  extensionFunctionSchemaDefinitions,
  getExtensionFunctionSchemas,
  getExtensionFunctionSchemasByExtension,
} from "../../extensions/function-schemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(
  __dirname,
  "../../../../../../go/extension/schemaregistry/extension_function_schemas.json"
);

describe("extension function schema parity fixture", () => {
  it("preserves scoped OAuth value restrictions in the serialized registration schema", () => {
    const definition = getExtensionFunctionSchemas().find(
      (entry) => entry.name === "extension.oauth.metadata.getAuthConfig"
    );
    const valueMap = z.object({
      type: z.literal("string"),
      allOf: z.array(z.object({ pattern: z.string() })).min(2),
    });
    const schema = z
      .object({
        properties: z.object({
          oauthProvider: z.object({
            properties: z.object({
              additionalParams: z.object({
                additionalProperties: z.object({
                  anyOf: z.tuple([
                    z.object({ type: z.literal("string") }),
                    z.object({ properties: z.object({ channel: valueMap, manager: valueMap }) }),
                  ]),
                }),
              }),
            }),
          }),
        }),
      })
      .parse(JSON.parse(JSON.stringify(definition?.outputSchema)));
    const scopes =
      schema.properties.oauthProvider.properties.additionalParams.additionalProperties.anyOf[1]
        .properties;
    for (const scope of ["channel", "manager"] as const) {
      const patterns = scopes[scope].allOf.map(({ pattern }) => new RegExp(pattern));
      for (const value of ["app", "user", "a b", "앱"]) {
        expect(patterns.every((pattern) => pattern.test(value))).toBe(true);
      }
      for (const value of ["", " ", "\t", "app\r", "app\n", "app\u0000"]) {
        expect(patterns.every((pattern) => pattern.test(value))).toBe(false);
      }
    }
  });

  it("matches the canonical TypeScript zod schema output", () => {
    const expected = readFileSync(fixturePath, "utf8");
    const actual = `${JSON.stringify(getExtensionFunctionSchemas(), null, 2)}\n`;

    expect(actual).toBe(expected);
  });

  it("covers every extension function exactly once", () => {
    const names = extensionFunctionSchemaDefinitions.map((definition) => definition.name);
    const uniqueNames = new Set(names);

    expect(names).toHaveLength(85);
    expect(uniqueNames.size).toBe(names.length);
    expect([...names].sort()).toEqual(names);
  });

  it("keeps canonical schema coverage visible by extension", () => {
    const grouped = getExtensionFunctionSchemasByExtension();
    const counts = Object.fromEntries(
      Object.entries(grouped).map(([extensionName, schemas]) => [extensionName, schemas.length])
    );

    expect(counts).toEqual({
      alfTask: 1,
      apikey: 2,
      calendar: 6,
      commerce: 9,
      command: 3,
      config: 2,
      customtab: 2,
      datasource: 4,
      hook: 1,
      issue: 5,
      mailRelay: 1,
      messaging: 12,
      notebook: 1,
      oauth: 2,
      order: 7,
      polling: 3,
      store: 1,
      suggestion: 1,
      widget: 2,
      wms: 20,
    });
  });
});
