import { describe, expect, it } from "vitest";
import {
  IssueCreateIssueInputSchema,
  IssueCreateIssueOutputSchema,
  IssueGetCreateSchemaInputSchema,
  IssueGetCreateSchemaOutputSchema,
  IssueErrorSchema,
} from "../../extensions/issue.js";

const input = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  accountRef: "account",
  containerId: "team",
};
const form = (fields: unknown[]) => ({ availability: "available", accountRef: "account", fields });
describe("issue creation contract", () => {
  it("strips identity while preserving explicit empty and false values", () => {
    expect(
      IssueCreateIssueInputSchema.parse({
        ...input,
        description: "",
        recoveryOnly: false,
        fields: [
          { key: "labels", value: [] },
          { key: "priority", value: 0 },
          { key: "enabled", value: false },
        ],
        managerId: "spoof",
      })
    ).toEqual({
      ...input,
      description: "",
      recoveryOnly: false,
      fields: [
        { key: "labels", value: [] },
        { key: "priority", value: 0 },
        { key: "enabled", value: false },
      ],
    });
    expect(IssueGetCreateSchemaInputSchema.parse({ selected: {}, token: "spoof" })).toEqual({
      selected: {},
    });
  });
  it("rejects malformed fields, IDs and nested inputs", () => {
    for (const fields of [
      [{ key: "x", value: null }],
      [{ key: "x", value: {} }],
      [{ key: "x", value: [true] }],
      [{ key: "title", value: "x" }],
      [
        { key: "x", value: 1 },
        { key: "x", value: 2 },
      ],
    ]) {
      expect(IssueCreateIssueInputSchema.safeParse({ ...input, fields }).success).toBe(false);
    }
    expect(
      IssueCreateIssueInputSchema.safeParse({ ...input, requestId: `${input.requestId}x` }).success
    ).toBe(false);
    expect(IssueCreateIssueInputSchema.safeParse({ ...input, accountRef: " " }).success).toBe(
      false
    );
    expect(IssueGetCreateSchemaInputSchema.safeParse({ selected: { unknown: 1 } }).success).toBe(
      false
    );
  });
  it("enforces UUIDs, unique array values and default limits", () => {
    for (const requestId of [
      `${input.requestId}\n`,
      input.requestId.toUpperCase(),
      "123e4567-e89b-12d3-a456-426614174000",
    ])
      expect(IssueCreateIssueInputSchema.safeParse({ ...input, requestId }).success).toBe(false);
    for (const value of [
      ["a", "a"],
      [1, 1],
    ])
      expect(
        IssueCreateIssueInputSchema.safeParse({ ...input, fields: [{ key: "x", value }] }).success
      ).toBe(false);
    const cases = [
      [{ key: "x", label: "X", type: "text", maxLength: 2, defaultValue: "😀" }, true],
      [{ key: "x", label: "X", type: "text", maxLength: 1, defaultValue: "😀" }, false],
      [
        {
          key: "x",
          label: "X",
          type: "multiselect",
          choices: [],
          maxItems: 1,
          defaultValue: ["a", "b"],
        },
        false,
      ],
      [{ key: "x", label: "X", type: "number", min: 0, max: 1, defaultValue: 0 }, true],
      [{ key: "x", label: "X", type: "number", min: 0, max: 1, defaultValue: 2 }, false],
    ] as const;
    for (const [field, valid] of cases)
      expect(IssueGetCreateSchemaOutputSchema.safeParse(form([field])).success).toBe(valid);
  });
  it("checks form defaults, choice types, keys and availability", () => {
    const field = {
      key: "priority",
      label: "Priority",
      type: "select",
      choices: [{ label: "None", value: 0 }],
      defaultValue: 0,
    };
    expect(IssueGetCreateSchemaOutputSchema.safeParse(form([field])).success).toBe(true);
    expect(
      IssueGetCreateSchemaOutputSchema.safeParse(form([{ ...field, defaultValue: 2 }])).success
    ).toBe(true);
    expect(
      IssueGetCreateSchemaOutputSchema.safeParse(
        form([{ key: "x", label: "X", type: "text", defaultValue: "a\nb" }])
      ).success
    ).toBe(false);
    for (const fields of [
      [field, field],
      [
        {
          ...field,
          choices: [
            { label: "a", value: 1 },
            { label: "b", value: "b" },
          ],
        },
      ],
      [{ ...field, defaultValue: "wrong type" }],
      [{ key: "x", label: "X", type: "text", required: true, defaultValue: " " }],
      [{ key: "x", label: "X", type: "text", readOnly: true }],
    ])
      expect(IssueGetCreateSchemaOutputSchema.safeParse(form(fields)).success).toBe(false);
    expect(
      IssueGetCreateSchemaOutputSchema.safeParse({
        availability: "externalOnly",
        reason: "unsupported",
        externalUrl: "https://example.com",
      }).success
    ).toBe(true);
    expect(
      IssueGetCreateSchemaOutputSchema.safeParse({ availability: "available", reason: "x" }).success
    ).toBe(false);
  });
  it("requires a container on created issues and keeps the error shape API", () => {
    const issue = {
      issueId: "1",
      identifier: "A-1",
      title: "Title",
      url: "https://example.com",
      state: "open",
      providerState: { name: "Open" },
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(IssueCreateIssueOutputSchema.safeParse({ issue }).success).toBe(false);
    expect(
      IssueCreateIssueOutputSchema.safeParse({
        issue: { ...issue, container: { id: "a", name: "A" } },
      }).success
    ).toBe(true);
    expect(IssueErrorSchema.shape.type).toBeDefined();
  });
});
