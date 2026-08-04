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
  "datasource",
  "commerce",
  "order",
  "wms",
  "userAuthorization",
  "alfTask",
  "notebook",
] as const;

export type SdkExtensionName = (typeof SDK_EXTENSION_NAMES)[number];
