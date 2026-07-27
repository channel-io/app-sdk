#!/usr/bin/env node
import { Command } from "commander";
import { createCommand } from "./commands/create.js";
import { addCommand } from "./commands/add.js";
import { devCommand } from "./commands/dev.js";
import { buildCommand } from "./commands/build.js";
import { generateCommand } from "./commands/generate.js";
import { packageVersion } from "./package-version.js";

const program = new Command();

program.name("channel-app").description("CLI for Channel.io App SDK").version(packageVersion);

// Register commands
program.addCommand(createCommand);
program.addCommand(addCommand);
program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(generateCommand);

program.parse();
