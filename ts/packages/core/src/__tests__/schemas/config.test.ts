import { describe, expect, it } from "vitest";
import {
  ConfigDraftResolutionParamsSchema,
  ConfigDraftResolutionOutputSchema,
  ConfigHooksSchema,
  GetConfigSchemaOutputSchema,
  ValidateStoredConfigOutputSchema,
} from "../../extensions/index.js";

describe("config extension schema", () => {
  it("preserves hidden metadata on non-field config blocks", () => {
    const parsed = GetConfigSchemaOutputSchema.parse({
      schemaVersion: "v1",
      configScope: "channel",
      providerName: "Example Provider",
      blocks: [
        { type: "section", title: "Section", hidden: true },
        { type: "description", text: "Description", hidden: true },
        { type: "divider", hidden: true },
        { type: "banner", description: "Banner", hidden: true },
        {
          type: "group",
          fields: [{ type: "text", key: "groupField", label: "Group Field" }],
          hidden: true,
        },
        { type: "native", renderer: "custom", hidden: true },
        {
          type: "action",
          label: "Run",
          functionName: "run",
          hidden: true,
        },
      ],
    });

    for (const block of parsed.blocks) {
      expect(block).toMatchObject({ hidden: true });
    }
  });

  it("preserves hidden config fields at the top level and inside groups", () => {
    const parsed = GetConfigSchemaOutputSchema.parse({
      schemaVersion: "v1",
      configScope: "channel",
      providerName: "Example Provider",
      blocks: [
        {
          type: "text",
          key: "session",
          label: "Session",
          storageClass: "credential",
          hidden: true,
        },
        {
          type: "group",
          fields: [
            {
              type: "text",
              key: "internalId",
              label: "Internal ID",
              hidden: true,
            },
          ],
        },
      ],
    });

    expect(parsed.blocks[0]).toMatchObject({ key: "session", hidden: true });
    expect(parsed.blocks[1]).toMatchObject({
      type: "group",
      fields: [{ key: "internalId", hidden: true }],
    });
  });

  it("preserves dynamic multi-config metadata", () => {
    const parsed = GetConfigSchemaOutputSchema.parse({
      schemaVersion: "v1",
      configScope: "channel",
      providerName: "Example Provider",
      supportsMultiple: true,
      keyResolverFunctionName: "config.resolveKey",
      blocks: [{ type: "text", key: "type", label: "Type" }],
    });

    expect(parsed.supportsMultiple).toBe(true);
    expect(parsed.keyResolverFunctionName).toBe("config.resolveKey");
  });

  it("accepts layout-aware grouped config fields", () => {
    const parsed = GetConfigSchemaOutputSchema.parse({
      schemaVersion: "v1",
      configScope: "channel",
      providerName: "Cafe24 Hub",
      title: "Cafe24 setup",
      oauth: {
        additionalParams: [{ name: "domain", fieldKey: "commerceDomain" }],
        clientCredentials: {
          clientIdFieldKey: "oauthClientId",
          clientSecretFieldKey: "oauthClientSecret",
        },
      },
      hooks: {
        draftResolverFunctionName: "cafe24.config.resolveDraft",
        validateFunctionName: "cafe24.config.validate",
      },
      blocks: [
        {
          type: "section",
          id: "wms-settings",
          title: "WMS settings",
          description: "Configure the provider before enabling task flows.",
          visibleWhen: [
            {
              fieldKey: "wmsType",
              operator: "exists",
            },
          ],
        },
        {
          type: "group",
          title: "Connection",
          layout: "row",
          visibleWhen: [
            {
              fieldKey: "wmsType",
              operator: "ne",
              value: "none",
            },
          ],
          fields: [
            {
              type: "select",
              key: "wmsType",
              label: "WMS type",
              required: true,
              choices: [
                { label: "Acme Commerce", value: "acme-commerce" },
                { label: "Doortodoor", value: "doortodoor" },
              ],
            },
            {
              type: "phone",
              key: "supportPhone",
              label: "Support phone",
              helperText:
                "Need a format guide? Check {guide} before saving.\nInternational format is recommended.",
              helperLinks: [
                {
                  key: "guide",
                  label: "the guide",
                  url: "https://example.com/guide",
                },
              ],
              fieldLabels: {
                countryCode: "Country code",
                number: "Phone number",
              },
            },
            {
              type: "multiselect",
              key: "claimTypes",
              label: "Claim types",
              choices: [
                { label: "Cancel", value: "cancel" },
                { label: "Return", value: "return" },
              ],
            },
            {
              type: "address",
              key: "returnAddress",
              label: "Return address",
              searchEnabled: true,
              fieldLabels: {
                recipient: "Recipient",
                countryCode: "Country code",
                phone: "Phone",
                postcode: "Postcode",
                address1: "Address line 1",
                address2: "Address line 2",
              },
            },
            {
              type: "image",
              key: "otpQrImage",
              label: "OTP QR image",
              storageClass: "transient",
              accept: ["image/*"],
              maxFileSizeMb: 2,
              resolvesTo: {
                key: "otpSecret",
                storageClass: "credential",
                sensitive: true,
                maskType: "full",
              },
            },
            {
              type: "image",
              key: "brandLogo",
              label: "Brand logo",
              storageClass: "media",
              media: { visibility: "public" },
              accept: ["image/png", "image/jpeg"],
              maxFileSizeMb: 5,
            },
          ],
        },
        {
          type: "description",
          text: "Complete the setup and save to continue.",
          helperLinks: [
            {
              key: "setup",
              label: "setup guide",
              url: "/relative/setup-guide",
            },
          ],
          visibleWhen: [
            {
              fieldKey: "claimTypes",
              operator: "exists",
            },
          ],
        },
      ],
    });

    expect(parsed.blocks).toHaveLength(3);
    expect(parsed.oauth?.additionalParams?.[0]).toEqual({
      name: "domain",
      fieldKey: "commerceDomain",
    });
    expect(parsed.oauth?.clientCredentials).toEqual({
      clientIdFieldKey: "oauthClientId",
      clientSecretFieldKey: "oauthClientSecret",
    });
    expect(parsed.hooks?.draftResolverFunctionName).toBe("cafe24.config.resolveDraft");
    if (parsed.blocks[1]?.type === "group") {
      const group = parsed.blocks[1];
      const otpQrImage = group.fields.find((field) => field.key === "otpQrImage");
      const brandLogo = group.fields.find((field) => field.key === "brandLogo");

      expect(group.fields[1]?.helperLinks?.[0]?.key).toBe("guide");
      expect(group.visibleWhen?.[0]?.fieldKey).toBe("wmsType");
      expect(otpQrImage?.type).toBe("image");
      expect(otpQrImage?.storageClass).toBe("transient");
      expect(otpQrImage?.accept).toEqual(["image/*"]);
      expect(otpQrImage?.maxFileSizeMb).toBe(2);
      expect(otpQrImage?.resolvesTo?.key).toBe("otpSecret");
      expect(otpQrImage?.resolvesTo?.storageClass).toBe("credential");
      expect(otpQrImage?.resolvesTo?.sensitive).toBe(true);
      expect(otpQrImage?.resolvesTo?.maskType).toBe("full");
      expect(brandLogo?.type).toBe("image");
      expect(brandLogo?.storageClass).toBe("media");
      expect(brandLogo?.media?.visibility).toBe("public");
      expect(brandLogo?.accept).toEqual(["image/png", "image/jpeg"]);
      expect(brandLogo?.maxFileSizeMb).toBe(5);
    }
    if (parsed.blocks[2]?.type === "description") {
      expect(parsed.blocks[2].helperLinks?.[0]?.url).toBe("/relative/setup-guide");
    }
  });

  it("accepts locale maps for user-facing config text", () => {
    const parsed = GetConfigSchemaOutputSchema.parse({
      schemaVersion: "v1",
      configScope: "channel",
      providerName: "Cafe24 Hub",
      title: "Cafe24 setup",
      description: "Configure Cafe24 credentials.",
      i18nMap: {
        ko: {
          providerName: "Cafe24 허브",
          title: "Cafe24 설정",
          description: "Cafe24 인증 정보를 설정하세요.",
        },
        ja: {
          title: "Cafe24設定",
          description: "Cafe24認証情報を設定してください。",
        },
        en: {
          title: "Cafe24 setup",
        },
      },
      overview: {
        title: "Connected stores",
        description: "Manage connected store settings.",
        nameLabel: "Store name",
        addLabel: "Add store",
        statusLabel: "Status",
        i18nMap: {
          ko: {
            title: "연결된 스토어",
            description: "연결된 스토어 설정을 관리하세요.",
            nameLabel: "스토어 이름",
            addLabel: "스토어 추가",
            statusLabel: "상태",
          },
        },
      },
      settings: {
        title: "Defaults",
        description: "Choose the default connected store.",
        defaultSelectors: [
          {
            key: "defaultStoreKey",
            label: "Default store",
            placeholder: "Select a default store",
            noneLabel: "No default",
            onChangeSuccessMessage: "Default store updated.",
            i18nMap: {
              ko: {
                label: "기본 스토어",
                placeholder: "기본 스토어 선택",
                noneLabel: "선택 안 함",
                onChangeSuccessMessage: "기본 스토어가 변경되었습니다.",
              },
            },
          },
        ],
        i18nMap: {
          ko: {
            title: "기본값",
            description: "기본 연결 스토어를 선택하세요.",
          },
        },
      },
      blocks: [
        {
          type: "section",
          title: "Connection",
          menuLabel: "Connection settings",
          menuIcon: "settings",
          i18nMap: {
            ko: { title: "연동", menuLabel: "연동 설정" },
          },
        },
        {
          type: "select",
          key: "storeType",
          label: "Store type",
          description: "Choose the store type.",
          placeholder: "Select a store type",
          overviewLabel: "Store",
          overviewDescription: "Selected store type",
          helperText: "Use {guide} if you are unsure.",
          helperLinks: [
            {
              key: "guide",
              label: "setup guide",
              url: "https://example.com/en/guide",
              i18nMap: {
                ko: {
                  label: "설정 가이드",
                  url: "https://example.com/ko/guide",
                },
              },
            },
          ],
          i18nMap: {
            ko: {
              label: "스토어 유형",
              description: "스토어 유형을 선택하세요.",
              placeholder: "스토어 유형 선택",
              overviewLabel: "스토어",
              overviewDescription: "선택된 스토어 유형",
              helperText: "잘 모르겠다면 {guide}를 확인하세요.",
            },
          },
          choices: [
            {
              label: "Online",
              value: "online",
              description: "Online store",
              i18nMap: {
                ko: {
                  label: "온라인",
                  description: "온라인 스토어",
                },
              },
            },
          ],
        },
        {
          type: "phone",
          key: "supportPhone",
          label: "Support phone",
          countryCodePlaceholder: "+82",
          numberPlaceholder: "10-0000-0000",
          i18nMap: {
            ko: {
              label: "고객센터 전화번호",
              countryCodePlaceholder: "국가번호",
              numberPlaceholder: "전화번호",
            },
          },
        },
        {
          type: "address",
          key: "returnAddress",
          label: "Return address",
          fieldLabels: {
            recipient: "Recipient",
            address1: "Address line 1",
          },
          recipientPlaceholder: "Name",
          address1Placeholder: "Street",
          i18nMap: {
            ko: {
              label: "반품 주소",
              fieldLabels: {
                recipient: "수령인",
                address1: "주소",
              },
              recipientPlaceholder: "이름",
              address1Placeholder: "도로명 주소",
            },
          },
        },
        {
          type: "action",
          label: "Sync store",
          description: "Fetch the latest store data.",
          functionName: "cafe24.config.syncStore",
          buttonStyle: "secondary",
          afterSuccess: ["reload"],
          successMessage: "Store data synced.",
          showInOverviewMenu: true,
          menuIcon: "disconnect",
          i18nMap: {
            ko: {
              label: "스토어 동기화",
              description: "최신 스토어 데이터를 가져옵니다.",
              successMessage: "스토어 데이터가 동기화되었습니다.",
            },
          },
        },
      ],
    });

    expect(parsed.i18nMap?.ko?.providerName).toBe("Cafe24 허브");
    expect(parsed.i18nMap?.ko?.title).toBe("Cafe24 설정");
    expect(parsed.overview?.i18nMap?.ko?.nameLabel).toBe("스토어 이름");
    expect(parsed.settings?.i18nMap?.ko?.title).toBe("기본값");
    expect(parsed.settings?.defaultSelectors?.[0]?.i18nMap?.ko?.noneLabel).toBe("선택 안 함");
    expect(parsed.settings?.defaultSelectors?.[0]?.i18nMap?.ko?.placeholder).toBe(
      "기본 스토어 선택"
    );
    expect(parsed.blocks[0]?.type === "section" ? parsed.blocks[0].menuLabel : undefined).toBe(
      "Connection settings"
    );
    expect(parsed.blocks[0]?.i18nMap?.ko?.menuLabel).toBe("연동 설정");
    if (parsed.blocks[1]?.type === "select") {
      expect(parsed.blocks[1].overviewLabel).toBe("Store");
      expect(parsed.blocks[1].i18nMap?.ko?.helperText).toContain("{guide}");
      expect(parsed.blocks[1].i18nMap?.ko?.overviewLabel).toBe("스토어");
      expect(parsed.blocks[1].helperLinks?.[0]?.i18nMap?.ko?.label).toBe("설정 가이드");
      expect(parsed.blocks[1].choices?.[0]?.i18nMap?.ko?.label).toBe("온라인");
    }
    if (parsed.blocks[2]?.type === "phone") {
      expect(parsed.blocks[2].i18nMap?.ko?.countryCodePlaceholder).toBe("국가번호");
      expect(parsed.blocks[2].i18nMap?.ko?.numberPlaceholder).toBe("전화번호");
    }
    if (parsed.blocks[3]?.type === "address") {
      expect(parsed.blocks[3].i18nMap?.ko?.fieldLabels?.recipient).toBe("수령인");
      expect(parsed.blocks[3].i18nMap?.ko?.address1Placeholder).toBe("도로명 주소");
    }
    if (parsed.blocks[4]?.type === "action") {
      expect(parsed.blocks[4].successMessage).toBe("Store data synced.");
      expect(parsed.blocks[4].i18nMap?.ko?.successMessage).toBe(
        "스토어 데이터가 동기화되었습니다."
      );
    }

    const validation = ValidateStoredConfigOutputSchema.parse({
      valid: false,
      message: "Review required",
      errors: [
        {
          fieldKey: "storeType",
          message: "Store type is not supported.",
          i18nMap: { ko: { message: "지원하지 않는 스토어 유형입니다." } },
        },
      ],
      notices: [
        {
          tone: "warning",
          message: "Additional setup is required.",
          links: [
            {
              key: "guide",
              label: "guide",
              url: "https://example.com/en/guide",
              i18nMap: { ko: { label: "가이드" } },
            },
          ],
          i18nMap: { ko: { message: "추가 설정이 필요합니다." } },
        },
      ],
    });
    expect(validation.errors?.[0]?.i18nMap?.ko?.message).toBe("지원하지 않는 스토어 유형입니다.");
    expect(validation.notices?.[0]?.links?.[0]?.i18nMap?.ko?.label).toBe("가이드");
  });

  it("rejects unsupported config i18n locales", () => {
    expect(() =>
      GetConfigSchemaOutputSchema.parse({
        schemaVersion: "v1",
        configScope: "channel",
        providerName: "Cafe24 Hub",
        i18nMap: {
          fr: {
            title: "Configuration Cafe24",
          },
        },
        blocks: [
          {
            type: "text",
            key: "apiKey",
            label: "API key",
          },
        ],
      })
    ).toThrow();
  });

  it("accepts draft resolution output", () => {
    const parsed = ConfigDraftResolutionOutputSchema.parse({
      valuesPatch: {
        appWmsType: "none",
        "shippingDateOptions.allowPartial": false,
      },
      choicesPatch: {
        appWmsType: [
          {
            label: "Sabangnet",
            value: "cht-app-sabangnet",
          },
        ],
      },
    });

    expect(parsed.valuesPatch?.appWmsType).toBe("none");
    expect(parsed.choicesPatch?.appWmsType?.[0]?.label).toBe("Sabangnet");
  });

  it("accepts select choices loaded from an app function", () => {
    const parsed = GetConfigSchemaOutputSchema.parse({
      schemaVersion: "v1",
      configScope: "channel",
      providerName: "Naver SmartStore",
      blocks: [
        {
          type: "select",
          key: "selectedWmsAppId",
          label: "WMS",
          choicesSource: {
            type: "function",
            functionName: "extension.config.choices.getWmsChoices",
            params: {
              commerceType: "appNaverSmartStore",
              includeNone: true,
            },
            triggerOnLoad: true,
          },
        },
      ],
    });

    if (parsed.blocks[0]?.type === "select") {
      expect(parsed.blocks[0].choices).toBeUndefined();
      expect(parsed.blocks[0].choicesSource?.type).toBe("function");
      expect(parsed.blocks[0].choicesSource?.functionName).toBe(
        "extension.config.choices.getWmsChoices"
      );
    }
  });

  it("accepts select choices loaded from a native function", () => {
    const parsed = GetConfigSchemaOutputSchema.parse({
      schemaVersion: "v1",
      configScope: "channel",
      providerName: "Naver SmartStore",
      blocks: [
        {
          type: "select",
          key: "selectedWmsAppId",
          label: "WMS",
          choicesSource: {
            type: "nativeFunction",
            functionName: "getConfigWMSChoices",
            params: {
              commerceType: "appNaverSmartStore",
              includeNone: true,
            },
            triggerOnLoad: true,
          },
        },
      ],
    });

    if (parsed.blocks[0]?.type === "select") {
      expect(parsed.blocks[0].choices).toBeUndefined();
      expect(parsed.blocks[0].choicesSource?.functionName).toBe("getConfigWMSChoices");
    }
  });

  it("accepts draft resolution params", () => {
    const parsed = ConfigDraftResolutionParamsSchema.parse({
      scope: "channel",
      channelId: "channel-123",
      changedFieldKey: "appWmsType",
      changedValue: "none",
      values: {
        appWmsType: "none",
      },
    });

    expect(parsed.changedFieldKey).toBe("appWmsType");
    expect(parsed.values.appWmsType).toBe("none");
  });

  it("accepts config hooks that request draft resolution on initial load", () => {
    const parsed = ConfigHooksSchema.parse({
      draftResolverFunctionName: "amazon.config.resolveDraft",
      draftResolverOnLoadFieldKeys: ["marketplaceId"],
    });

    expect(parsed.draftResolverOnLoadFieldKeys).toEqual(["marketplaceId"]);
  });

  it("accepts config validation feedback", () => {
    const parsed = ValidateStoredConfigOutputSchema.parse({
      valid: false,
      reasonCode: "MISSING_REQUIRED_FIELDS",
      message: "Some required fields are missing.",
      missingFields: ["storeId"],
      errors: [
        {
          fieldKey: "storeId",
          reasonCode: "REQUIRED",
          message: "Store ID is required.",
        },
      ],
      notices: [
        {
          tone: "warning",
          title: "WMS 확인 필요",
          message: "WMS 기본 설정을 먼저 저장해주세요.",
          placement: "block",
          blockId: "wms-settings",
        },
      ],
    });

    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.notices?.[0]?.blockId).toBe("wms-settings");
  });
});
