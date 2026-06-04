import path from 'node:path'

import { type ParseError, parse, printParseErrorCode } from 'jsonc-parser'
import { z } from 'zod'

import {
  defaultGeneratedDir,
  defaultProjectConfigFiles,
  defaultSpecDir,
} from '../config.js'
import { fileExists, readTextFile } from './fs.js'

const projectConfigSchema = z.object({
  contractRoot: z.string().trim().min(1).optional(),
  generatedDir: z.string().trim().min(1).optional(),
})

export interface ResolvedProjectConfig {
  contractRoot: string
  generatedDir: string
  sourcePath: string | null
}

export async function loadProjectConfig(
  cwd: string = process.cwd(),
): Promise<ResolvedProjectConfig> {
  for (const candidate of defaultProjectConfigFiles) {
    const candidatePath = path.join(cwd, candidate)
    if (!(await fileExists(candidatePath))) {
      continue
    }

    const rawText = await readTextFile(candidatePath)
    const parseErrors: ParseError[] = []
    const parsed = parse(rawText, parseErrors)
    if (parseErrors.length > 0) {
      const firstError = parseErrors[0]
      const errorCode = firstError
        ? printParseErrorCode(firstError.error)
        : 'Unknown'
      const errorOffset = firstError?.offset ?? 0
      throw new Error(
        `Failed to parse "${candidate}": ${errorCode} at offset ${errorOffset}.`,
      )
    }

    const result = projectConfigSchema.safeParse(parsed)
    if (!result.success) {
      const issue = result.error.issues[0]
      throw new Error(
        `Invalid "${candidate}" config${issue?.path.length ? ` at ${issue.path.join('.')}` : ''}: ${issue?.message ?? 'unknown error'}.`,
      )
    }

    return {
      contractRoot: normalizeRelativeProjectPath(
        result.data.contractRoot ?? defaultSpecDir,
      ),
      generatedDir: normalizeRelativeProjectPath(
        result.data.generatedDir ?? defaultGeneratedDir,
      ),
      sourcePath: candidatePath,
    }
  }

  return {
    contractRoot: defaultSpecDir,
    generatedDir: defaultGeneratedDir,
    sourcePath: null,
  }
}

export function usesContractRoot(
  inputPath: string,
  contractRoot: string,
  cwd: string = process.cwd(),
): boolean {
  const normalizedInput = path.normalize(inputPath)
  const normalizedRoot = path.normalize(contractRoot)

  if (normalizedInput === normalizedRoot) {
    return true
  }

  const resolvedInput = path.resolve(cwd, normalizedInput)
  const resolvedRoot = path.resolve(cwd, normalizedRoot)
  const relative = path.relative(resolvedRoot, resolvedInput)

  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

function normalizeRelativeProjectPath(value: string): string {
  return path.normalize(value)
}
