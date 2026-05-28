#!/usr/bin/env node
import { Command } from "commander";

import { defaultSpecDir } from "./config.js";
import { initializeSpecraProject } from "./commands/init.js";
import {
  installAgentInstructions,
  uninstallAgentInstructions,
} from "./commands/install.js";
import {
  checkSpec,
  extractTypeScriptResults,
  generateArtifacts,
  inspectSpec,
  printSnapshotTemplate,
  renderContext,
  runTrial,
  verifySpec,
} from "./commands/spec.js";
import { fileExists } from "./lib/fs.js";
import { resolveInputFile } from "./lib/spec-paths.js";
import type { CliOptions } from "./types.js";

const program = new Command();

program
  .name("specra")
  .description(
    "Intent-first specification and verification CLI for AI-assisted development",
  );

program
  .command("init")
  .argument("[project-dir]")
  .option("--name <serviceName>")
  .option("--runtime <runtime>")
  .option("--database <database>")
  .option("--force")
  .action(async (projectDir: string | undefined, ...args: unknown[]) => {
    const command = getCommandFromActionArgs(args);
    const options = command.opts<CliOptions>();
    await initializeSpecraProject(projectDir ?? process.cwd(), options);
  });

program
  .command("install")
  .option("--target <targets>")
  .option("--location <location>")
  .option("--print-config <target>")
  .option("--yes")
  .action(async (...args: unknown[]) => {
    const command = getCommandFromActionArgs(args);
    const options = command.opts<CliOptions>();
    await installAgentInstructions(process.cwd(), options);
  });

program
  .command("uninstall")
  .option("--target <targets>")
  .option("--location <location>")
  .action(async (...args: unknown[]) => {
    const command = getCommandFromActionArgs(args);
    const options = command.opts<CliOptions>();
    await uninstallAgentInstructions(process.cwd(), options);
  });

program
  .command("inspect")
  .argument("[file]")
  .action(async (inputFile: string | undefined) => {
    await inspectSpec(await resolveRequiredInputFile("inspect", inputFile));
  });

program
  .command("check")
  .argument("[file]")
  .action(async (inputFile: string | undefined) => {
    process.exitCode = await checkSpec(
      await resolveRequiredInputFile("check", inputFile),
    );
  });

program
  .command("context")
  .argument("[file]")
  .action(async (inputFile: string | undefined) => {
    process.exitCode = await renderContext(
      await resolveRequiredInputFile("context", inputFile),
    );
  });

program
  .command("trial")
  .argument("[file]")
  .option("--out <directory>")
  .option("--impl <snapshotPath>")
  .option("--results <resultsPath>")
  .action(async (inputFile: string | undefined, ...args: unknown[]) => {
    const command = getCommandFromActionArgs(args);
    const options = command.opts<CliOptions>();
    process.exitCode = await runTrial(
      await resolveRequiredInputFile("trial", inputFile),
      options,
    );
  });

program
  .command("snapshot-template")
  .argument("[file]")
  .action(async (inputFile: string | undefined) => {
    process.exitCode = await printSnapshotTemplate(
      await resolveRequiredInputFile("snapshot-template", inputFile),
    );
  });

program
  .command("extract-typescript")
  .argument("[file]")
  .option("--impl <snapshotPath>")
  .action(async (inputFile: string | undefined, ...args: unknown[]) => {
    const command = getCommandFromActionArgs(args);
    const options = command.opts<CliOptions>();
    process.exitCode = await extractTypeScriptResults(
      await resolveRequiredInputFile("extract-typescript", inputFile),
      options,
    );
  });

program
  .command("generate")
  .argument("[file]")
  .option("--out <directory>")
  .action(async (inputFile: string | undefined, ...args: unknown[]) => {
    const command = getCommandFromActionArgs(args);
    const options = command.opts<CliOptions>();
    process.exitCode = await generateArtifacts(
      await resolveRequiredInputFile("generate", inputFile),
      options,
    );
  });

program
  .command("verify")
  .argument("[file]")
  .option("--results <resultsPath>")
  .action(async (inputFile: string | undefined, ...args: unknown[]) => {
    const command = getCommandFromActionArgs(args);
    const options = command.opts<CliOptions>();
    process.exitCode = await verifySpec(
      await resolveRequiredInputFile("verify", inputFile),
      options,
    );
  });

void program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown CLI error.");
  }
  process.exitCode = 1;
});

async function resolveRequiredInputFile(
  command: string,
  explicitInput: string | undefined,
): Promise<string> {
  const inputFile = resolveInputFile(command, explicitInput);
  if (!inputFile) {
    throw new Error(`Command "${command}" requires a spec file.`);
  }

  if (!explicitInput && !(await fileExists(inputFile))) {
    throw new Error(
      `No spec input was provided and "${defaultSpecDir}/" was not found. Run "specra init" first or pass a .scl.md file, legacy .scl file, or folder explicitly.`,
    );
  }

  return inputFile;
}

function getCommandFromActionArgs(args: unknown[]): Command {
  const command = args.at(-1);
  if (command instanceof Command) {
    return command;
  }

  throw new Error("Unable to read commander action context.");
}
