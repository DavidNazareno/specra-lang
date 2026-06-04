import { defaultGeneratedDir } from "../config.js";
import { loadProjectConfig, usesContractRoot } from "./project-config.js";

export async function resolveInputFile(
  command: string,
  explicitInput: string | undefined,
): Promise<string | null> {
  if (explicitInput) {
    return explicitInput;
  }

  if (command === "init") {
    return null;
  }

  const config = await loadProjectConfig();
  return config.contractRoot;
}

export async function resolveOutputDir(
  command: "refresh" | string,
  inputFile: string,
  explicitOut: string | undefined,
): Promise<string> {
  if (explicitOut) {
    return explicitOut;
  }

  const config = await loadProjectConfig();
  if (usesContractRoot(inputFile, config.contractRoot)) {
    return config.generatedDir;
  }

  if (command === "refresh") {
    return defaultGeneratedDir;
  }

  return "generated/specra-app";
}
