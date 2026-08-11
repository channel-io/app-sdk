import { DataSourceErrorCode, DataSourceExecutionError } from "./types.js";

export interface DataSourceTableConfig {
  name: string;
  tenantColumn?: string;
}

const blockedSqlKeywords = [
  "alter",
  "analyze",
  "begin",
  "call",
  "commit",
  "copy",
  "create",
  "delete",
  "drop",
  "export",
  "grant",
  "import",
  "insert",
  "load",
  "merge",
  "revoke",
  "rollback",
  "set",
  "truncate",
  "update",
  "vacuum",
];

export function isSingleReadOnlyStatement(query: string): boolean {
  const analysis = analyzeSql(query);
  return (
    analysis.valid &&
    analysis.firstTokenIsIdentifier &&
    (analysis.firstKeyword === "select" || analysis.firstKeyword === "with") &&
    !analysis.hasBlockedKeyword
  );
}

export function containsIdentifier(query: string, identifier: string): boolean {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`, "i").test(query);
}

export function referencedTables(
  query: string,
  explicitTableNames: readonly string[] = [],
  tables: readonly DataSourceTableConfig[] = []
): string[] {
  if (explicitTableNames.length > 0) {
    return [...explicitTableNames];
  }
  const searchableQuery = analyzeSql(query).referenceText;
  return tables
    .filter((table) => table.name && containsIdentifier(searchableQuery, table.name))
    .map((table) => table.name);
}

/**
 * Enforces the app-runner safety boundary. Table inputs are retained for API
 * compatibility; AppStore owns table authorization.
 */
export function validateReadOnlyQuery(
  query: string,
  _explicitTableNames: readonly string[] = [],
  _tables: readonly DataSourceTableConfig[] = []
): void {
  if (!query.trim()) {
    throw new DataSourceExecutionError({
      code: DataSourceErrorCode.InvalidArgument,
      message: "query is required",
    });
  }
  if (!isSingleReadOnlyStatement(query)) {
    throw new DataSourceExecutionError({
      code: DataSourceErrorCode.QueryInvalid,
      message: "query must be a single read-only SELECT statement",
    });
  }
}

export function queryWithRowLimit(query: string, rowLimit: number | undefined): string {
  const normalized = trimSql(query);
  const limit = Math.trunc(rowLimit ?? 0);
  if (limit <= 0) {
    return normalized;
  }
  return `SELECT * FROM (${normalized}) AS datasource_query LIMIT ${limit}`;
}

export class DataSourceByteLimitTracker {
  private sentBytes = 0;

  constructor(private readonly byteLimit: number | undefined) {}

  reserve(size: number): void {
    const limit = Math.trunc(this.byteLimit ?? 0);
    if (limit <= 0) {
      return;
    }
    this.sentBytes += size;
    if (this.sentBytes > limit) {
      throw new DataSourceExecutionError({
        code: DataSourceErrorCode.LimitExceeded,
        message: "datasource query byte limit exceeded",
      });
    }
  }
}

function trimSql(query: string): string {
  const normalized = query.trim();
  let end = normalized.length;
  while (end > 0 && normalized.charCodeAt(end - 1) === 59) {
    end -= 1;
  }
  return normalized.slice(0, end).trim();
}

interface SqlAnalysis {
  valid: boolean;
  firstTokenSet: boolean;
  firstTokenIsIdentifier: boolean;
  firstKeyword: string;
  hasBlockedKeyword: boolean;
  terminated: boolean;
  referenceText: string;
}

// This is a conservative lexer for the datasource safety policy, not a full SQL parser.
// Hash comments are accepted only before the first executable token because PostgreSQL
// also uses # as an operator.
function analyzeSql(query: string): SqlAnalysis {
  const analysis: SqlAnalysis = {
    valid: true,
    firstTokenSet: false,
    firstTokenIsIdentifier: false,
    firstKeyword: "",
    hasBlockedKeyword: false,
    terminated: false,
    referenceText: "",
  };
  const reference: string[] = [];

  const markToken = (identifier: string | undefined): void => {
    if (analysis.terminated) {
      analysis.valid = false;
    }
    if (!analysis.firstTokenSet) {
      analysis.firstTokenSet = true;
      analysis.firstTokenIsIdentifier = identifier !== undefined;
      analysis.firstKeyword = identifier?.toLowerCase() ?? "";
    }
    if (identifier !== undefined && blockedSqlKeywords.includes(identifier.toLowerCase())) {
      analysis.hasBlockedKeyword = true;
    }
  };

  for (let index = 0; index < query.length;) {
    const character = query.charAt(index);

    if (isSqlWhitespace(character)) {
      reference.push(character);
      index += 1;
      continue;
    }

    if (query.startsWith("--", index) || (character === "#" && !analysis.firstTokenSet)) {
      if (analysis.terminated) {
        analysis.valid = false;
      }
      reference.push(" ");
      index = skipSqlLineComment(query, index);
      continue;
    }

    if (query.startsWith("/*", index)) {
      if (analysis.terminated) {
        analysis.valid = false;
      }
      reference.push(" ");
      const result = skipSqlBlockComment(query, index);
      index = result.end;
      if (!result.closed || result.nested) {
        analysis.valid = false;
      }
      continue;
    }

    if (character === "'") {
      markToken(undefined);
      reference.push(" ");
      const result = skipSqlQuotedValue(query, index, character);
      index = result.end;
      if (!result.closed) {
        analysis.valid = false;
      }
      continue;
    }

    if (character === '"' || character === "`") {
      markToken(undefined);
      const start = index;
      const result = skipSqlQuotedValue(query, index, character);
      index = result.end;
      reference.push(query.slice(start, index));
      if (!result.closed) {
        analysis.valid = false;
      }
      continue;
    }

    if (character === "$") {
      const delimiter = sqlDollarQuoteDelimiter(query, index);
      if (delimiter) {
        markToken(undefined);
        reference.push(" ");
        const contentStart = index + delimiter.length;
        const closingIndex = query.indexOf(delimiter, contentStart);
        if (closingIndex < 0) {
          analysis.valid = false;
          index = query.length;
        } else {
          index = closingIndex + delimiter.length;
        }
        continue;
      }
    }

    if (isSqlIdentifierStart(character)) {
      const start = index;
      index += 1;
      while (index < query.length && isSqlIdentifierPart(query.charAt(index))) {
        index += 1;
      }
      const identifier = query.slice(start, index);
      markToken(identifier);
      reference.push(identifier);
      continue;
    }

    if (character === ";") {
      if (!analysis.firstTokenSet || analysis.terminated) {
        analysis.valid = false;
      }
      analysis.terminated = true;
      reference.push(" ");
      index += 1;
      continue;
    }

    markToken(undefined);
    reference.push(character);
    index += 1;
  }

  analysis.referenceText = reference.join("");
  return analysis;
}

function skipSqlLineComment(query: string, start: number): number {
  let index = start + (query[start] === "-" ? 2 : 1);
  while (index < query.length && query[index] !== "\n" && query[index] !== "\r") {
    index += 1;
  }
  return index;
}

function skipSqlBlockComment(
  query: string,
  start: number
): { end: number; closed: boolean; nested: boolean } {
  let nested = false;
  for (let index = start + 2; index < query.length;) {
    if (query.startsWith("/*", index)) {
      nested = true;
      index += 2;
      continue;
    }
    if (query.startsWith("*/", index)) {
      return { end: index + 2, closed: true, nested };
    }
    index += 1;
  }
  return { end: query.length, closed: false, nested };
}

function skipSqlQuotedValue(
  query: string,
  start: number,
  quote: string
): { end: number; closed: boolean } {
  for (let index = start + 1; index < query.length;) {
    if (quote === "'" && query[index] === "\\") {
      return { end: query.length, closed: false };
    }
    if (query[index] !== quote) {
      index += 1;
      continue;
    }
    if (index + 1 < query.length && query[index + 1] === quote) {
      index += 2;
      continue;
    }
    return { end: index + 1, closed: true };
  }
  return { end: query.length, closed: false };
}

function sqlDollarQuoteDelimiter(query: string, start: number): string {
  if (start + 1 >= query.length) {
    return "";
  }
  if (query[start + 1] === "$") {
    return "$$";
  }
  if (!isSqlIdentifierStart(query.charAt(start + 1))) {
    return "";
  }
  for (let index = start + 2; index < query.length; index += 1) {
    if (query[index] === "$") {
      return query.slice(start, index + 1);
    }
    if (!isSqlIdentifierPartWithoutDollar(query.charAt(index))) {
      return "";
    }
  }
  return "";
}

function isSqlWhitespace(character: string): boolean {
  return (
    character === " " ||
    character === "\t" ||
    character === "\n" ||
    character === "\r" ||
    character === "\f" ||
    character === "\v"
  );
}

function isSqlIdentifierStart(character: string): boolean {
  return character === "_" || /[A-Za-z]/.test(character);
}

function isSqlIdentifierPart(character: string): boolean {
  return character === "$" || isSqlIdentifierPartWithoutDollar(character);
}

function isSqlIdentifierPartWithoutDollar(character: string): boolean {
  return isSqlIdentifierStart(character) || /[0-9]/.test(character);
}
