import { z } from "zod";
import type {
  CustomTabActionResult as ProtoCustomTabActionResult,
  CustomTabConfig as ProtoCustomTabConfig,
  CustomTabGetCustomTabsOutput as ProtoGetCustomTabsOutput,
  CustomTabNameI18n as ProtoCustomTabNameI18n,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

/**
 * I18n name for custom tab
 */
export const CustomTabNameI18nSchema = z.object({
  name: z.string().min(1).max(30),
});

export type CustomTabNameI18n = ProtoBacked<
  z.infer<typeof CustomTabNameI18nSchema>,
  ProtoCustomTabNameI18n
>;

/**
 * Custom tab metadata schema returned from extension.customtab.metadata.getCustomTabs.
 */
export const CustomTabConfigSchema = z.object({
  /**
   * Tab name (displayed in the Desk UI)
   */
  name: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[a-zA-Z_-]*$/),
  /**
   * App function invoked when the custom tab is opened.
   */
  actionFunctionName: z.string().min(1),
  /**
   * System version used when invoking custom tab functions
   */
  systemVersion: z.string().optional(),
  /**
   * i18n name map keyed by language code (e.g., "ko", "en", "ja")
   */
  nameI18nMap: z.record(z.string(), CustomTabNameI18nSchema).optional(),
});

export type CustomTabConfig = ProtoBacked<
  z.infer<typeof CustomTabConfigSchema>,
  ProtoCustomTabConfig
>;

/**
 * Metadata response schema for custom tab registration
 */
export const GetCustomTabsOutputSchema = z.object({
  customTabs: z.array(CustomTabConfigSchema).max(5),
});

export type GetCustomTabsOutput = ProtoBacked<
  z.infer<typeof GetCustomTabsOutputSchema>,
  ProtoGetCustomTabsOutput
>;

/**
 * Custom tab action result schema — matches AppStore action payloads.
 */
export const CustomTabActionResultSchema = z
  .object({
    type: z.string().min(1),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CustomTabActionResult = ProtoBacked<
  z.infer<typeof CustomTabActionResultSchema>,
  ProtoCustomTabActionResult
>;
