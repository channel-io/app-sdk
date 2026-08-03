import { z } from "zod";
import { zodToJsonSchema } from "../utils/zod-to-json-schema.js";
import type { FunctionDefinition, FunctionHandler, RegisteredFunction } from "../types/function.js";
import type { Context } from "../types/context.js";

const UserInputKeySchema = z.string().trim().min(1).max(100);
const UserInputTextSchema = z.string().trim().min(1).max(1_000);

export const FunctionUserInputOptionSchema = z.object({
  value: z.string().min(1).max(200),
  label: z.string().trim().min(1).max(200),
  exclusive: z.boolean().optional(),
});

const FunctionUserInputQuestionFields = {
  key: UserInputKeySchema,
  label: UserInputTextSchema,
  prompt: UserInputTextSchema,
  required: z.boolean(),
} as const;

export const FunctionUserInputQuestionSchema = z.discriminatedUnion("inputType", [
  z.object({
    ...FunctionUserInputQuestionFields,
    inputType: z.literal("singleSelect"),
    options: z.array(FunctionUserInputOptionSchema).min(1).max(50),
  }),
  z.object({
    ...FunctionUserInputQuestionFields,
    inputType: z.literal("multiSelect"),
    minSelections: z.number().int().min(0).max(50).optional(),
    maxSelections: z.number().int().min(1).max(50).optional(),
    options: z.array(FunctionUserInputOptionSchema).min(1).max(50),
  }),
  z.object({
    ...FunctionUserInputQuestionFields,
    inputType: z.literal("text"),
    placeholder: z.string().max(500).optional(),
    minLength: z.number().int().nonnegative().max(10_000).optional(),
    maxLength: z.number().int().positive().max(10_000).optional(),
  }),
  z.object({
    ...FunctionUserInputQuestionFields,
    inputType: z.literal("date"),
    min: z.string().date().optional(),
    max: z.string().date().optional(),
  }),
  z.object({
    ...FunctionUserInputQuestionFields,
    inputType: z.literal("number"),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    step: z.number().positive().finite().optional(),
    placeholder: z.string().max(500).optional(),
  }),
]);

export const FunctionUserInputAnswerSchema = z.union([
  z.string(),
  z.number().finite(),
  z.array(z.string()).max(50),
]);

export const FunctionUserInputAnswersSchema = z.record(
  UserInputKeySchema,
  FunctionUserInputAnswerSchema
);

export const NeedsUserInputResultSchema = z
  .object({
    type: z.literal("needsUserInput"),
    requestId: z.string().trim().min(1).max(200),
    questions: z.array(FunctionUserInputQuestionSchema).min(1).max(10),
    continuationToken: z.string().min(1).max(8_192),
    message: z.string().trim().min(1).max(1_000).optional(),
  })
  .superRefine((result, ctx) => {
    const questionKeys = new Set<string>();

    result.questions.forEach((question, questionIndex) => {
      if (questionKeys.has(question.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate question key: ${question.key}`,
          path: ["questions", questionIndex, "key"],
        });
      }
      questionKeys.add(question.key);

      if (question.inputType === "singleSelect" || question.inputType === "multiSelect") {
        const optionValues = new Set<string>();
        question.options.forEach((option, optionIndex) => {
          if (optionValues.has(option.value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate option value: ${option.value}`,
              path: ["questions", questionIndex, "options", optionIndex, "value"],
            });
          }
          optionValues.add(option.value);
        });
      }

      if (
        question.inputType === "multiSelect" &&
        question.minSelections != null &&
        question.maxSelections != null &&
        question.minSelections > question.maxSelections
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minSelections must be less than or equal to maxSelections",
          path: ["questions", questionIndex, "minSelections"],
        });
      }

      if (
        question.inputType === "multiSelect" &&
        ((question.minSelections != null && question.minSelections > question.options.length) ||
          (question.maxSelections != null && question.maxSelections > question.options.length))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "selection bounds must not exceed the number of options",
          path: ["questions", questionIndex, "options"],
        });
      }

      if (
        question.inputType === "text" &&
        question.minLength != null &&
        question.maxLength != null &&
        question.minLength > question.maxLength
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minLength must be less than or equal to maxLength",
          path: ["questions", questionIndex, "minLength"],
        });
      }

      if (
        (question.inputType === "date" || question.inputType === "number") &&
        question.min != null &&
        question.max != null &&
        question.min > question.max
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "min must be less than or equal to max",
          path: ["questions", questionIndex, "min"],
        });
      }
    });
  });

export type FunctionUserInputOption = z.infer<typeof FunctionUserInputOptionSchema>;
export type FunctionUserInputQuestion = z.infer<typeof FunctionUserInputQuestionSchema>;
export type FunctionUserInputAnswer = z.infer<typeof FunctionUserInputAnswerSchema>;
export type FunctionUserInputAnswers = z.infer<typeof FunctionUserInputAnswersSchema>;
export type NeedsUserInputResult = z.infer<typeof NeedsUserInputResultSchema>;

/**
 * Create a registered function from a definition
 * @internal
 */
export function createRegisteredFunction(
  name: string,
  definition: FunctionDefinition
): RegisteredFunction {
  const inputSchema = zodToJsonSchema(definition.input);
  const outputSchema = definition.output ? zodToJsonSchema(definition.output) : undefined;

  // Wrap handler to validate input
  const wrappedHandler: FunctionHandler = async (ctx: Context, params: unknown) => {
    const validatedInput = definition.input.parse(params);
    const result = await definition.handler(ctx, validatedInput);

    if (definition.output) {
      return definition.output.parse(result);
    }

    return result;
  };

  const result: RegisteredFunction = {
    name,
    inputSchema,
    handler: wrappedHandler,
  };

  if (definition.description !== undefined) {
    result.description = definition.description;
  }

  if (outputSchema !== undefined) {
    result.outputSchema = outputSchema;
  }

  return result;
}
