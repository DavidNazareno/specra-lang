import path from "node:path";

import type { CliOptions, InitProjectMetadata } from "../types.js";
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
import { installAgentInstructions } from "./install.js";

export async function initializeSpecraProject(
  targetDir: string,
  options: CliOptions,
): Promise<void> {
  const specraDir = path.join(targetDir, "specra");
  const metadata = await detectInitProjectMetadata(targetDir, options);
  const files = createInitFiles(metadata);

  await ensureDir(specraDir);

  const conflictingFiles = [];
  for (const file of files) {
    const outputPath = path.join(targetDir, file.path);
    if (!options.force && (await fileExists(outputPath))) {
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

  const detectedAgents = await detectInstalledAgents();

  console.log(`Initialized Specra in ${specraDir}`);
  console.log(`- Project contract root: ${path.join("specra")}`);
  console.log(
    `- Shared service contract: ${path.join("specra", "service.scl.md")}`,
  );
  console.log(
    `- First feature contract: ${path.join("specra", "features", "work-items.scl.md")}`,
  );
  console.log(`- Project guide: ${path.join("specra", "README.md")}`);
  console.log(`- Hidden agent artifacts live under ${path.join(".specra")}`);

  if (detectedAgents.length > 0) {
    await installAgentInstructions(targetDir, {
      location: "local",
      target: detectedAgents.join(","),
      yes: true,
    });
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
