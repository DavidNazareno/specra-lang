import path from "node:path";

import {
  contextFileName,
  planFileName,
  proofFileName,
  reportFileName,
  stateDbFileName,
  verificationDirName,
} from "../config.js";

export function resolveContextPath(baseDir: string): string {
  return path.join(baseDir, contextFileName);
}

export function resolvePlanPath(baseDir: string): string {
  return path.join(baseDir, planFileName);
}

export function resolveStateDbPath(baseDir: string): string {
  return path.join(baseDir, stateDbFileName);
}

export function resolveVerificationDir(baseDir: string): string {
  return path.join(baseDir, verificationDirName);
}

export function resolveProofPath(baseDir: string): string {
  return path.join(resolveVerificationDir(baseDir), proofFileName);
}

export function resolveReportPath(baseDir: string): string {
  return path.join(resolveVerificationDir(baseDir), reportFileName);
}
