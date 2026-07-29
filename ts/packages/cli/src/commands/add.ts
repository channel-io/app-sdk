import { Command } from "commander";
import pc from "picocolors";
import * as fs from "node:fs";
import * as path from "node:path";
import prompts from "prompts";

const EXTENSION_TEMPLATES: Record<string, string> = {
  oauth: `import {
  Ctx,
  Extension,
  Func,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import {
  CredentialValidationInputSchema,
  CredentialValidationResultSchema,
  OAuthConfigSchema,
  type Context,
  type CredentialValidationInput,
  type CredentialValidationResult,
  type OAuthConfig,
  type OAuthExtensionInterface,
} from "@channel.io/app-sdk-core";

@Extension({ name: "oauth" })
export class MyOAuthExtension implements OAuthExtensionInterface {
  @Func("metadata.getAuthConfig")
  @OutputSchema(OAuthConfigSchema)
  async getAuthConfig(@Ctx() _ctx: Context): Promise<OAuthConfig> {
    return {
      authType: "oauth",
      authScope: "channel",
      oauthProvider: {
        provider: "provider",
        authorizationUrl: "https://provider.com/oauth/authorize",
        tokenUrl: "https://provider.com/oauth/token",
        scopes: ["read", "write"],
        providerName: "My Provider",
      },
    };
  }

  @Func("validation.validateCredentials")
  @InputSchema(CredentialValidationInputSchema)
  @OutputSchema(CredentialValidationResultSchema)
  async validateCredentials(
    @Ctx() ctx: Context,
    @Input() params: CredentialValidationInput
  ): Promise<CredentialValidationResult> {
    const accessToken = ctx.authToken ?? params.accessToken;
    // TODO: Call the provider API to validate the access token.
    return { valid: Boolean(accessToken) };
  }
}
`,
  apikey: `import { Extension, Func, OutputSchema } from "@channel.io/app-sdk-server";
import {
  GetAuthConfigOutputSchema,
  ValidateCredentialsOutputSchema,
  type GetAuthConfigOutput,
  type ValidateCredentialsOutput,
  type ApiKeyExtensionInterface,
} from "@channel.io/app-sdk-core";
import type { Context } from "@channel.io/app-sdk-core";

@Extension({ name: "apikey" })
export class MyApiKeyExtension implements ApiKeyExtensionInterface {
  @Func("metadata.getAuthConfig")
  @OutputSchema(GetAuthConfigOutputSchema)
  async getAuthConfig(_ctx: Context): Promise<GetAuthConfigOutput> {
    return {
      authType: "apiKey",
      authScope: "channel",
      providerName: "My Provider",
      fields: [
        {
          name: "apiKey",
          displayName: "API Key",
          required: true,
          sensitive: true,
          placeholder: "Enter your API key",
        },
      ],
    };
  }

  @Func("validation.validateCredentials")
  @OutputSchema(ValidateCredentialsOutputSchema)
  async validateCredentials(ctx: Context): Promise<ValidateCredentialsOutput> {
    const { apiKey } = ctx.apiCredentials ?? {};
    // TODO: Validate the API key
    return { valid: !!apiKey };
  }
}
`,
  calendar: `import { createCalendarExtensionV1 } from "@channel.io/app-sdk-core";

export const calendarExtension = createCalendarExtensionV1({
  listEventTypes: async (ctx, params) => {
    // TODO: Fetch event types from your calendar provider
    return {
      eventTypes: [
        { id: "1", name: "30 Minute Meeting", duration: 30 },
        { id: "2", name: "60 Minute Meeting", duration: 60 },
      ],
    };
  },
  getAvailability: async (ctx, params) => {
    // TODO: Fetch available slots from your calendar provider
    return { slots: [] };
  },
  createBooking: async (ctx, params) => {
    // TODO: Create booking with your calendar provider
    throw new Error("Not implemented");
  },
});
`,
  command: `import { createCommandExtensionV1 } from "@channel.io/app-sdk-core";

export const commandExtension = createCommandExtensionV1({
  execute: async (ctx, params) => {
    const [subcommand, ...args] = params.args;

    switch (subcommand) {
      case "help":
        return {
          type: "text",
          attributes: { message: "Available commands: help, search <query>" },
        };
      case "search":
        return {
          type: "wam",
          attributes: {
            appId: process.env.APP_ID,
            name: "search-results",
            wamArgs: { query: args.join(" ") },
          },
        };
      default:
        return { type: "text", attributes: { message: "Unknown command" } };
    }
  },
  getSuggestions: async (ctx, params) => ({
    suggestions: [
      { value: "help", label: "Help", description: "Show help message" },
      { value: "search", label: "Search", description: "Search for items" },
    ],
  }),
});
`,
  widget: `import {
  createExtension,
  defineFunction,
  GetWidgetsOutputSchema,
  WidgetActionResultSchema,
} from "@channel.io/app-sdk";
import { z } from "zod";

const WidgetActionInput = z.object({
  chat: z.object({
    type: z.string(),
    id: z.string(),
  }),
  language: z.string(),
});

export const widgetExtension = createExtension({
  name: "widget",
  systemVersion: "v1",
  groups: {
    metadata: {
      getWidgets: defineFunction({
        description: "Return widget definitions for AppStore registration",
        input: z.object({}),
        output: GetWidgetsOutputSchema,
        handler: async () => ({
          widgets: [
            {
              name: "my_widget",
              scope: "desk",
              widgetType: "wam",
              actionFunctionName: "extension.widget.widgets.open",
              defaultName: "My Widget",
            },
          ],
        }),
      }),
    },
    widgets: {
      open: defineFunction({
        description: "Handle widget open action",
        input: WidgetActionInput,
        output: WidgetActionResultSchema,
        handler: async (_ctx, params) => ({
          type: "wam",
          attributes: {
            appId: process.env.APP_ID,
            name: "my-widget",
            wamArgs: {
              chatId: params.chat.id,
            },
          },
        }),
      }),
    },
  },
});
`,
  customtab: `import {
  createExtension,
  defineFunction,
  GetCustomTabsOutputSchema,
  CustomTabActionResultSchema,
} from "@channel.io/app-sdk";
import { z } from "zod";

const CustomTabActionInput = z.object({
  language: z.string(),
  wamArgs: z.unknown().optional(),
});

export const customTabExtension = createExtension({
  name: "customtab",
  systemVersion: "v1",
  groups: {
    metadata: {
      getCustomTabs: defineFunction({
        description: "Return custom tab definitions for AppStore registration",
        input: z.object({}),
        output: GetCustomTabsOutputSchema,
        handler: async () => ({
          customTabs: [
            {
              name: "my_tab",
              actionFunctionName: "extension.customtab.tabs.open",
              nameI18nMap: {
                ko: { name: "내 탭" },
                ja: { name: "マイタブ" },
              },
            },
          ],
        }),
      }),
    },
    tabs: {
      open: defineFunction({
        description: "Open the custom tab content",
        input: CustomTabActionInput,
        output: CustomTabActionResultSchema,
        handler: async (_ctx, params) => ({
          type: "wam",
          attributes: {
            appId: process.env.APP_ID,
            name: "my-tab-content",
            wamArgs: params.wamArgs ?? {},
          },
        }),
      }),
    },
  },
});
`,
  hook: `import { createExtension, defineFunction, GetHooksOutputSchema } from "@channel.io/app-sdk";
import { z } from "zod";

const HookEventInput = z.object({}).passthrough();
const HookEventOutput = z.object({}).passthrough();

export const hookExtension = createExtension({
  name: "hook",
  systemVersion: "v1",
  groups: {
    metadata: {
      getHooks: defineFunction({
        description: "Return hook definitions for AppStore registration",
        input: z.object({}),
        output: GetHooksOutputSchema,
        handler: async () => ({
          hooks: [
            {
              type: "app.installed",
              actionFunctionName: "extension.hook.lifecycle.onAppInstalled",
            },
            {
              type: "widget.installed",
              targetId: "my_widget",
              actionFunctionName: "extension.hook.lifecycle.onWidgetInstalled",
            },
            // Public webhook example (use a stable 32-128 character CSPRNG token):
            // {
            //   type: "webhook.received",
            //   targetId: "provider.events",
            //   actionFunctionName: "extension.hook.webhook.onReceived",
            //   webhook: { endpointToken: process.env.WEBHOOK_ENDPOINT_TOKEN! },
            // },
          ],
        }),
      }),
    },
    lifecycle: {
      onAppInstalled: defineFunction({
        description: "Handle app installation events",
        input: HookEventInput,
        output: HookEventOutput,
        handler: async (_ctx, params) => {
          console.log("App installed hook fired", params);
          return {};
        },
      }),
      onWidgetInstalled: defineFunction({
        description: "Handle widget installation events",
        input: HookEventInput,
        output: HookEventOutput,
        handler: async (_ctx, params) => {
          console.log("Widget installed hook fired", params);
          return {};
        },
      }),
    },
  },
});
`,
  polling: `import {
  createExtension,
  defineFunction,
  GetPollersOutputSchema,
  GetPollingTargetChannelsInputSchema,
  GetPollingTargetChannelsOutputSchema,
} from "@channel.io/app-sdk";
import { z } from "zod";

const PollingFunctionOutput = z.object({}).passthrough();

export const pollingExtension = createExtension({
  name: "polling",
  systemVersion: "v1",
  groups: {
    metadata: {
      getPollers: defineFunction({
        description: "Return polling handler definitions for AppStore registration",
        input: z.object({}),
        output: GetPollersOutputSchema,
        handler: async () => ({
          pollers: [
            {
              functionName: "extension.polling.poller.pollQnAs",
              intervalSeconds: 900,
              timeoutSeconds: 30,
              maxConcurrency: 5,
              rps: 1,
              executionScope: "channel",
            },
          ],
        }),
      }),
    },
    target: {
      getChannels: defineFunction({
        description: "Return the next target channel page for a polling handler",
        input: GetPollingTargetChannelsInputSchema,
        output: GetPollingTargetChannelsOutputSchema,
        handler: async (_ctx, params) => {
          console.log("Resolving polling target channels", params);
          return {
            channelIds: [],
          };
        },
      }),
    },
    poller: {
      pollQnAs: defineFunction({
        description: "Poll a channel for new Q&A updates",
        input: z.object({}),
        output: PollingFunctionOutput,
        handler: async (ctx) => {
          console.log(\`Polling Q&As for channel \${ctx.channel.id}\`);
          return {};
        },
      }),
    },
  },
});
`,
  store: `import { createStoreExtension } from "@channel.io/app-sdk-server";

const localizedContent = {
  images: [],
  intro: {
    helpsWith: "Explain the customer work this app helps with.",
    recommendedFor: "Explain which teams get the most value from this app.",
  },
  faqs: [],
};

export const storeExtension = createStoreExtension({
  relatedAppIds: [],
  i18nMap: {
    ko: localizedContent,
    ja: localizedContent,
    en: localizedContent,
  },
});
`,
  alftask: `import { createAlfTaskExtensionV1 } from "@channel.io/app-sdk-core";

export const alfTaskExtension = createAlfTaskExtensionV1({
  getAlfTasks: async (ctx) => ({
    predefinedTasks: [
      {
        version: "v1.0.0",
        name: "Auto Reply",
        trigger: "user_message",
        memorySchema: [
          { name: "userMessage", type: "string" },
          { name: "reply", type: "string" },
        ],
        nodes: [
          {
            id: "analyze",
            type: "function",
            config: { function: "analyzeMessage" },
            next: "reply",
          },
          {
            id: "reply",
            type: "send_message",
            config: { message: "{{memory.reply}}" },
          },
        ],
        startNodeId: "analyze",
      },
    ],
  }),
});
`,
  notebook: `import { createNotebookExtensionV1 } from "@channel.io/app-sdk-core";

export const notebookExtension = createNotebookExtensionV1({
  getNotebooks: async (ctx) => ({
    notebooks: [
      {
        notebookKey: "sales-dashboard",
        version: 1,
        title: "Sales Dashboard",
        description: "App-managed notebook synced from the app server.",
        initialVisibility: "visible",
        notebook: {
          cells: [
            {
              cellKey: "intro",
              type: "markdown",
              definition: {
                markdown: "# Sales Dashboard\\nReview app-managed sales signals.",
              },
            },
            {
              cellKey: "orders",
              type: "sql",
              definition: {
                query: "select * from orders limit 100",
              },
            },
          ],
        },
      },
    ],
  }),
});
`,
};

const EXTENSION_TYPES = Object.keys(EXTENSION_TEMPLATES);

export const addCommand = new Command()
  .command("add")
  .description("Add extension or function to the project")
  .argument("<type>", `Type to add: extension, function`)
  .argument("[name]", "Name of the extension or function")
  .action(async (type: string, name?: string) => {
    if (type === "extension") {
      await addExtension(name);
    } else if (type === "function") {
      await addFunction(name);
    } else {
      console.log(pc.red(`Unknown type: ${type}. Use 'extension' or 'function'`));
      process.exit(1);
    }
  });

async function addExtension(name?: string) {
  // Find extensions directory
  const extensionsDir = findExtensionsDir();
  if (!extensionsDir) {
    console.log(
      pc.red("Could not find extensions directory. Make sure you're in a Channel.io app project.")
    );
    process.exit(1);
  }

  // Prompt for extension type if not provided
  if (!name || !EXTENSION_TYPES.includes(name)) {
    const response = await prompts({
      type: "select",
      name: "extensionType",
      message: "Select extension type to add:",
      choices: EXTENSION_TYPES.map((t) => ({ title: t, value: t })),
    });

    if (!response.extensionType) {
      console.log(pc.yellow("Cancelled"));
      return;
    }
    name = response.extensionType;
  }

  if (!name) {
    console.log(pc.red("Extension name is required"));
    process.exit(1);
  }

  const template = EXTENSION_TEMPLATES[name];
  if (!template) {
    console.log(pc.red(`Unknown extension type: ${name}`));
    console.log(pc.dim(`Available types: ${EXTENSION_TYPES.join(", ")}`));
    process.exit(1);
  }

  const fileName = `${name}.extension.ts`;
  const filePath = path.join(extensionsDir, fileName);

  if (fs.existsSync(filePath)) {
    const response = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `${fileName} already exists. Overwrite?`,
      initial: false,
    });

    if (!response.overwrite) {
      console.log(pc.yellow("Cancelled"));
      return;
    }
  }

  fs.writeFileSync(filePath, template);
  console.log(pc.green(`Created ${fileName}`));
  console.log(pc.dim(`Don't forget to register the extension in your app module!`));
}

async function addFunction(name?: string) {
  // Find extensions directory
  const extensionsDir = findExtensionsDir();
  if (!extensionsDir) {
    console.log(pc.red("Could not find extensions directory."));
    process.exit(1);
  }

  // List existing extensions
  const files = fs.readdirSync(extensionsDir).filter((f) => f.endsWith(".extension.ts"));

  if (files.length === 0) {
    console.log(
      pc.red("No extensions found. Add an extension first with: channel-app add extension")
    );
    process.exit(1);
  }

  // Prompt for extension to add function to
  const response = await prompts([
    {
      type: "select",
      name: "extension",
      message: "Select extension to add function to:",
      choices: files.map((f) => ({
        title: f.replace(".extension.ts", ""),
        value: f,
      })),
    },
    {
      type: "text",
      name: "functionName",
      message: "Function name:",
      initial: name,
      validate: (v) => (v ? true : "Function name is required"),
    },
    {
      type: "text",
      name: "groupName",
      message: "Function group name:",
      initial: "default",
    },
  ]);

  if (!response.extension || !response.functionName) {
    console.log(pc.yellow("Cancelled"));
    return;
  }

  console.log(pc.yellow("Function scaffolding is not fully implemented yet."));
  console.log(
    pc.dim(
      `Please manually add the function '${response.functionName as string}' to group '${response.groupName as string}' in ${response.extension as string}`
    )
  );
}

function findExtensionsDir(): string | null {
  const possiblePaths = [
    "src/extensions",
    "apps/server/src/extensions",
    "server/src/extensions",
    "extensions",
  ];

  for (const p of possiblePaths) {
    const fullPath = path.join(process.cwd(), p);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Try to create default path
  const defaultPath = path.join(process.cwd(), "src/extensions");
  if (fs.existsSync(path.dirname(defaultPath))) {
    fs.mkdirSync(defaultPath, { recursive: true });
    return defaultPath;
  }

  return null;
}
