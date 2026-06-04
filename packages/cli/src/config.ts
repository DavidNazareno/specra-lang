import path from 'node:path'

export const defaultSpecDir = 'specra'
export const defaultGeneratedDir = '.specra'
export const verificationDirName = 'verify'
export const stateDbFileName = 'specra.db'
export const contextFileName = 'ctx.json'
export const planFileName = 'plan.json'
export const proofFileName = 'proof.json'
export const reportFileName = 'report.txt'
export const defaultProjectConfigFiles = [
  'specra.config.jsonc',
  'specra.config.json',
] as const
