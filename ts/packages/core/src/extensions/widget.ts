import { z } from "zod";
import type {
  WidgetActionResult as ProtoWidgetActionResult,
  WidgetConfig as ProtoWidgetConfig,
  WidgetGetWidgetsOutput as ProtoGetWidgetsOutput,
  WidgetNameDescI18n as ProtoNameDescI18n,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

/**
 * Widget scope - where the widget is displayed
 */
export const WidgetScope = z.enum(["front", "desk"]);
export type WidgetScope = z.infer<typeof WidgetScope>;

/**
 * Widget type - how the widget behaves
 */
export const WidgetType = z.enum(["wam", "snippet"]);
export type WidgetType = z.infer<typeof WidgetType>;

/**
 * I18n name/description pair
 */
export const NameDescI18nSchema = z.object({
  name: z.string().min(1).max(30),
  description: z.string().max(100).optional(),
});

export type NameDescI18n = ProtoBacked<z.infer<typeof NameDescI18nSchema>, ProtoNameDescI18n>;

const WidgetMetadataBaseSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z_-]*$/),
  /**
   * App function invoked when the widget is opened or triggered.
   */
  actionFunctionName: z.string().min(1),
  /**
   * System version used when invoking widget functions
   */
  systemVersion: z.string().optional(),
  /**
   * Default widget title displayed by AppStore/Desk.
   */
  defaultName: z.string().max(30).optional(),
  /**
   * Default widget description displayed by AppStore/Desk.
   */
  defaultDescription: z.string().max(100).optional(),
  /**
   * i18n default name/description map keyed by language code.
   */
  defaultNameDescI18nMap: z.record(z.string(), NameDescI18nSchema).optional(),
});

/**
 * Widget metadata schema returned from extension.widget.metadata.getWidgets.
 *
 * This matches Channel App platform's metadata registration contract. Snippet widgets
 * that rely on `snippetApiUrl` should use the dedicated snippet registration
 * APIs instead of metadata discovery.
 */
export const WidgetConfigSchema = z.union([
  WidgetMetadataBaseSchema.extend({
    scope: WidgetScope,
    widgetType: z.literal("wam").optional(),
  }),
  WidgetMetadataBaseSchema.extend({
    scope: z.literal("desk"),
    widgetType: z.literal("snippet"),
  }),
]);

export type WidgetConfig = ProtoBacked<z.infer<typeof WidgetConfigSchema>, ProtoWidgetConfig>;

/**
 * Metadata response schema for widget registration
 */
export const GetWidgetsOutputSchema = z.object({
  widgets: z.array(WidgetConfigSchema).max(30),
});

export type GetWidgetsOutput = ProtoBacked<
  z.infer<typeof GetWidgetsOutputSchema>,
  ProtoGetWidgetsOutput
>;

/**
 * Widget action result schema — matches AppStore action payloads.
 */
export const WidgetActionResultSchema = z
  .object({
    type: z.string().min(1),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type WidgetActionResult = ProtoBacked<
  z.infer<typeof WidgetActionResultSchema>,
  ProtoWidgetActionResult
>;
