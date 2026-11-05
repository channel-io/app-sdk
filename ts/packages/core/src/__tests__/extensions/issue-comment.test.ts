import { describe, expect, it } from "vitest";
import {
  IssueCreateCommentInputSchema,
  IssueCreateCommentOutputSchema,
} from "../../extensions/issue.js";
import { getExtensionFunctionSchemas } from "../../extensions/function-schemas.js";

const input = {
  issueId: "issue-1",
  body: "  plain text\n",
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  accountRef: "account-1",
};

describe("Issue createComment", () => {
  it("preserves body and omission of recoveryOnly while stripping injected fields", () => {
    expect(IssueCreateCommentInputSchema.parse({ ...input, channelId: "injected" })).toEqual(input);
    expect(IssueCreateCommentInputSchema.parse({ ...input, recoveryOnly: true }).recoveryOnly).toBe(
      true
    );
    expect(
      IssueCreateCommentInputSchema.safeParse({ ...input, body: "😀".repeat(8000) }).success
    ).toBe(true);
  });

  it("rejects invalid input including oversized UTF-16 body and non-v4 request IDs", () => {
    for (const patch of [
      { issueId: " " },
      { accountRef: "\t" },
      { body: "\n " },
      { body: "😀".repeat(8001) },
      { requestId: input.requestId.toUpperCase() },
      { requestId: "123e4567-e89b-12d3-a456-426614174000" },
      { recoveryOnly: null },
    ]) {
      expect(IssueCreateCommentInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    }
  });

  it("requires a comment ID and accepts only an optional absolute HTTPS URL", () => {
    expect(IssueCreateCommentOutputSchema.parse({ commentId: "id" })).toEqual({ commentId: "id" });
    expect(
      IssueCreateCommentOutputSchema.parse({
        commentId: "id",
        url: "https://example.com/comment/1",
      })
    ).toBeDefined();
    expect(
      IssueCreateCommentOutputSchema.safeParse({ commentId: "id", url: "HtTpS://example.com/path" })
        .success
    ).toBe(true);
    for (const output of [
      { commentId: " " },
      { commentId: "id", url: "http://example.com" },
      { commentId: "id", url: "/comment/1" },
      { commentId: "id", url: "https://example.com/white space" },
      { commentId: "id", url: "https://example.com/\\path" },
      { commentId: "id", url: "https://example.com\\path" },
      { commentId: "id", url: null },
      { commentId: "id", status: "created" },
    ]) {
      expect(IssueCreateCommentOutputSchema.safeParse(output).success).toBe(false);
    }
  });
  it("retains URL constraints in the registered JSON schema", () => {
    const schema = getExtensionFunctionSchemas().find(
      (entry) => entry.name === "extension.issue.core.createComment"
    )!;
    const properties = schema.outputSchema["properties"] as Record<string, { pattern: string }>;
    const pattern = new RegExp(properties["url"]!.pattern);
    expect(pattern.test("HtTpS://example.com/path")).toBe(true);
    expect(pattern.test("https://example.com/white space")).toBe(false);
    expect(pattern.test("https://example.com/\\path")).toBe(false);
  });
});
