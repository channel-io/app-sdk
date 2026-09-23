import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as schemas from "./issue.js";
import { getExtensionFunctionSchemas } from "./function-schemas.js";

const issue = {
  issueId: "id",
  identifier: "ENG-1",
  title: "Example",
  url: "https://linear.app/test/issue/ENG-1",
  state: "started",
  providerState: { name: "Review", category: "started" },
  createdAt: "2026-09-01T00:00:00Z",
};
const fixture = JSON.parse(
  readFileSync(new URL("./__fixtures__/issue-contract.json", import.meta.url), "utf8")
) as { functions: { functionSchema: { name: string; outputSchema: { required: string[] } } }[] }[];

describe("Issue v1", () => {
  it("matches every item error type in the platform fixture", () => {
    const raw = JSON.parse(
      readFileSync(new URL("./__fixtures__/issue-contract.json", import.meta.url), "utf8")
    );
    const batch = raw[0].functions.find((f: { functionSchema: { name: string } }) =>
      f.functionSchema.name.endsWith("getIssues")
    );
    expect(schemas.IssueErrorSchema.shape.type.options).toEqual(
      batch.functionSchema.outputSchema.$defs.error.properties.type.enum
    );
  });
  it("registers the five functions and the final V266 result envelope", () => {
    const actual = getExtensionFunctionSchemas().filter((s) =>
      s.name.startsWith("extension.issue.")
    );
    expect(actual.map((s) => s.name).sort()).toEqual(
      fixture[0]!.functions.map((f) => f.functionSchema.name).sort()
    );
    expect(schemas.IssueExecuteIssueTransitionOutputSchema.parse({ issue })).toEqual({ issue });
    expect(
      schemas.IssueExecuteIssueTransitionOutputSchema.safeParse({ issue, operationId: "old" })
        .success
    ).toBe(false);
    expect(
      fixture[0]!.functions.find((f) => f.functionSchema.name.endsWith("executeIssueTransition"))!
        .functionSchema.outputSchema.required
    ).toEqual(["issue"]);
    for (const functionSchema of actual)
      expect(functionSchema.inputSchema).toHaveProperty("additionalProperties", true);
  });
  it("accepts and strips injected identity and language while preserving ID/URL exclusivity", () => {
    expect(
      schemas.IssueGetIssueInputSchema.parse({ issueId: "id", language: "ko", channelId: "spoof" })
    ).toEqual({ issueId: "id" });
    for (const value of [
      {},
      { issueId: null },
      { issueId: " " },
      { issueId: "id", url: issue.url },
      { url: "http://linear.app" },
    ])
      expect(schemas.IssueGetIssueInputSchema.safeParse(value).success).toBe(false);
    expect(schemas.IssueGetIssueInputSchema.parse({ url: issue.url })).toEqual({ url: issue.url });
  });
  it("enforces pagination, unique bounded IDs and exclusive item outcomes", () => {
    for (const value of [
      { limit: 0 },
      { limit: 101 },
      { limit: 1.1 },
      { since: null },
      { since: "" },
      { orderDirection: "asc" },
    ])
      expect(schemas.IssueSearchIssuesInputSchema.safeParse(value).success).toBe(false);
    expect(schemas.IssueSearchIssuesInputSchema.parse({ query: "", cursor: "ignored" })).toEqual({
      query: "",
    });
    for (const issueIds of [[], ["id", "id"], Array.from({ length: 101 }, (_, i) => String(i))])
      expect(schemas.IssueGetIssuesInputSchema.safeParse({ issueIds }).success).toBe(false);
    expect(
      schemas.IssueGetIssuesOutputSchema.parse({
        results: [
          { issueId: "id", issue },
          { issueId: "other", error: { type: "unsupported", message: "Unmapped" } },
        ],
      })
    ).toBeDefined();
    expect(
      schemas.IssueGetIssuesOutputSchema.safeParse({
        results: [{ issueId: "id", issue, error: { type: "notFound", message: "missing" } }],
      }).success
    ).toBe(false);
  });
  it("rejects invented states and incomplete available/externalOnly transitions", () => {
    expect(schemas.ExternalIssueSchema.safeParse({ ...issue, state: "review" }).success).toBe(
      false
    );
    const base = { id: "done", name: "Done", targetState: "completed" };
    expect(
      schemas.IssueTransitionSchema.safeParse({ ...base, availability: "available" }).success
    ).toBe(false);
    expect(
      schemas.IssueTransitionSchema.safeParse({
        ...base,
        availability: "externalOnly",
        reason: "Complex",
      }).success
    ).toBe(false);
    expect(
      schemas.IssueTransitionSchema.parse({
        ...base,
        availability: "available",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      })
    ).toBeDefined();
  });
});
