import type { Context } from "../../types/context.js";
import type {
  GetSuggestionTriggersInput,
  GetSuggestionTriggersOutput,
  SuggestionTriggers,
} from "../suggestion.js";

export type { GetSuggestionTriggersInput, GetSuggestionTriggersOutput, SuggestionTriggers };

/** App implementation contract for suggestion:v1. */
export interface SuggestionExtensionInterface {
  /** Function name: metadata.getTriggers */
  getTriggers(
    ctx: Context,
    params: GetSuggestionTriggersInput
  ): Promise<GetSuggestionTriggersOutput>;
}

export const SuggestionFunctionNames = {
  getTriggers: "metadata.getTriggers",
} as const;
