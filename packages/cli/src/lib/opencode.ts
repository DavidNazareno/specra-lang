import os from "node:os";
import path from "node:path";

import {
  applyEdits,
  modify,
  parse as parseJsonc,
  type ParseError,
} from "jsonc-parser";

import type { InstallLocation } from "./agent-targets.js";
import {
  ensureDir,
  fileExists,
  readTextFile,
  removeFile,
  writeTextFile,
} from "./fs.js";

const opencodeSchemaUrl = "https://opencode.ai/config.json";
const opencodeAgentFileName = "specra.md";
const formatting = { eol: "\n", insertSpaces: true, tabSize: 2 };

export async function syncOpencodeProjectFiles(
  projectDir: string,
  location: InstallLocation,
): Promise<string[]> {
  const updatedPaths: string[] = [];
  const configPath = await resolveOpencodeConfigPath(projectDir, location);
  const instructionsPath =
    location === "local" ? "specra/README.md" : undefined;
  const configAction = await upsertOpencodeConfig(configPath, instructionsPath);
  if (configAction !== "unchanged") {
    updatedPaths.push(configPath);
  }

  const agentPath = resolveOpencodeAgentPath(projectDir, location);
  const agentAction = await upsertOpencodeAgent(agentPath, location);
  if (agentAction !== "unchanged") {
    updatedPaths.push(agentPath);
  }

  return updatedPaths;
}

export async function removeOpencodeProjectFiles(
  projectDir: string,
  location: InstallLocation,
): Promise<string[]> {
  const updatedPaths: string[] = [];
  const configPath = await resolveOpencodeConfigPath(projectDir, location);
  const instructionsPath =
    location === "local" ? "specra/README.md" : undefined;
  const configAction = await removeOpencodeConfig(configPath, instructionsPath);
  if (configAction !== "unchanged") {
    updatedPaths.push(configPath);
  }

  const agentPath = resolveOpencodeAgentPath(projectDir, location);
  const agentAction = await removeOpencodeAgent(agentPath);
  if (agentAction !== "unchanged") {
    updatedPaths.push(agentPath);
  }

  return updatedPaths;
}

async function resolveOpencodeConfigPath(
  projectDir: string,
  location: InstallLocation,
): Promise<string> {
  const baseDir =
    location === "global"
      ? path.join(os.homedir(), ".config", "opencode")
      : projectDir;
  const jsoncPath = path.join(baseDir, "opencode.jsonc");
  if (await fileExists(jsoncPath)) {
    return jsoncPath;
  }

  const jsonPath = path.join(baseDir, "opencode.json");
  if (await fileExists(jsonPath)) {
    return jsonPath;
  }

  return jsoncPath;
}

function resolveOpencodeAgentPath(
  projectDir: string,
  location: InstallLocation,
): string {
  const baseDir =
    location === "global"
      ? path.join(os.homedir(), ".config", "opencode")
      : projectDir;
  return path.join(baseDir, ".opencode", "agents", opencodeAgentFileName);
}

async function upsertOpencodeConfig(
  configPath: string,
  instructionsPath: string | undefined,
): Promise<"created" | "unchanged" | "updated"> {
  const existed = await fileExists(configPath);
  let text = existed ? await readTextFile(configPath) : "";

  if (!text.trim()) {
    text = '{\n  "$schema": "https://opencode.ai/config.json"\n}\n';
  }

  const parsed = parseConfig(text);
  let updated = text;

  if (parsed.$schema !== opencodeSchemaUrl) {
    const edits = modify(updated, ["$schema"], opencodeSchemaUrl, {
      formattingOptions: formatting,
    });
    updated = applyEdits(updated, edits);
  }

  if (instructionsPath) {
    const currentInstructions = Array.isArray(parsed.instructions)
      ? parsed.instructions.filter((value) => typeof value === "string")
      : [];
    if (!currentInstructions.includes(instructionsPath)) {
      const nextInstructions = [...currentInstructions, instructionsPath];
      const edits = modify(updated, ["instructions"], nextInstructions, {
        formattingOptions: formatting,
      });
      updated = applyEdits(updated, edits);
    }
  }

  if (updated === text) {
    if (!existed && text.trim()) {
      await writeTextFile(configPath, text);
      return "created";
    }

    return "unchanged";
  }

  await writeTextFile(configPath, updated);
  return existed ? "updated" : "created";
}

async function removeOpencodeConfig(
  configPath: string,
  instructionsPath: string | undefined,
): Promise<"removed" | "unchanged" | "updated"> {
  if (!(await fileExists(configPath))) {
    return "unchanged";
  }

  const text = await readTextFile(configPath);
  if (!instructionsPath) {
    return "unchanged";
  }

  const parsed = parseConfig(text);
  const currentInstructions = Array.isArray(parsed.instructions)
    ? parsed.instructions.filter((value) => typeof value === "string")
    : [];
  if (!currentInstructions.includes(instructionsPath)) {
    return "unchanged";
  }

  const nextInstructions = currentInstructions.filter(
    (value) => value !== instructionsPath,
  );
  const edits = modify(
    text,
    ["instructions"],
    nextInstructions.length > 0 ? nextInstructions : undefined,
    {
      formattingOptions: formatting,
    },
  );
  const updated = applyEdits(text, edits);
  await writeTextFile(configPath, updated);
  return "updated";
}

async function upsertOpencodeAgent(
  agentPath: string,
  location: InstallLocation,
): Promise<"created" | "unchanged" | "updated"> {
  const content = renderOpencodeAgent(location);
  const existed = await fileExists(agentPath);
  const current = existed ? await readTextFile(agentPath) : null;

  if (current === content) {
    return "unchanged";
  }

  await ensureDir(path.dirname(agentPath));
  await writeTextFile(agentPath, content);
  return existed ? "updated" : "created";
}

async function removeOpencodeAgent(
  agentPath: string,
): Promise<"removed" | "unchanged"> {
  if (!(await fileExists(agentPath))) {
    return "unchanged";
  }

  await removeFile(agentPath);
  return "removed";
}

function parseConfig(text: string): Record<string, unknown> {
  if (!text.trim()) {
    return {};
  }

  const errors: ParseError[] = [];
  const result = parseJsonc(text, errors, {
    allowTrailingComma: true,
  });
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return {};
  }

  return result as Record<string, unknown>;
}

function renderOpencodeAgent(location: InstallLocation): string {
  const scopeLine =
    location === "global"
      ? "When a repository contains `specra/`, switch to the Specra workflow for that repository."
      : "Use this agent whenever the current project contains `specra/` and the task affects the product contract or its implementation.";

  return `---
description: Specra-guided implementation and verification workflow
mode: all
---

${scopeLine}

Required workflow:
1. Read the relevant \`.scl.md\` contract files under \`specra/\`.
   If you need a quick reference, run \`specra guide\`.
2. Run \`specra check\` after spec changes.
3. Run \`specra refresh\` to refresh agent context.
4. Run \`specra proof\` to scaffold \`.specra/verify/proof.json\`.
5. Use \`.specra/ctx.json\`, \`.specra/plan.json\`, and \`.specra/specra.db\` when they exist.
6. Execute tests or reproduction steps yourself before claiming success.
7. Replace the \`__fill__\` placeholders in \`.specra/verify/proof.json\` with what the tests actually observed.
8. Run \`specra verify\` or \`specra verify --results .specra/verify/proof.json\`.

Operating rules:
- Treat the Specra contract as the source of truth over conflicting implementation details.
- Prefer updating the implementation or the contract explicitly instead of silently diverging.
- If \`specra/\` does not exist yet, suggest running \`specra init\`.
`;
}
