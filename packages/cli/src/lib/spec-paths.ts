import path from "node:path";

import { defaultSpecDir } from "../config.js";

export function resolveInputFile(
  command: string,
  explicitInput: string | undefined,
): string | null {
  if (explicitInput) {
    return explicitInput;
  }

  if (command === "init") {
    return null;
  }

  return defaultSpecDir;
}

export function resolveOutputDir(
  command: "generate" | "trial" | string,
  inputFile: string,
  explicitOut: string | undefined,
): string {
  if (explicitOut) {
    return explicitOut;
  }

  if (
    inputFile === defaultSpecDir ||
    inputFile === path.join(defaultSpecDir, "app.scl") ||
    inputFile === path.join(defaultSpecDir, "service.scl.md") ||
    inputFile.startsWith(`${defaultSpecDir}${path.sep}`)
  ) {
    return path.join("specra", "generated");
  }

  return command === "trial"
    ? "generated/specra-trial"
    : "generated/specra-app";
}
