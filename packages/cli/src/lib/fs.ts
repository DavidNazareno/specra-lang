import fs from "fs-extra";

export async function fileExists(targetPath: string): Promise<boolean> {
  return fs.pathExists(targetPath);
}

export async function isDirectory(targetPath: string): Promise<boolean> {
  if (!(await fs.pathExists(targetPath))) {
    return false;
  }

  const stats = await fs.stat(targetPath);
  return stats.isDirectory();
}

export async function ensureDir(targetPath: string): Promise<void> {
  await fs.ensureDir(targetPath);
}

export async function readTextFile(targetPath: string): Promise<string> {
  return fs.readFile(targetPath, "utf8");
}

export async function writeTextFile(
  targetPath: string,
  content: string,
): Promise<void> {
  await fs.outputFile(targetPath, content, "utf8");
}

export async function removeFile(targetPath: string): Promise<void> {
  await fs.remove(targetPath);
}

export async function readJsonFile<T>(targetPath: string): Promise<T> {
  return fs.readJson(targetPath) as Promise<T>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
