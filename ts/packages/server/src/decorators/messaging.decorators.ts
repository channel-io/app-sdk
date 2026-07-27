import {
  InboxGetCustomEditorWamInputSchema,
  InboxGetCustomEditorWamOutputSchema,
  InboxGetMediumMessageErrorReasonInputSchema,
  InboxGetMediumMessageErrorReasonOutputSchema,
  InboxGetMediumTopicSelectorWamInputSchema,
  InboxGetMediumTopicSelectorWamOutputSchema,
  InboxGetWritingTypesInputSchema,
  InboxGetWritingTypesOutputSchema,
  InboxOnMediumUserChatClosedInputSchema,
  InboxOnMediumUserChatClosedOutputSchema,
  MessagingFunctionNames,
  OnMediumMessageCreatedInputSchema,
  OnMediumMessageCreatedOutputSchema,
  PrebuiltBuildMediumTopicsInputSchema,
  PrebuiltBuildMediumTopicsOutputSchema,
  PrebuiltGetCustomEditorWamInputSchema,
  PrebuiltGetCustomEditorWamOutputSchema,
  PrebuiltGetDefaultOptionsInputSchema,
  PrebuiltGetDefaultOptionsOutputSchema,
  PrebuiltGetMediumTopicBuilderSelectorWamInputSchema,
  PrebuiltGetMediumTopicBuilderSelectorWamOutputSchema,
  PrebuiltGetWritingTypesInputSchema,
  PrebuiltGetWritingTypesOutputSchema,
  PrebuiltValidateEntityInputSchema,
  PrebuiltValidateEntityOutputSchema,
} from "@channel.io/app-sdk-core";
import type { z } from "zod";
import { Func } from "./function.decorator.js";
import { Ctx, Input } from "./param.decorator.js";
import { InputSchema, OutputSchema } from "./schema.decorator.js";

function messagingFunction(name: string, input: z.ZodSchema, output: z.ZodSchema): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Func(name)(target, propertyKey, descriptor);
    InputSchema(input)(target, propertyKey, descriptor);
    OutputSchema(output)(target, propertyKey, descriptor);
    Ctx()(target, propertyKey, 0);
    Input()(target, propertyKey, 1);
  };
}

/** Function decorators for a class declared with `@Extension("messaging")`. */
export const Messaging = {
  inbox: {
    onMediumMessageCreated: () =>
      messagingFunction(
        MessagingFunctionNames.inbox.onMediumMessageCreated,
        OnMediumMessageCreatedInputSchema,
        OnMediumMessageCreatedOutputSchema
      ),
    onMediumUserChatClosed: () =>
      messagingFunction(
        MessagingFunctionNames.inbox.onMediumUserChatClosed,
        InboxOnMediumUserChatClosedInputSchema,
        InboxOnMediumUserChatClosedOutputSchema
      ),
    getWritingTypes: () =>
      messagingFunction(
        MessagingFunctionNames.inbox.getWritingTypes,
        InboxGetWritingTypesInputSchema,
        InboxGetWritingTypesOutputSchema
      ),
    getCustomEditorWam: () =>
      messagingFunction(
        MessagingFunctionNames.inbox.getCustomEditorWam,
        InboxGetCustomEditorWamInputSchema,
        InboxGetCustomEditorWamOutputSchema
      ),
    getMediumTopicSelectorWam: () =>
      messagingFunction(
        MessagingFunctionNames.inbox.getMediumTopicSelectorWam,
        InboxGetMediumTopicSelectorWamInputSchema,
        InboxGetMediumTopicSelectorWamOutputSchema
      ),
    getMediumMessageErrorReason: () =>
      messagingFunction(
        MessagingFunctionNames.inbox.getMediumMessageErrorReason,
        InboxGetMediumMessageErrorReasonInputSchema,
        InboxGetMediumMessageErrorReasonOutputSchema
      ),
  },
  prebuilt: {
    getWritingTypes: () =>
      messagingFunction(
        MessagingFunctionNames.prebuilt.getWritingTypes,
        PrebuiltGetWritingTypesInputSchema,
        PrebuiltGetWritingTypesOutputSchema
      ),
    validateEntity: () =>
      messagingFunction(
        MessagingFunctionNames.prebuilt.validateEntity,
        PrebuiltValidateEntityInputSchema,
        PrebuiltValidateEntityOutputSchema
      ),
    getCustomEditorWam: () =>
      messagingFunction(
        MessagingFunctionNames.prebuilt.getCustomEditorWam,
        PrebuiltGetCustomEditorWamInputSchema,
        PrebuiltGetCustomEditorWamOutputSchema
      ),
    getMediumTopicBuilderSelectorWam: () =>
      messagingFunction(
        MessagingFunctionNames.prebuilt.getMediumTopicBuilderSelectorWam,
        PrebuiltGetMediumTopicBuilderSelectorWamInputSchema,
        PrebuiltGetMediumTopicBuilderSelectorWamOutputSchema
      ),
    buildMediumTopics: () =>
      messagingFunction(
        MessagingFunctionNames.prebuilt.buildMediumTopics,
        PrebuiltBuildMediumTopicsInputSchema,
        PrebuiltBuildMediumTopicsOutputSchema
      ),
    getDefaultOptions: () =>
      messagingFunction(
        MessagingFunctionNames.prebuilt.getDefaultOptions,
        PrebuiltGetDefaultOptionsInputSchema,
        PrebuiltGetDefaultOptionsOutputSchema
      ),
  },
} as const;
