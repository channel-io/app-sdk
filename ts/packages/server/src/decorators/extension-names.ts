export const SDK_EXTENSION_NAMES = [
  "oauth",
  "apikey",
  "config",
  "calendar",
  "messaging",
  "messenger",
  "command",
  "widget",
  "customtab",
  "hook",
  "polling",
  "store",
  "suggestion",
  "datasource",
  "commerce",
  "order",
  "wms",
  "userAuthorization",
  "alfTask",
  "notebook",
] as const;

export type SdkExtensionName = (typeof SDK_EXTENSION_NAMES)[number];
