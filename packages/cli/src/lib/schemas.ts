import { z } from 'zod'

import { supportedTargets } from './agents/agent-constants.js'

export const installLocationSchema = z.enum(['global', 'local'])
export const targetSchema = z.enum(supportedTargets)

export function parseDelimitedTargets(raw: string | undefined): string[] {
  if (!raw || raw === 'all') {
    return [...supportedTargets]
  }

  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  if (tokens.length === 0) {
    throw new Error(`Unsupported target "${raw}".`)
  }

  return tokens
}
