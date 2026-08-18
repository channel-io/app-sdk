import { z } from "zod";
import type {
  ConfigBlock as ProtoConfigBlock,
  ConfigChoice as ProtoConfigChoice,
  ConfigChoicesSource as ProtoConfigChoicesSource,
  ConfigCondition as ProtoConfigCondition,
  ConfigDefaultSelector as ProtoConfigDefaultSelector,
  ConfigDraftResolutionOutput as ProtoConfigDraftResolutionOutput,
  ConfigDraftResolutionParams as ProtoConfigDraftResolutionParams,
  ConfigField as ProtoConfigField,
  ConfigGetConfigSchemaOutput as ProtoGetConfigSchemaOutput,
  ConfigHooks as ProtoConfigHooks,
  ConfigInlineLink as ProtoConfigInlineLink,
  ConfigLocalizedText as ProtoConfigLocalizedText,
  ConfigMediaOptions as ProtoConfigMediaOptions,
  ConfigOAuth as ProtoConfigOAuth,
  ConfigOAuthAdditionalParam as ProtoConfigOAuthAdditionalParam,
  ConfigOAuthClientCredentials as ProtoConfigOAuthClientCredentials,
  ConfigOverview as ProtoConfigOverview,
  ConfigResolvedValueTarget as ProtoConfigResolvedValueTarget,
  ConfigSettings as ProtoConfigSettings,
  ConfigValidateStoredConfigOutput as ProtoValidateStoredConfigOutput,
  ConfigValidationError as ProtoConfigValidationError,
  ConfigValidationNotice as ProtoConfigValidationNotice,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

export const ConfigScopeSchema = z.enum(["channel", "manager"]);
export type ConfigScope = z.infer<typeof ConfigScopeSchema>;

export const ConfigStorageClassSchema = z.enum(["config", "credential", "transient", "media"]);
export type ConfigStorageClass = z.infer<typeof ConfigStorageClassSchema>;

export const ConfigConditionOperatorSchema = z.enum([
  "eq",
  "ne",
  "in",
  "notIn",
  "exists",
  "notExists",
]);
export type ConfigConditionOperator = z.infer<typeof ConfigConditionOperatorSchema>;

export const ConfigConditionSchema = z.object({
  fieldKey: z.string(),
  operator: ConfigConditionOperatorSchema,
  value: z.unknown().optional(),
});
export type ConfigCondition = ProtoBacked<
  z.infer<typeof ConfigConditionSchema>,
  ProtoConfigCondition
>;

export const LocalizedConfigTextSchema = z.object({
  label: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  text: z.string().optional(),
  helperText: z.string().optional(),
  placeholder: z.string().optional(),
  message: z.string().optional(),
  url: z.string().optional(),
  fieldLabels: z.record(z.string(), z.string()).optional(),
  countryCodePlaceholder: z.string().optional(),
  numberPlaceholder: z.string().optional(),
  recipientPlaceholder: z.string().optional(),
  phonePlaceholder: z.string().optional(),
  postcodePlaceholder: z.string().optional(),
  address1Placeholder: z.string().optional(),
  address2Placeholder: z.string().optional(),
  providerName: z.string().optional(),
  menuLabel: z.string().optional(),
  successMessage: z.string().optional(),
  overviewLabel: z.string().optional(),
  overviewDescription: z.string().optional(),
  nameLabel: z.string().optional(),
  addLabel: z.string().optional(),
  statusLabel: z.string().optional(),
  noneLabel: z.string().optional(),
  onChangeSuccessMessage: z.string().optional(),
});
export type LocalizedConfigText = ProtoBacked<
  z.infer<typeof LocalizedConfigTextSchema>,
  ProtoConfigLocalizedText
>;

export const ConfigSupportedLocaleSchema = z.enum(["ko", "ja", "en"]);
export type ConfigSupportedLocale = z.infer<typeof ConfigSupportedLocaleSchema>;

export const ConfigI18nMapSchema = z
  .record(z.string(), LocalizedConfigTextSchema)
  .superRefine((value, ctx) => {
    for (const locale of Object.keys(value)) {
      if (!ConfigSupportedLocaleSchema.safeParse(locale).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [locale],
          message: "Unsupported config i18n locale. Supported locales: ko, ja, en.",
        });
      }
    }
  });
export type ConfigI18nMap = z.infer<typeof ConfigI18nMapSchema>;

export const ConfigChoiceSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});
export type ConfigChoice = ProtoBacked<z.infer<typeof ConfigChoiceSchema>, ProtoConfigChoice>;

export const ConfigInlineLinkSchema = z.object({
  key: z.string(),
  label: z.string(),
  url: z.string(),
  i18nMap: ConfigI18nMapSchema.optional(),
});
export type ConfigInlineLink = ProtoBacked<
  z.infer<typeof ConfigInlineLinkSchema>,
  ProtoConfigInlineLink
>;

export const ConfigNoticeToneSchema = z.enum(["info", "success", "warning", "danger"]);
export type ConfigNoticeTone = z.infer<typeof ConfigNoticeToneSchema>;

export const ConfigNoticePlacementSchema = z.enum(["top", "block"]);
export type ConfigNoticePlacement = z.infer<typeof ConfigNoticePlacementSchema>;

export const ConfigValidationNoticeSchema = z.object({
  tone: ConfigNoticeToneSchema.default("info"),
  title: z.string().optional(),
  message: z.string(),
  placement: ConfigNoticePlacementSchema.optional(),
  blockId: z.string().optional(),
  links: z.array(ConfigInlineLinkSchema).optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});
export type ConfigValidationNotice = ProtoBacked<
  z.infer<typeof ConfigValidationNoticeSchema>,
  ProtoConfigValidationNotice
>;

export const ConfigHooksSchema = z.object({
  draftResolverFunctionName: z.string().optional(),
  validateFunctionName: z.string().optional(),
  draftResolverOnLoadFieldKeys: z.array(z.string()).optional(),
});
export type ConfigHooks = ProtoBacked<z.infer<typeof ConfigHooksSchema>, ProtoConfigHooks>;

export const ConfigOAuthAdditionalParamSchema = z.object({
  name: z.string(),
  fieldKey: z.string(),
});
export type ConfigOAuthAdditionalParam = ProtoBacked<
  z.infer<typeof ConfigOAuthAdditionalParamSchema>,
  ProtoConfigOAuthAdditionalParam
>;

export const ConfigOAuthClientCredentialsSchema = z.object({
  clientIdFieldKey: z.string(),
  clientSecretFieldKey: z.string(),
});
export type ConfigOAuthClientCredentials = ProtoBacked<
  z.infer<typeof ConfigOAuthClientCredentialsSchema>,
  ProtoConfigOAuthClientCredentials
>;

export const ConfigOAuthSchema = z.object({
  additionalParams: z.array(ConfigOAuthAdditionalParamSchema).optional(),
  clientCredentials: ConfigOAuthClientCredentialsSchema.optional(),
});
export type ConfigOAuth = ProtoBacked<z.infer<typeof ConfigOAuthSchema>, ProtoConfigOAuth>;

const BaseConfigChoicesSourceSchema = z.object({
  functionName: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  triggerOnLoad: z.boolean().optional(),
  triggerFieldKeys: z.array(z.string()).optional(),
});

export const ConfigChoicesSourceSchema = z.discriminatedUnion("type", [
  BaseConfigChoicesSourceSchema.extend({
    type: z.literal("function"),
    appId: z.string().optional(),
  }),
  BaseConfigChoicesSourceSchema.extend({
    type: z.literal("nativeFunction"),
  }),
]);
export type ConfigChoicesSource = ProtoBacked<
  z.infer<typeof ConfigChoicesSourceSchema>,
  ProtoConfigChoicesSource
>;

const ConfigOverviewSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  nameLabel: z.string().optional(),
  addLabel: z.string().optional(),
  statusLabel: z.string().optional(),
  connectedAtMetadataKey: z.string().optional(),
  connectedByMetadataKey: z.string().optional(),
  featureSectionId: z.string().optional(),
  showAddIcon: z.boolean().optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});
export type ConfigOverview = ProtoBacked<z.infer<typeof ConfigOverviewSchema>, ProtoConfigOverview>;

const ConfigDefaultSelectorSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().optional(),
  descriptionDisplay: z.enum(["inline", "tooltip"]).optional(),
  placeholder: z.string().optional(),
  noneLabel: z.string().optional(),
  onChangeFunctionName: z.string().optional(),
  onChangeAppId: z.string().optional(),
  onChangeParams: z.record(z.string(), z.unknown()).optional(),
  onChangeSuccessMessage: z.string().optional(),
  defaultValueMetadataKey: z.string().optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});
export type ConfigDefaultSelector = ProtoBacked<
  z.infer<typeof ConfigDefaultSelectorSchema>,
  ProtoConfigDefaultSelector
>;

const ConfigSettingsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  defaultSelectors: z.array(ConfigDefaultSelectorSchema).optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});
export type ConfigSettings = ProtoBacked<z.infer<typeof ConfigSettingsSchema>, ProtoConfigSettings>;

export const ConfigDraftResolutionParamsSchema = z.object({
  scope: ConfigScopeSchema,
  channelId: z.string(),
  managerId: z.string().optional(),
  changedFieldKey: z.string(),
  changedValue: z.unknown(),
  values: z.record(z.string(), z.unknown()),
});
export type ConfigDraftResolutionParams = ProtoBacked<
  z.infer<typeof ConfigDraftResolutionParamsSchema>,
  ProtoConfigDraftResolutionParams
>;

const ConfigPhoneFieldLabelsSchema = z.object({
  countryCode: z.string().optional(),
  number: z.string().optional(),
});

const ConfigAddressFieldLabelsSchema = z.object({
  recipient: z.string().optional(),
  countryCode: z.string().optional(),
  phone: z.string().optional(),
  postcode: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
});

const ConfigMediaOptionsSchema = z.object({
  visibility: z.enum(["public"]).optional(),
});
export type ConfigMediaOptions = ProtoBacked<
  z.infer<typeof ConfigMediaOptionsSchema>,
  ProtoConfigMediaOptions
>;

export const ConfigResolvedValueTargetSchema = z.object({
  key: z.string(),
  storageClass: z.enum(["config", "credential"]).optional(),
  sensitive: z.boolean().optional(),
  maskType: z.string().optional(),
});
export type ConfigResolvedValueTarget = ProtoBacked<
  z.infer<typeof ConfigResolvedValueTargetSchema>,
  ProtoConfigResolvedValueTarget
>;

const BaseConfigFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().optional(),
  helperText: z.string().optional(),
  helperLinks: z.array(ConfigInlineLinkSchema).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  validationRegex: z.string().optional(),
  storageClass: ConfigStorageClassSchema.optional(),
  media: ConfigMediaOptionsSchema.optional(),
  resolvesTo: ConfigResolvedValueTargetSchema.optional(),
  visibleWhen: z.array(ConfigConditionSchema).optional(),
  enabledWhen: z.array(ConfigConditionSchema).optional(),
  defaultValue: z.unknown().optional(),
  choicesSource: ConfigChoicesSourceSchema.optional(),
  overviewSummary: z.boolean().optional(),
  overviewFeature: z.boolean().optional(),
  overviewLabel: z.string().optional(),
  overviewDescription: z.string().optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});

const TextConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("text"),
});

const TextAreaConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("textarea"),
  rows: z.number().int().positive().optional(),
});

const PasswordConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("password"),
  maskType: z.string().optional(),
});

const NumberConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

const SelectConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("select"),
  choices: z.array(ConfigChoiceSchema).optional(),
});

const MultiSelectConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("multiselect"),
  choices: z.array(ConfigChoiceSchema).optional(),
  minSelections: z.number().int().nonnegative().optional(),
  maxSelections: z.number().int().positive().optional(),
});

const RadioConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("radio"),
  choices: z.array(ConfigChoiceSchema).optional(),
});

const CheckboxConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("checkbox"),
});

const SwitchConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("switch"),
});

const PhoneConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("phone"),
  format: z.enum(["national", "international"]).optional(),
  countryCodeChoices: z.array(ConfigChoiceSchema).optional(),
  fieldLabels: ConfigPhoneFieldLabelsSchema.optional(),
  countryCodePlaceholder: z.string().optional(),
  numberPlaceholder: z.string().optional(),
});

const AddressConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("address"),
  searchEnabled: z.boolean().optional(),
  postcodeLookupUrl: z.string().optional(),
  countryCodeChoices: z.array(ConfigChoiceSchema).optional(),
  fieldLabels: ConfigAddressFieldLabelsSchema.optional(),
  recipientPlaceholder: z.string().optional(),
  countryCodePlaceholder: z.string().optional(),
  phonePlaceholder: z.string().optional(),
  postcodePlaceholder: z.string().optional(),
  address1Placeholder: z.string().optional(),
  address2Placeholder: z.string().optional(),
});

const ImageConfigFieldSchema = BaseConfigFieldSchema.extend({
  type: z.literal("image"),
  accept: z.array(z.string()).optional(),
  maxFileSizeMb: z.number().positive().optional(),
  multiple: z.boolean().optional(),
});

const ConfigFieldSchemas = [
  TextConfigFieldSchema,
  TextAreaConfigFieldSchema,
  PasswordConfigFieldSchema,
  NumberConfigFieldSchema,
  SelectConfigFieldSchema,
  MultiSelectConfigFieldSchema,
  RadioConfigFieldSchema,
  CheckboxConfigFieldSchema,
  SwitchConfigFieldSchema,
  PhoneConfigFieldSchema,
  AddressConfigFieldSchema,
  ImageConfigFieldSchema,
] as const;

export const ConfigFieldSchema = z.discriminatedUnion("type", ConfigFieldSchemas);
export type ConfigField = ProtoBacked<z.infer<typeof ConfigFieldSchema>, ProtoConfigField>;

const ConfigSectionBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("section"),
  title: z.string(),
  description: z.string().optional(),
  menuLabel: z.string().optional(),
  menuIcon: z.enum(["edit", "settings"]).optional(),
  visibleWhen: z.array(ConfigConditionSchema).optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});

const ConfigDescriptionBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("description"),
  text: z.string(),
  helperLinks: z.array(ConfigInlineLinkSchema).optional(),
  visibleWhen: z.array(ConfigConditionSchema).optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});

const ConfigDividerBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("divider"),
  visibleWhen: z.array(ConfigConditionSchema).optional(),
});

const ConfigBannerBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("banner"),
  tone: z.enum(["info", "success", "warning", "danger"]).default("info"),
  title: z.string().optional(),
  description: z.string(),
  visibleWhen: z.array(ConfigConditionSchema).optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});

const ConfigGroupBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("group"),
  title: z.string().optional(),
  description: z.string().optional(),
  layout: z.enum(["column", "row", "grid"]).default("column"),
  visibleWhen: z.array(ConfigConditionSchema).optional(),
  fields: z.array(ConfigFieldSchema).min(1),
  i18nMap: ConfigI18nMapSchema.optional(),
});

const ConfigNativeBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("native"),
  renderer: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
});

const ConfigActionBlockSchema = z.object({
  id: z.string().optional(),
  type: z.literal("action"),
  label: z.string(),
  description: z.string().optional(),
  functionName: z.string(),
  appId: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  buttonStyle: z.enum(["primary", "secondary", "danger"]).optional(),
  validateBeforeRun: z.boolean().optional(),
  validationFieldKeys: z.array(z.string()).optional(),
  saveBeforeRun: z.boolean().optional(),
  afterSuccess: z.array(z.enum(["save", "delete", "reload"])).optional(),
  successMessage: z.string().optional(),
  showInOverviewMenu: z.boolean().optional(),
  menuIcon: z.enum(["disconnect", "delete"]).optional(),
  visibleWhen: z.array(ConfigConditionSchema).optional(),
  enabledWhen: z.array(ConfigConditionSchema).optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
});
export type ConfigActionBlock = ProtoBacked<
  z.infer<typeof ConfigActionBlockSchema>,
  ProtoConfigBlock
>;

export const ConfigBlockSchema = z.union([
  ConfigSectionBlockSchema,
  ConfigDescriptionBlockSchema,
  ConfigDividerBlockSchema,
  ConfigBannerBlockSchema,
  ConfigGroupBlockSchema,
  ConfigNativeBlockSchema,
  ConfigActionBlockSchema,
  ...ConfigFieldSchemas,
]);
export type ConfigBlock = ProtoBacked<z.infer<typeof ConfigBlockSchema>, ProtoConfigBlock>;

export const GetConfigSchemaOutputSchema = z.object({
  schemaVersion: z.literal("v1").default("v1"),
  configScope: ConfigScopeSchema,
  providerName: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  i18nMap: ConfigI18nMapSchema.optional(),
  legacyCredentialFallback: z.literal("apikey").optional(),
  oauth: ConfigOAuthSchema.optional(),
  hooks: ConfigHooksSchema.optional(),
  blocks: z.array(ConfigBlockSchema).min(1),
  supportsMultiple: z.boolean().optional(),
  keyResolverFunctionName: z.string().optional(),
  overview: ConfigOverviewSchema.optional(),
  settings: ConfigSettingsSchema.optional(),
});
export type GetConfigSchemaOutput = ProtoBacked<
  z.infer<typeof GetConfigSchemaOutputSchema>,
  ProtoGetConfigSchemaOutput
>;

export const ConfigValidationErrorSchema = z.object({
  fieldKey: z.string().optional(),
  reasonCode: z.string().optional(),
  message: z.string(),
  i18nMap: ConfigI18nMapSchema.optional(),
});
export type ConfigValidationError = ProtoBacked<
  z.infer<typeof ConfigValidationErrorSchema>,
  ProtoConfigValidationError
>;

export const ValidateStoredConfigOutputSchema = z.object({
  valid: z.boolean(),
  reasonCode: z.string().optional(),
  message: z.string().optional(),
  missingFields: z.array(z.string()).optional(),
  errors: z.array(ConfigValidationErrorSchema).optional(),
  notices: z.array(ConfigValidationNoticeSchema).optional(),
});
export type ValidateStoredConfigOutput = ProtoBacked<
  z.infer<typeof ValidateStoredConfigOutputSchema>,
  ProtoValidateStoredConfigOutput
>;

export const ConfigDraftResolutionOutputSchema = z.object({
  valuesPatch: z.record(z.string(), z.unknown()).optional(),
  choicesPatch: z.record(z.string(), z.array(ConfigChoiceSchema)).optional(),
});
export type ConfigDraftResolutionOutput = ProtoBacked<
  z.infer<typeof ConfigDraftResolutionOutputSchema>,
  ProtoConfigDraftResolutionOutput
>;
