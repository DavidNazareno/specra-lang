import path from "node:path";

export const defaultSpecDir = "specra";
export const defaultGeneratedDir = path.join(".specra", "generated");
export const defaultProjectConfigFiles = [
  "specra.config.jsonc",
  "specra.config.json",
] as const;
