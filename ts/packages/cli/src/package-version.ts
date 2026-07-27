import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const manifest = require("../package.json") as { version: string };
const wamUiEntry = require.resolve("@channel.io/app-sdk-wam-ui");
const wamUiManifest = require(join(dirname(wamUiEntry), "../package.json")) as { version: string };

/** Version used by generated server and WAM SDK dependencies. */
export const packageVersion = manifest.version;

/** WAM UI version verified with the generated React starter. */
export const wamUiVersion = wamUiManifest.version;
