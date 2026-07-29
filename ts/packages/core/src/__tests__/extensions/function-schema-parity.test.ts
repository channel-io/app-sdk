import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
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
  it("matches the canonical TypeScript zod schema output", () => {
    const expected = readFileSync(fixturePath, "utf8");
    const actual = `${JSON.stringify(getExtensionFunctionSchemas(), null, 2)}\n`;

    expect(actual).toBe(expected);
  });

  it("covers every extension function exactly once", () => {
    const names = extensionFunctionSchemaDefinitions.map((definition) => definition.name);
    const uniqueNames = new Set(names);

    expect(names).toHaveLength(77);
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
      commerce: 8,
      command: 3,
      config: 2,
      customtab: 2,
      datasource: 3,
      hook: 1,
      mailRelay: 1,
      messaging: 12,
      notebook: 1,
      oauth: 2,
      order: 7,
      polling: 3,
      store: 1,
      widget: 2,
      wms: 20,
    });
  });
});
