import path from "node:path";

import os from "node:os";

import type { SupportedTarget } from "./agent-targets.js";
import { fileExists } from "../fs.js";

export async function detectInstalledAgents(): Promise<SupportedTarget[]> {
  const candidates: Array<{ path: string; target: SupportedTarget }> = [
    {
      path: path.join(os.homedir(), ".codex"),
      target: "codex",
    },
    {
      path: path.join(os.homedir(), ".claude"),
      target: "claude",
    },
    {
      path: path.join(os.homedir(), ".config", "opencode"),
      target: "opencode",
    },
  ];

  const detected: SupportedTarget[] = [];
  for (const candidate of candidates) {
    if (await fileExists(candidate.path)) {
      detected.push(candidate.target);
    }
  }

  return detected;
}
