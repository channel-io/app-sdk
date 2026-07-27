import { Command } from "commander";
import pc from "picocolors";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { packageVersion, wamUiVersion } from "../package-version.js";

const BEZIER_VERSION = "4.0.0-next.14";

interface CreateAppOptions {
  cwd?: string;
  sdkVersion?: string;
}

export const createCommand = new Command("create")
  .description("Create a secure TypeScript Channel.io app starter")
  .argument("<name>", "Directory and package name for the app")
  .action(async (name: string) => {
    console.log(pc.cyan(`\nCreating Channel.io app: ${pc.bold(name)}\n`));

    try {
      const targetDir = await createApp(name);
      console.log(pc.green(`\n✓ Created ${basename(targetDir)} successfully!\n`));
      console.log("Next steps:\n");
      console.log(`  cd ${name}`);
      console.log("  corepack pnpm install");
      console.log("  cp apps/server/.env.example apps/server/.env");
      console.log("  corepack pnpm build");
      console.log("  corepack pnpm dev\n");
    } catch (error) {
      console.error(pc.red(`\nError creating app: ${String(error)}`));
      process.exitCode = 1;
    }
  });

/** Create the same starter used by the CLI. Exported for smoke tests and integrations. */
export async function createApp(name: string, options: CreateAppOptions = {}): Promise<string> {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error("App name must use lowercase letters, numbers, dots, underscores, or hyphens");
  }

  const targetDir = resolve(options.cwd ?? process.cwd(), name);
  const sdkVersion = options.sdkVersion ?? packageVersion;
  await mkdir(targetDir);

  const directories = ["apps/server/src", "apps/wam/src", "packages/shared/src"];
  await Promise.all(
    directories.map((directory) => mkdir(join(targetDir, directory), { recursive: true }))
  );

  const files: Record<string, string> = {
    "package.json": json({
      name,
      version: "0.0.1",
      private: true,
      packageManager: "pnpm@9.15.4",
      engines: { node: ">=20.11.0" },
      scripts: {
        build: "turbo run build",
        dev: "turbo run dev",
        typecheck: "turbo run typecheck",
      },
      devDependencies: {
        turbo: "^2.10.5",
        typescript: "^5.7.2",
      },
    }),
    "pnpm-workspace.yaml": `packages:\n  - "apps/*"\n  - "packages/*"\n`,
    "turbo.json": json({
      $schema: "https://turbo.build/schema.json",
      tasks: {
        build: { dependsOn: ["^build"], outputs: ["dist/**"] },
        dev: { dependsOn: ["^build"], cache: false, persistent: true },
        typecheck: { dependsOn: ["^build"], outputs: [] },
      },
    }),
    ".gitignore": "node_modules\ndist\n.env\n*.log\n",
    "README.md": starterReadme(name),
    "apps/server/.env.example": `APP_ID=your-app-id\nAPP_SECRET=your-app-secret\nSIGNING_KEY=your-64-character-hex-signing-key\nPORT=3000\n`,
    "apps/server/package.json": json({
      name: `@${name}/server`,
      version: "0.0.1",
      private: true,
      type: "module",
      scripts: {
        build: "nest build",
        dev: "nest start --watch",
        start: "node dist/main.js",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@channel.io/app-sdk-server": sdkVersion,
        [`@${name}/shared`]: "workspace:*",
        "@nestjs/common": "^11.1.28",
        "@nestjs/core": "^11.1.28",
        "@nestjs/platform-express": "^11.1.28",
        dotenv: "^17.2.3",
        "reflect-metadata": "^0.2.2",
        rxjs: "^7.8.2",
        zod: "^3.25.76",
      },
      devDependencies: {
        "@nestjs/cli": "^11.0.23",
        "@types/node": "^22.18.6",
        typescript: "^5.9.3",
      },
    }),
    "apps/server/nest-cli.json": json({
      $schema: "https://json.schemastore.org/nest-cli",
      collection: "@nestjs/schematics",
      sourceRoot: "src",
      compilerOptions: { builder: "tsc" },
    }),
    "apps/server/tsconfig.json": json({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
      include: ["src/**/*.ts"],
      exclude: ["node_modules"],
    }),
    "apps/server/src/config.ts": serverConfig(),
    "apps/server/src/app.module.ts": serverModule(),
    "apps/server/src/main.ts": serverMain(),
    "apps/server/src/command.extension.ts": commandExtension(name),
    "packages/shared/package.json": json({
      name: `@${name}/shared`,
      version: "0.0.1",
      private: true,
      type: "module",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } },
      scripts: { build: "tsc", typecheck: "tsc --noEmit" },
      dependencies: { zod: "^3.25.76" },
      devDependencies: { typescript: "^5.9.3" },
    }),
    "packages/shared/tsconfig.json": json({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        declaration: true,
        skipLibCheck: true,
      },
      include: ["src/**/*.ts"],
      exclude: ["dist", "node_modules"],
    }),
    "packages/shared/src/index.ts": sharedContract(),
    "apps/wam/package.json": json({
      name: `@${name}/wam`,
      version: "0.0.1",
      private: true,
      type: "module",
      scripts: {
        build: "tsc && vite build",
        dev: "vite",
        typecheck: "tsc --noEmit",
        preview: "vite preview",
      },
      dependencies: {
        "@channel.io/app-sdk-wam": sdkVersion,
        "@channel.io/app-sdk-wam-ui": wamUiVersion,
        "@channel.io/bezier-icons": "0.60.0",
        "@channel.io/bezier-react": BEZIER_VERSION,
        [`@${name}/shared`]: "workspace:*",
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "styled-components": "^6.4.3",
      },
      devDependencies: {
        "@types/react": "^18.3.18",
        "@types/react-dom": "^18.3.5",
        "@vitejs/plugin-react": "^4.3.4",
        typescript: "^5.9.3",
        vite: "^6.0.7",
      },
    }),
    "apps/wam/tsconfig.json": json({
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
      },
      include: ["src"],
    }),
    "apps/wam/vite.config.ts": `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  base: "",\n  plugins: [react()],\n  build: { outDir: "dist" },\n});\n`,
    "apps/wam/index.html": `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${name}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
    "apps/wam/src/main.tsx": wamMain(),
    "apps/wam/src/App.tsx": wamApp(name),
  };

  await Promise.all(
    Object.entries(files).map(([path, content]) => writeFile(join(targetDir, path), content))
  );
  return targetDir;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function serverConfig(): string {
  return `import "dotenv/config";\nimport type { ChannelAppModuleOptions } from "@channel.io/app-sdk-server";\n\nfunction required(name: string): string {\n  const value = process.env[name]?.trim();\n  if (!value) throw new Error(\`\${name} is required\`);\n  return value;\n}\n\nexport const appId = required("APP_ID");\nexport const channelAppOptions: ChannelAppModuleOptions = {\n  appId,\n  appSecret: required("APP_SECRET"),\n  signingKey: required("SIGNING_KEY"),\n  autoRegister: true,\n};\n`;
}

function serverModule(): string {
  return `import { Module } from "@nestjs/common";\nimport { APP_GUARD } from "@nestjs/core";\nimport { ChannelAppModule, SignatureGuard } from "@channel.io/app-sdk-server";\nimport { channelAppOptions } from "./config.js";\nimport { CommandExtension, HelloFunctions } from "./command.extension.js";\n\n@Module({\n  imports: [ChannelAppModule.forRoot(channelAppOptions)],\n  providers: [CommandExtension, HelloFunctions, { provide: APP_GUARD, useClass: SignatureGuard }],\n})\nexport class AppModule {}\n`;
}

function serverMain(): string {
  return `import "reflect-metadata";\nimport { existsSync } from "node:fs";\nimport { resolve } from "node:path";\nimport { NestFactory } from "@nestjs/core";\nimport type { NestExpressApplication } from "@nestjs/platform-express";\nimport { AppModule } from "./app.module.js";\n\nasync function bootstrap() {\n  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });\n  app.enableShutdownHooks();\n  app.use((request: { method: string; url: string }, _response: unknown, next: () => void) => {\n    const [path, query] = request.url.split("?", 2);\n    if (request.method === "PUT" && path === "/functions") {\n      request.url = "/functions/v1" + (query ? "?" + query : "");\n    }\n    next();\n  });\n\n  const wamDist = resolve(process.cwd(), "../wam/dist");\n  if (existsSync(wamDist)) {\n    app.useStaticAssets(wamDist, { prefix: "/resource/wam/hello" });\n  }\n\n  const port = Number(process.env.PORT ?? 3000);\n  await app.listen(port);\n}\n\nvoid bootstrap();\n`;
}

function commandExtension(name: string): string {
  return `import { Injectable } from "@nestjs/common";\nimport { z } from "zod";\nimport { HELLO_FUNCTION, HELLO_WAM_NAME, CommandActionInputSchema } from "@${name}/shared";\nimport {\n  CommandResultSchema,\n  Extension,\n  Func,\n  GetCommandsOutputSchema,\n  Input,\n  InputSchema,\n  OutputSchema,\n} from "@channel.io/app-sdk-server";\nimport { appId } from "./config.js";\n\n@Extension({ name: "command", systemVersion: "v1" })\nexport class CommandExtension {\n  @Func("metadata.getCommands")\n  @InputSchema(z.object({}))\n  @OutputSchema(GetCommandsOutputSchema)\n  getCommands(): z.infer<typeof GetCommandsOutputSchema> {\n    return { commands: [{\n      name: "hello",\n      scope: "desk",\n      description: "Open the starter WAM",\n      actionFunctionName: HELLO_FUNCTION,\n      alfMode: "disable",\n      enabledByDefault: true,\n    }] };\n  }\n}\n\n@Injectable()\nexport class HelloFunctions {\n  @Func(HELLO_FUNCTION)\n  @InputSchema(CommandActionInputSchema)\n  @OutputSchema(CommandResultSchema)\n  open(@Input() input: z.infer<typeof CommandActionInputSchema>): z.infer<typeof CommandResultSchema> {\n    return {\n      type: "wam",\n      attributes: {\n        appId,\n        name: HELLO_WAM_NAME,\n        wamArgs: { message: \`Hello from ${name}!\`, language: input.language ?? "en" },\n      },\n    };\n  }\n}\n`;
}

function sharedContract(): string {
  return `import { z } from "zod";\n\nexport const HELLO_FUNCTION = "hello.open";\nexport const HELLO_WAM_NAME = "hello";\n\nexport const CommandActionInputSchema = z.object({\n  chat: z.object({ type: z.string(), id: z.string() }).optional(),\n  trigger: z.object({ type: z.string(), attributes: z.record(z.string()).nullish() }).optional(),\n  input: z.record(z.unknown()).nullish().transform((value) => value ?? {}),\n  language: z.string().optional(),\n});\n\nexport const HelloWamDataSchema = z.object({\n  appId: z.string(),\n  channelId: z.string(),\n  message: z.string(),\n  language: z.string(),\n});\n`;
}

function wamMain(): string {
  return `import ReactDOM from "react-dom/client";\nimport { WamProvider } from "@channel.io/app-sdk-wam";\nimport App from "./App";\nimport "@channel.io/bezier-react/styles.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <WamProvider><App /></WamProvider>\n);\n`;
}

function wamApp(name: string): string {
  return `import { Button, Text, VStack } from "@channel.io/bezier-react/beta";\nimport { useTypedWamData, useWamClose } from "@channel.io/app-sdk-wam";\nimport { HeightSynchronizer, WamHeader, WamThemeProvider } from "@channel.io/app-sdk-wam-ui";\nimport { HelloWamDataSchema } from "@${name}/shared";\n\nexport default function App() {\n  const { close } = useWamClose();\n  const parsed = HelloWamDataSchema.safeParse({\n    appId: useTypedWamData("appId"),\n    channelId: useTypedWamData("channelId"),\n    message: useTypedWamData("message"),\n    language: useTypedWamData("language"),\n  });\n\n  return (\n    <WamThemeProvider>\n      <HeightSynchronizer maxHeight={480}>\n        <WamHeader title="Hello" onClose={close} />\n        <VStack spacing={16} style={{ padding: "0 24px 24px" }}>\n          <Text>{parsed.success ? parsed.data.message : "WAM data is unavailable."}</Text>\n          <Button label="Close" variant="filled" semantic="primary" onClick={close} />\n        </VStack>\n      </HeightSynchronizer>\n    </WamThemeProvider>\n  );\n}\n`;
}

function starterReadme(name: string): string {
  return `# ${name}\n\nA TypeScript Channel.io app starter generated by \`@channel.io/app-sdk\`. It includes a secure NestJS Function server, a command Extension, a shared Zod contract, and a React WAM using the WAM SDK and WAM UI package.\n\n## Run\n\n\`\`\`sh\ncorepack pnpm install\ncp apps/server/.env.example apps/server/.env\ncorepack pnpm build\ncorepack pnpm dev\n\`\`\`\n\nConfigure the public Function Endpoint as \`https://YOUR_HOST/functions\` and WAM Endpoint as \`https://YOUR_HOST/resource/wam\`. Keep App Secret and Signing Key server-side.\n\nStart with the [SDK Quickstart](https://github.com/channel-io/app-sdk/blob/main/docs/guides/en/quickstart.md), then use the [TypeScript reference](https://github.com/channel-io/app-sdk/blob/main/docs/reference/typescript/README.md). For a complete runnable app, see the [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts).\n`;
}
