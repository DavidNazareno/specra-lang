import path from "node:path";

import type {
  CliOptions,
  InitProjectMetadata,
  InitTemplate,
} from "../types.js";
import {
  ensureDir,
  fileExists,
  isRecord,
  readJsonFile,
  writeTextFile,
} from "../lib/fs.js";
import { detectInstalledAgents } from "../lib/agent-detection.js";
import { createInitFiles } from "../lib/init-files.js";
import { toSpecraIdentifier } from "../lib/identifiers.js";
import { resolveInitOptions } from "./init-interactive.js";
import { installAgentInstructions } from "./install.js";

export async function initializeSpecraProject(
  targetDir: string,
  options: CliOptions,
): Promise<void> {
  const specraDir = path.join(targetDir, "specra");
  const detectedAgents = await detectInstalledAgents();
  const resolvedOptions = await resolveInitOptions(options, detectedAgents);
  const metadata = await detectInitProjectMetadata(targetDir, resolvedOptions);
  const template = (resolvedOptions.template ?? "clean") as InitTemplate;
  const files = createInitFiles(metadata, template);

  await ensureDir(specraDir);

  const conflictingFiles = [];
  for (const file of files) {
    const outputPath = path.join(targetDir, file.path);
    if (!resolvedOptions.force && (await fileExists(outputPath))) {
      conflictingFiles.push(file.path);
    }
  }

  if (conflictingFiles.length > 0) {
    throw new Error(
      `Refusing to overwrite existing files: ${conflictingFiles.join(", ")}. Re-run with --force to replace them.`,
    );
  }

  for (const file of files) {
    const outputPath = path.join(targetDir, file.path);
    await writeTextFile(outputPath, file.content);
  }

  console.log(`Initialized Specra in ${specraDir}`);
  console.log(`- Project contract root: ${path.join("specra")}`);
  console.log(`- Root contract: ${path.join("specra", "spec.scl.md")}`);
  if (template === "hello-world") {
    console.log(
      `- Example feature contract: ${path.join(
        "specra",
        "features",
        "hello-world.scl.md",
      )}`,
    );
  }
  console.log(`- Project guide: ${path.join("specra", "README.md")}`);
  console.log(`- Hidden agent artifacts live under ${path.join(".specra")}`);

  if (resolvedOptions.target) {
    await installAgentInstructions(targetDir, {
      location: "local",
      target: resolvedOptions.target,
      yes: true,
    });
  } else if (detectedAgents.length > 0) {
    console.log(
      "- Agent guidance was not installed. Run `specra install --target codex,claude,opencode` when you want local agent guidance.",
    );
  } else {
    console.log(
      "- No supported agents were detected on this machine. Run `specra install --target codex,claude,opencode` when you want local agent guidance.",
    );
  }

  console.log(`- Next step: pnpm specra refresh`);
}

async function detectInitProjectMetadata(
  targetDir: string,
  options: CliOptions,
): Promise<InitProjectMetadata> {
  const packageJsonPath = path.join(targetDir, "package.json");
  let packageJson: Record<string, unknown> | null = null;

  try {
    packageJson = await readJsonFile<Record<string, unknown>>(packageJsonPath);
  } catch {
    packageJson = null;
  }

  const dependencies = {
    ...(isRecord(packageJson?.dependencies) ? packageJson.dependencies : {}),
    ...(isRecord(packageJson?.devDependencies)
      ? packageJson.devDependencies
      : {}),
  };
  const packageName =
    typeof packageJson?.name === "string" ? packageJson.name : null;
  const displayName = packageName ?? path.basename(path.resolve(targetDir));
  const runtime =
    options.runtime ??
    (Object.hasOwn(dependencies, "next") ? "nextjs" : "generic");
  const database = options.database ?? "unknown";
  const serviceName = toSpecraIdentifier(options.name ?? displayName);

  return {
    database,
    displayName,
    runtime,
    serviceName,
  };
}
