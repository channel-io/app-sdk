#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const violations = [];

const allowedTsEnumTypes = new Set([
  "ApiKeyAuthScope",
  "AuthorizationOpenMode",
  "BookingStatus",
  "CommandAlfMode",
  "CommandParamType",
  "CommandScope",
  "ConfigConditionOperator",
  "ConfigNoticePlacement",
  "ConfigNoticeTone",
  "ConfigScope",
  "ConfigStorageClass",
  "ConfigSupportedLocale",
  "DataSourceDialect",
  "DataSourceManagerAccess",
  "DataSourceTableType",
  "HookType",
  "MessagingPrebuiltEntityType",
  "MessagingWritingTypeAvailabilityState",
  "OAuthAuthScope",
  "OAuthProviderSupportedLocale",
  "ParameterCase",
  "TokenRequestContentType",
  "WidgetScope",
  "WidgetType",
]);
const allowedTsHelperTypes = new Set([
  "AlfTaskExtensionProvider",
  "ConfigI18nMap",
  "CreateDataSourceIngestionEventRowInput",
  "DataSourceIngestionEventRow",
  "DataSourceMetadataProvider",
  "MessagingExtensionProvider",
  "MessagingHandler",
  "MessagingInboxProvider",
  "MessagingPrebuiltProvider",
  "NotebookExtensionProvider",
  "OAuthProviderI18nMap",
  "StaticDataSourceMetadata",
  "StoreProfileProvider",
]);
const allowedTsHelperSchemas = new Set([
  "ConfigI18nMapSchema",
  "OAuthProviderI18nMapSchema",
]);

const allowedGoHelpers = new Set([
  "Builder",
  "ExtensionBuilder",
  "I18nMap",
  "Metadata",
  "Option",
]);
const allowedGoInterfaces = new Set(["Provider"]);

checkTypeScriptExtensionTypes();
checkTypeScriptCoreDTOs();
checkGoExtensionTypes();
checkGoCoreDTOs();

if (violations.length > 0) {
  console.error("Proto SSOT check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Proto SSOT check passed.");

function checkTypeScriptExtensionTypes() {
  const extensionsDir = join(repoRoot, "ts/packages/core/src/extensions");
  const paritySource = readFileSync(
    join(
      repoRoot,
      "ts/packages/core/src/__tests__/extensions/proto-field-parity.test.ts",
    ),
    "utf8",
  );
  const contractSchemas = new Set(
    [
      ...paritySource.matchAll(/contract\([^,]+,\s*([A-Za-z0-9_]+Schema)\b/g),
    ].map((match) => match[1]),
  );

  for (const filePath of walk(extensionsDir, (file) => file.endsWith(".ts"))) {
    const relPath = relative(repoRoot, filePath);
    if (
      relPath.includes("/gen/") ||
      relPath.endsWith("extensions/index.ts") ||
      relPath.endsWith("extensions/function-schemas.ts") ||
      relPath.endsWith("extensions/proto-contracts.ts")
    ) {
      continue;
    }

    const source = readFileSync(filePath, "utf8");
    const typeAliases = exportedTypeAliases(source);
    const protoBackedAliases = new Set(
      typeAliases
        .filter((alias) => alias.rhs.trim().startsWith("ProtoBacked<"))
        .map((alias) => alias.name),
    );

    if (relPath.includes("extensions/interfaces/")) {
      for (const match of source.matchAll(
        /^export interface\s+([A-Z][A-Za-z0-9_]*)/gm,
      )) {
        const name = match[1];
        if (
          !name.endsWith("ExtensionInterface") &&
          !allowedTsHelperTypes.has(name)
        ) {
          violations.push(
            `${relPath}: exported DTO interface ${name} must be a proto type alias`,
          );
        }
      }
    } else {
      for (const match of source.matchAll(
        /^export interface\s+([A-Z][A-Za-z0-9_]*)/gm,
      )) {
        const name = match[1];
        if (
          !name.endsWith("ExtensionInterface") &&
          !allowedTsHelperTypes.has(name)
        ) {
          violations.push(
            `${relPath}: exported interface ${name} must be a proto type alias or allowlisted helper`,
          );
        }
      }
    }

    for (const alias of typeAliases) {
      const rhs = alias.rhs.trim();
      if (rhs.startsWith("Record<string, never>")) {
        violations.push(
          `${relPath}: empty DTO alias ${alias.name} must use the generated proto empty input`,
        );
        continue;
      }
      if (rhs.startsWith("z.infer")) {
        if (
          !allowedTsEnumTypes.has(alias.name) &&
          !allowedTsHelperTypes.has(alias.name)
        ) {
          violations.push(
            `${relPath}: exported DTO type ${alias.name} must be ProtoBacked<z.infer<...>, Proto...>`,
          );
        }
        continue;
      }
      if (rhs.startsWith("ProtoBacked<")) {
        continue;
      }
      if (/^Proto[A-Z][A-Za-z0-9_]*$/.test(rhs)) {
        continue;
      }
      if (protoBackedAliases.has(rhs)) {
        continue;
      }
      if (alias.name.endsWith("ExtensionInterface")) {
        continue;
      }
      if (allowedTsHelperTypes.has(alias.name)) {
        continue;
      }

      violations.push(
        `${relPath}: exported type ${alias.name} must be proto-backed or allowlisted`,
      );
    }

    if (relPath.includes("extensions/interfaces/")) {
      continue;
    }

    for (const schema of exportedSchemas(source)) {
      if (allowedTsHelperSchemas.has(schema.name)) {
        continue;
      }
      if (contractSchemas.has(schema.name)) {
        continue;
      }
      if (schema.statement.includes("z.enum(")) {
        continue;
      }
      if (schema.statement.includes(".partial()")) {
        continue;
      }

      const aliasTarget = schema.statement.match(
        /=\s*([A-Za-z0-9_]+Schema)\s*;/,
      )?.[1];
      if (aliasTarget && contractSchemas.has(aliasTarget)) {
        continue;
      }

      violations.push(
        `${relPath}: exported schema ${schema.name} must have a proto-field parity contract`,
      );
    }
  }
}

function checkGoExtensionTypes() {
  const extensionDir = join(repoRoot, "go/extension");
  for (const filePath of walk(
    extensionDir,
    (file) => file.endsWith(".go") && !file.endsWith("_test.go"),
  )) {
    const relPath = relative(repoRoot, filePath);
    const source = readFileSync(filePath, "utf8");

    for (const match of source.matchAll(
      /^type\s+([A-Z][A-Za-z0-9_]*)\s+(.+)$/gm,
    )) {
      const name = match[1];
      const definition = match[2].trim();

      if (allowedGoHelpers.has(name)) {
        continue;
      }
      if (definition.startsWith("= sdkv1.")) {
        continue;
      }
      if (definition.startsWith("struct")) {
        violations.push(
          `${relPath}: exported struct ${name} must be a sdkv1 proto alias`,
        );
        continue;
      }
      if (definition.startsWith("interface")) {
        if (allowedGoInterfaces.has(name)) {
          continue;
        }
        violations.push(
          `${relPath}: exported interface ${name} is not an extension interface helper`,
        );
        continue;
      }

      violations.push(
        `${relPath}: exported type ${name} must be proto-backed or allowlisted`,
      );
    }
  }
}

function checkGoCoreDTOs() {
  const files = [
    {
      relPath: "go/appsdk/types.go",
      allowedStructs: new Set([
        "Options",
        "Caller",
        "Channel",
        "Chat",
        "User",
        "UserChat",
        "Context",
        "FunctionRequest",
        "FunctionResponse",
        "FunctionErrorResponse",
        "GetFunctionsResult",
        "GetFunctionsResponse",
        "ExtensionRegistration",
        "FunctionSchema",
      ]),
    },
    {
      relPath: "go/appsdk/errors.go",
      allowedStructs: new Set(["FunctionError"]),
    },
  ];

  for (const file of files) {
    const source = readFileSync(join(repoRoot, file.relPath), "utf8");
    for (const match of source.matchAll(
      /^type\s+([A-Z][A-Za-z0-9_]*)\s+struct\b/gm,
    )) {
      const name = match[1];
      if (!file.allowedStructs.has(name)) {
        violations.push(
          `${file.relPath}: exported core DTO struct ${name} must be defined in proto and added to proto_contract_test.go`,
        );
      }
    }
  }
}

function checkTypeScriptCoreDTOs() {
  const files = [
    {
      relPath: "ts/packages/core/src/types/context.ts",
      protoBackedExports: new Map([
        ["Caller", "ProtoCaller"],
        ["Channel", "ProtoChannel"],
        ["User", "ProtoUser"],
        ["UserChat", "ProtoUserChat"],
        ["Context", "ProtoFunctionContext"],
        ["FunctionCallRequest", "ProtoFunctionRequest"],
        ["FunctionCallErrorResponse", "ProtoFunctionError"],
        ["FunctionCallResponse", "ProtoFunctionResponse"],
      ]),
      allowedExports: new Set(["CallerType"]),
    },
    {
      relPath: "ts/packages/core/src/types/function.ts",
      protoBackedExports: new Map([
        ["FunctionSchema", "ProtoFunctionSchema"],
        ["GetFunctionsResult", "ProtoGetFunctionsResult"],
      ]),
      allowedExports: new Set([
        "FunctionHandler",
        "FunctionDefinition",
        "RegisteredFunction",
        "GetFunctionsResponse",
        "GetTestFunctionsResponse",
      ]),
    },
  ];

  for (const file of files) {
    const source = readFileSync(join(repoRoot, file.relPath), "utf8");
    const exportedNames = exportedTypeOrInterfaceNames(source);

    for (const exportName of exportedNames) {
      const protoName = file.protoBackedExports.get(exportName);
      if (protoName) {
        if (!declaresProtoBackedDTO(source, exportName, protoName)) {
          violations.push(
            `${file.relPath}: exported DTO ${exportName} must extend or alias generated proto type ${protoName}`,
          );
        }
        continue;
      }

      if (!file.allowedExports.has(exportName)) {
        violations.push(
          `${file.relPath}: exported core type ${exportName} must be proto-backed or explicitly allowlisted`,
        );
      }
    }

    for (const [exportName, protoName] of file.protoBackedExports) {
      if (!declaresProtoBackedDTO(source, exportName, protoName)) {
        violations.push(
          `${file.relPath}: exported DTO ${exportName} must extend or alias generated proto type ${protoName}`,
        );
      }
    }
  }
}

function exportedTypeOrInterfaceNames(source) {
  return new Set(
    [
      ...source.matchAll(
        /^export\s+(?:interface|type)\s+([A-Z][A-Za-z0-9_]*)\b/gm,
      ),
    ].map((match) => match[1]),
  );
}

function declaresProtoBackedDTO(source, exportName, protoName) {
  const interfacePattern = new RegExp(
    `export interface\\s+${exportName}(?:<[^>]+>)?\\s+extends[\\s\\S]{0,240}\\b${protoName}\\b`,
    "m",
  );
  const aliasPattern = new RegExp(
    `export type\\s+${exportName}\\s*=\\s*${protoName}\\s*;`,
    "m",
  );
  return interfacePattern.test(source) || aliasPattern.test(source);
}

function exportedSchemas(source) {
  const schemas = [];
  for (const match of source.matchAll(
    /^export const\s+([A-Za-z0-9_]+Schema)\s*=/gm,
  )) {
    const start = match.index ?? 0;
    const end = source.indexOf(";\n", start);
    schemas.push({
      name: match[1],
      statement: source.slice(start, end === -1 ? undefined : end + 1),
    });
  }
  return schemas;
}

function exportedTypeAliases(source) {
  const aliases = [];
  for (const match of source.matchAll(
    /^export type\s+([A-Z][A-Za-z0-9_]*)\s*=/gm,
  )) {
    const start = match.index ?? 0;
    const rhsStart = start + match[0].length;
    const end = source.indexOf(";\n", rhsStart);
    aliases.push({
      name: match[1],
      rhs: source.slice(rhsStart, end === -1 ? undefined : end),
    });
  }
  return aliases;
}

function walk(dir, predicate) {
  const entries = readdirSync(dir).sort();
  const files = [];
  for (const entry of entries) {
    const absolute = join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      files.push(...walk(absolute, predicate));
    } else if (predicate(absolute)) {
      files.push(absolute);
    }
  }
  return files;
}
