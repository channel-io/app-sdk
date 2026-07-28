import { z } from "zod";
import type {
  StoreFaq as ProtoStoreFaq,
  StoreGetProfileInput as ProtoGetStoreProfileInput,
  StoreGetProfileOutput as ProtoGetStoreProfileOutput,
  StoreProfileImage as ProtoStoreProfileImage,
  StoreProfileIntro as ProtoStoreProfileIntro,
  StoreProfileLocalizedContent as ProtoStoreProfileLocalizedContent,
} from "../gen/channel/app/sdk/v1/extension.js";
import type { Context } from "../types/context.js";
import type { ExtensionDefinition } from "../types/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

const StoreNonEmptyStringSchema = z.string().trim().min(1);
const StoreMediaKeySchema = StoreNonEmptyStringSchema;
const StoreProfileLocaleSchema = z
  .string()
  .min(1)
  .refine((locale) => locale.trim() === locale, {
    message: "Store profile locale keys must not contain surrounding whitespace.",
  });

export const StoreProfileImageSchema = z
  .object({
    key: StoreMediaKeySchema,
    alt: z.string().max(120).optional(),
  })
  .strict();
export type StoreProfileImage = ProtoBacked<
  z.infer<typeof StoreProfileImageSchema>,
  ProtoStoreProfileImage
>;

export const StoreProfileIntroSchema = z
  .object({
    helpsWith: z.string(),
    recommendedFor: z.string(),
  })
  .strict();
export type StoreProfileIntro = ProtoBacked<
  z.infer<typeof StoreProfileIntroSchema>,
  ProtoStoreProfileIntro
>;

export const StoreFaqSchema = z
  .object({
    question: StoreNonEmptyStringSchema,
    answer: z.string(),
  })
  .strict();
export type StoreFaq = ProtoBacked<z.infer<typeof StoreFaqSchema>, ProtoStoreFaq>;

export const StoreProfileLocalizedContentSchema = z
  .object({
    images: z.array(StoreProfileImageSchema),
    intro: StoreProfileIntroSchema,
    faqs: z.array(StoreFaqSchema),
  })
  .strict();
export type StoreProfileLocalizedContent = ProtoBacked<
  z.infer<typeof StoreProfileLocalizedContentSchema>,
  ProtoStoreProfileLocalizedContent
>;

/**
 * Metadata supplied by the extension source. Empty localized arrays and intro strings intentionally
 * leave those fields available for an App Store Developer GUI fallback. Root content is optional
 * and remains distinct from every authored locale.
 */
export const StoreProfileMetadataSchema = z
  .object({
    relatedAppIds: z.array(StoreNonEmptyStringSchema),
    i18nMap: z.record(StoreProfileLocaleSchema, StoreProfileLocalizedContentSchema),
    root: StoreProfileLocalizedContentSchema.optional(),
  })
  .strict();
export type StoreProfileMetadata = ProtoBacked<
  z.infer<typeof StoreProfileMetadataSchema>,
  ProtoGetStoreProfileOutput
>;

// Compatibility aliases preserve the public symbol names while adopting the persisted shape.
export const StoreProfileI18nSchema = StoreProfileLocalizedContentSchema;
export type StoreProfileI18n = StoreProfileLocalizedContent;
export const StoreProfileSchema = StoreProfileMetadataSchema;
export type StoreProfile = StoreProfileMetadata;

export const GetStoreProfileInputSchema = z.object({}).strict();
export type GetStoreProfileInput = ProtoBacked<
  z.infer<typeof GetStoreProfileInputSchema>,
  ProtoGetStoreProfileInput
>;

export const GetStoreProfileOutputSchema = StoreProfileMetadataSchema;
export type GetStoreProfileOutput = StoreProfileMetadata;

export type StoreProfileProvider =
  StoreProfileMetadata | ((ctx: Context) => StoreProfileMetadata | Promise<StoreProfileMetadata>);

export function defineStoreProfile(profile: StoreProfileMetadata): StoreProfileMetadata {
  return StoreProfileMetadataSchema.parse(profile);
}

export function defineStoreProfileOutput(profile: StoreProfileMetadata): GetStoreProfileOutput {
  return GetStoreProfileOutputSchema.parse(profile);
}

export function createStoreExtension(provider: StoreProfileProvider): ExtensionDefinition {
  return {
    name: "store",
    systemVersion: "v1",
    groups: {
      metadata: {
        getStoreProfile: {
          description: "Return persisted App Store presentation metadata for this app.",
          input: GetStoreProfileInputSchema,
          output: GetStoreProfileOutputSchema,
          handler: async (ctx) => {
            const metadata = typeof provider === "function" ? await provider(ctx) : provider;
            return GetStoreProfileOutputSchema.parse(metadata);
          },
        },
      },
    },
  };
}
