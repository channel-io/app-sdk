import { z } from "zod";
import type {
  SuggestionGetTriggersInput as ProtoGetSuggestionTriggersInput,
  SuggestionGetTriggersOutput as ProtoGetSuggestionTriggersOutput,
  SuggestionTriggers as ProtoSuggestionTriggers,
} from "../gen/channel/app/sdk/v1/extension.js";
import type { Context } from "../types/context.js";
import type { ExtensionDefinition } from "../types/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

const SuggestionUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password
    );
  }, "Suggestion URLs must use HTTP(S) and must not contain user info");

const SuggestionLocaleSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, "Expected a BCP 47 locale");

const SuggestionKeywordSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .refine((value) => !value.includes("*"), "Suggestion keywords do not support wildcards");

export const SuggestionTriggersSchema = z
  .object({
    urls: z.array(SuggestionUrlSchema).max(50),
    keywords: z.record(SuggestionLocaleSchema, z.array(SuggestionKeywordSchema).max(20)),
  })
  .strict();

export type SuggestionTriggers = ProtoBacked<
  z.infer<typeof SuggestionTriggersSchema>,
  ProtoSuggestionTriggers
>;

export const GetSuggestionTriggersInputSchema = z.object({}).strict();
export type GetSuggestionTriggersInput = ProtoBacked<
  z.infer<typeof GetSuggestionTriggersInputSchema>,
  ProtoGetSuggestionTriggersInput
>;

export const GetSuggestionTriggersOutputSchema = z
  .object({ triggers: SuggestionTriggersSchema })
  .strict();
export type GetSuggestionTriggersOutput = ProtoBacked<
  z.infer<typeof GetSuggestionTriggersOutputSchema>,
  ProtoGetSuggestionTriggersOutput
>;

export type SuggestionTriggersProvider =
  SuggestionTriggers | ((ctx: Context) => SuggestionTriggers | Promise<SuggestionTriggers>);

/** Validate and define the static trigger catalog returned by an app. */
export function defineSuggestionTriggers(triggers: SuggestionTriggers): SuggestionTriggers {
  return SuggestionTriggersSchema.parse(triggers);
}

/** Build the suggestion:v1 extension with its single metadata Function. */
export function createSuggestionExtensionV1(
  provider: SuggestionTriggersProvider
): ExtensionDefinition {
  return {
    name: "suggestion",
    systemVersion: "v1",
    groups: {
      metadata: {
        getTriggers: {
          description: "Return URL and locale keyword triggers for contextual app suggestions.",
          input: GetSuggestionTriggersInputSchema,
          output: GetSuggestionTriggersOutputSchema,
          handler: async (ctx) => {
            const triggers = typeof provider === "function" ? await provider(ctx) : provider;
            return { triggers: defineSuggestionTriggers(triggers) };
          },
        },
      },
    },
  };
}
