// Extension decorator
export { Extension, EXTENSION_METADATA, type ExtensionOptions } from "./extension.decorator.js";

// SDK extension names
export { SDK_EXTENSION_NAMES, type SdkExtensionName } from "./extension-names.js";

// Function decorator
export {
  Func,
  TestFunc,
  FUNCTION_METADATA,
  FUNCTIONS_METADATA,
  type FunctionOptions,
  type FunctionMetadataValue,
} from "./function.decorator.js";

// Parameter decorators
export {
  Ctx,
  Input,
  Body,
  PARAM_METADATA,
  FunctionParamType,
  type FunctionParamMetadata,
} from "./param.decorator.js";

// Schema decorators
export {
  InputSchema,
  OutputSchema,
  Description,
  INPUT_SCHEMA_METADATA,
  OUTPUT_SCHEMA_METADATA,
  DESCRIPTION_METADATA,
} from "./schema.decorator.js";

// Messaging Function name + schema bundles
export { Messaging } from "./messaging.decorators.js";
