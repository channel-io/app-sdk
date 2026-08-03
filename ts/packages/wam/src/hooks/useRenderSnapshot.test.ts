import { describe, expect, it } from "vitest";
import { resolveRenderSnapshot } from "./useRenderSnapshot.js";

describe("resolveRenderSnapshot", () => {
  it("resolves a versioned render snapshot", () => {
    expect(
      resolveRenderSnapshot({
        wamVersion: 2,
        renderSnapshot: {
          schemaVersion: 3,
          capturedAt: "2026-08-03T12:00:00.000Z",
          data: { summary: { title: "Trend" } },
        },
      })
    ).toEqual({
      wamVersion: 2,
      snapshot: {
        schemaVersion: 3,
        capturedAt: "2026-08-03T12:00:00.000Z",
        data: { summary: { title: "Trend" } },
      },
      source: "versioned",
    });
  });

  it("reads a legacy public snapshot as version 1", () => {
    expect(
      resolveRenderSnapshot({
        wamVersion: undefined,
        renderSnapshot: undefined,
        publicSnapshot: { rows: [{ rank: 1 }] },
      })
    ).toMatchObject({
      wamVersion: 1,
      snapshot: {
        schemaVersion: 1,
        data: { rows: [{ rank: 1 }] },
      },
      source: "legacy",
    });
  });

  it("rejects malformed or unsupported envelope values", () => {
    expect(
      resolveRenderSnapshot({
        wamVersion: 0,
        renderSnapshot: {
          schemaVersion: 1,
          capturedAt: "not-a-date",
          data: [],
        },
      })
    ).toBeUndefined();
  });
});
