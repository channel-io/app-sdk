import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const ts = createRequire(path.join(root, "ts/package.json"))("typescript");
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "catalog/native-functions.json"), "utf8"),
);
const allowed = new Set(catalog.functions.map((entry) => entry.name));
if (allowed.size !== catalog.functions.length)
  throw new Error("Duplicate native catalog name");
const observed = new Set();
const files = [
  "ts/packages/core/src/types/native.ts",
  "ts/packages/core/src/schemas/native.ts",
  "ts/packages/server/src/native/client.ts",
  "ts/packages/server/src/native/proxy-api.ts",
];
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const check = (name) => {
    if (!allowed.has(name))
      throw new Error(
        `Native operation is not in the supported catalog: ${file}`,
      );
    observed.add(name);
  };
  function visit(node) {
    if (
      ts.isInterfaceDeclaration(node) &&
      node.name.text === "NativeFunctionTypeMap"
    ) {
      for (const member of node.members) check(member.name.getText(source));
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ["callNativeFunction", "callNativeFunctionWithToken"].includes(
        node.expression.name.text,
      ) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      check(node.arguments[0].text);
    if (
      file.endsWith("schemas/native.ts") &&
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === "name" &&
      ts.isStringLiteral(node.initializer)
    )
      check(node.initializer.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
execFileSync(
  process.env.GO ?? "go",
  ["run", path.join(root, "scripts/native-catalog/main.go"), root],
  { stdio: "inherit" },
);
if (observed.size !== allowed.size)
  throw new Error("Native catalog contains unmodeled operations");
console.log(`Native catalog verified: ${allowed.size} operations`);
