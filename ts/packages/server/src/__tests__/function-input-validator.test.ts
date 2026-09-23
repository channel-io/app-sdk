import { ValidationError } from "@channel.io/app-sdk-core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseFunctionInputParams } from "../utils/function-input-validator.js";

describe("parseFunctionInputParams", () => {
  it("parses valid function input", () => {
    const schema = z.object({ quantity: z.number() });

    expect(parseFunctionInputParams("extension.cafe.addCartItem", schema, { quantity: 1 })).toEqual(
      {
        quantity: 1,
      }
    );
  });

  it("converts Zod input errors to ValidationError", () => {
    const schema = z.object({ quantity: z.number() });

    expect(() =>
      parseFunctionInputParams("extension.cafe.addCartItem", schema, { quantity: "1" })
    ).toThrowError(
      expect.objectContaining({
        name: "ValidationError",
        message: "Invalid input for function extension.cafe.addCartItem",
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({ path: ["quantity"], code: "invalid_type" }),
        ]),
      }) as ValidationError
    );
  });

  it("converts Zod errors created by another module instance", () => {
    const crossModuleError = Object.assign(new Error("Invalid input"), {
      name: "ZodError",
      issues: [{ code: "invalid_type", path: ["quantity"] }],
    });
    const schema = {
      parse: () => {
        throw crossModuleError;
      },
    } as unknown as z.ZodSchema;

    expect(() => parseFunctionInputParams("extension.cafe.addCartItem", schema, {})).toThrowError(
      expect.objectContaining({
        name: "ValidationError",
        code: "VALIDATION_ERROR",
        details: crossModuleError.issues,
      }) as ValidationError
    );
  });

  it("keeps messaging input key normalization", () => {
    const schema = z.object({ userId: z.string() });

    expect(
      parseFunctionInputParams("extension.messaging.send", schema, { user_id: "user-1" })
    ).toEqual({ userId: "user-1" });
  });

  it("does not convert non-Zod errors", () => {
    const inputError = new Error("preprocess failed");
    const schema = z.preprocess(() => {
      throw inputError;
    }, z.string());

    expect(() => parseFunctionInputParams("extension.example.run", schema, "value")).toThrow(
      inputError
    );
  });
});

it("returns the Issue invalidInput contract without copying submitted values", () => {
  expect(() =>
    parseFunctionInputParams(
      "extension.issue.core.getIssues",
      z.object({ issueIds: z.array(z.string()) }),
      { issueIds: "private-token" }
    )
  ).toThrowError(
    expect.objectContaining({
      type: "invalidInput",
      data: { type: "invalidInput", message: "Invalid Issue Extension input" },
    })
  );
});
