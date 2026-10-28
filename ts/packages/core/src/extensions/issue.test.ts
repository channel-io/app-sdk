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
  it("uses invalidInput for batch input failures and rejects legacy item types", () => {
    const response = (type: string) => ({
      results: [{ issueId: "bad", error: { type, message: "Invalid UUID" } }],
    });
    expect(schemas.IssueGetIssuesOutputSchema.safeParse(response("invalidInput")).success).toBe(
      true
    );
    for (const type of ["invalidArgument", "validationFailed"])
      expect(schemas.IssueGetIssuesOutputSchema.safeParse(response(type)).success).toBe(false);
  });
  it("registers the five functions and the final V266 result envelope", () => {
    const actual = getExtensionFunctionSchemas().filter((s) =>
      s.name.startsWith("extension.issue.core.")
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

describe("Issue subscriptions", () => {
  it("registers the optional start/stop pair without changing core functions", () => {
    expect(
      getExtensionFunctionSchemas()
        .filter((s) => s.name.startsWith("extension.issue.subscription."))
        .map((s) => s.name)
        .sort()
    ).toEqual(["extension.issue.subscription.start", "extension.issue.subscription.stop"]);
  });
  it("strips caller supplied routing and keeps one stable issue selector", () => {
    expect(
      schemas.IssueSubscriptionStartInputSchema.parse({
        subscriptionId: "sub-1",
        issueId: "id",
        channelId: "spoof",
        language: "ko",
      })
    ).toEqual({ subscriptionId: "sub-1", issueId: "id" });
    for (const subscriptionId of ["", " ", "x/y", "x".repeat(129), "x\n"])
      expect(
        schemas.IssueSubscriptionStartInputSchema.safeParse({ subscriptionId, issueId: "id" })
          .success
      ).toBe(false);
    expect(
      schemas.IssueSubscriptionStartInputSchema.safeParse({ subscriptionId: "sub-1", issueId: " " })
        .success
    ).toBe(false);
  });
  it("requires a complete single-issue baseline and verified tenant", () => {
    expect(
      schemas.IssueSubscriptionStartOutputSchema.parse({
        status: "active",
        issue,
        providerTenantId: "workspace",
      })
    ).toEqual({ status: "active", issue, providerTenantId: "workspace" });
    for (const result of [
      { status: "active", issues: [issue], providerTenantId: "workspace" },
      { status: "active", issue },
      { status: "pending", issue, providerTenantId: "workspace" },
      { status: "active", issue, providerTenantId: " " },
    ])
      expect(schemas.IssueSubscriptionStartOutputSchema.safeParse(result).success).toBe(false);
  });
  it("stop needs only the subscription ID and succeeds only after stopping", () => {
    expect(
      schemas.IssueSubscriptionStopInputSchema.parse({
        subscriptionId: "sub-1",
        issueId: "ignored",
      })
    ).toEqual({ subscriptionId: "sub-1" });
    expect(schemas.IssueSubscriptionStopOutputSchema.parse({ stopped: true })).toEqual({
      stopped: true,
    });
    expect(schemas.IssueSubscriptionStopOutputSchema.safeParse({ stopped: false }).success).toBe(
      false
    );
  });
});
