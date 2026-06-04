import os from "node:os";
import path from "node:path";

import type { supportedTargets } from "./agent-constants.js";
import {
  installLocationSchema,
  parseDelimitedTargets,
  targetSchema,
} from "../schemas.js";

export const managedBlockStart = "<!-- SPECRA:START -->";
export const managedBlockEnd = "<!-- SPECRA:END -->";

export type SupportedTarget = (typeof supportedTargets)[number];
export type InstallLocation = "global" | "local";

export interface AgentTargetDefinition {
  description: string;
  globalPath: string;
  id: SupportedTarget;
  localPath: string;
  title: string;
}

export function parseInstallLocation(raw: string | undefined): InstallLocation {
  return installLocationSchema.parse(raw ?? "local");
}

export function parseTargets(raw: string | undefined): SupportedTarget[] {
  return parseDelimitedTargets(raw).map(parseSingleTarget);
}

export function parseSingleTarget(raw: string): SupportedTarget {
  return targetSchema.parse(raw);
}

export function getTargetDefinition(
  target: SupportedTarget,
): AgentTargetDefinition {
  if (target === "codex") {
    return {
      description: "OpenAI Codex CLI and Codex agents",
      id: target,
      title: "Codex",
      localPath: "AGENTS.md",
      globalPath: path.join(os.homedir(), ".codex", "AGENTS.md"),
    };
  }

  if (target === "opencode") {
    return {
      description: "OpenCode agent configuration",
      id: target,
      title: "OpenCode",
      localPath: "AGENTS.md",
      globalPath: path.join(os.homedir(), ".config", "opencode", "AGENTS.md"),
    };
  }

  return {
    description: "Claude Code project or user instructions",
    id: target,
    title: "Claude Code",
    localPath: "CLAUDE.md",
    globalPath: path.join(os.homedir(), ".claude", "CLAUDE.md"),
  };
}

export function resolveTargetFilePath(
  target: SupportedTarget,
  location: InstallLocation,
  projectDir: string,
): string {
  const definition = getTargetDefinition(target);
  return location === "global"
    ? definition.globalPath
    : path.join(projectDir, definition.localPath);
}
