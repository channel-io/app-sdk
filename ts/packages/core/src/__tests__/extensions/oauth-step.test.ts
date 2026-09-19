import { describe, expect, it } from "vitest";
import {
  GetHooksOutputSchema,
  OAuthFlowHookResultSchema,
  OAuthStepDisplaySchema,
  OAuthStepIconSchema,
} from "../../extensions/index.js";
import { NativeOAuthFlowSchema } from "../../schemas/native.js";
import { zodToJsonSchema } from "../../utils/zod-to-json-schema.js";

describe("optional OAuth step presentation", () => {
  it("validates semantic icons, translations and text limits", () => {
    for (const icon of OAuthStepIconSchema.options) {
      expect(
        OAuthStepDisplaySchema.parse({ title: "Install", icon, i18nMap: { ko: { title: "설치" } } })
          .icon
      ).toBe(icon);
    }
    for (const value of [
      { title: "" },
      { title: "x".repeat(81) },
      { title: "Install", description: "x".repeat(301) },
      { title: "Install", icon: "https://image.example/icon.svg" },
      { title: "Install", i18nMap: { fr: { title: "Installer" } } },
      { title: "Install", i18nMap: { ko: { title: " \t\n " } } },
    ])
      expect(OAuthStepDisplaySchema.safeParse(value).success).toBe(false);
  });
  it("preserves locale restrictions when exporting the JSON Schema", () => {
    const schema = zodToJsonSchema(OAuthStepDisplaySchema) as {
      properties: {
        i18nMap: { propertyNames?: { pattern: string; minLength: number; maxLength: number } };
      };
    };
    const names = schema.properties.i18nMap.propertyNames;
    expect(names).toBeDefined();
    for (const locale of ["ko", "en", "ja", "fr", "ko-KR", "en\n"]) {
      expect(
        locale.length >= names!.minLength &&
          locale.length <= names!.maxLength &&
          new RegExp(names!.pattern).test(locale)
      ).toBe(["ko", "en", "ja"].includes(locale));
    }
  });
  it("allows presentation only on authorization hooks", () => {
    for (const type of [
      "oauth.beforeAuthorization",
      "oauth.afterAuthorization",
      "oauth.connected",
    ]) {
      const result = GetHooksOutputSchema.safeParse({
        hooks: [{ type, actionFunctionName: "hook", display: { title: "Install" } }],
      });
      expect(result.success).toBe(type !== "oauth.connected");
    }
  });
  it("keeps actions unchanged and accepts bounded optional result detail", () => {
    for (const action of [
      { type: "continue" },
      { type: "redirect", url: "https://provider.example/setup" },
    ]) {
      expect(OAuthFlowHookResultSchema.safeParse(action).success).toBe(true);
      expect(
        OAuthFlowHookResultSchema.safeParse({ ...action, detail: "example-org" }).success
      ).toBe(true);
      expect(
        OAuthFlowHookResultSchema.safeParse({ ...action, detail: "x".repeat(201) }).success
      ).toBe(false);
      expect(OAuthFlowHookResultSchema.safeParse({ ...action, detail: null }).success).toBe(false);
    }
    expect(
      OAuthFlowHookResultSchema.safeParse({ type: "continue", url: "https://provider.example" })
        .success
    ).toBe(false);
  });
  it("accepts old flows and platform-owned progress", () => {
    const flow = { id: "flow", phase: "after", expiresAt: "2030-01-01T00:00:00Z" };
    expect(NativeOAuthFlowSchema.safeParse(flow).success).toBe(true);
    expect(
      NativeOAuthFlowSchema.safeParse({
        ...flow,
        steps: [
          { id: "oauth", title: "Account", icon: "account", status: "completed", detail: "user" },
        ],
      }).success
    ).toBe(true);
  });
});
