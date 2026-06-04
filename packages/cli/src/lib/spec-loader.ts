import path from 'node:path'

import type { ScalarValue, SpecraDocument } from '@specra/ast'
import { parseDocument } from '@specra/core'
import { glob } from 'tinyglobby'

import { defaultSpecDir } from '../config.js'
import { fileExists, isDirectory, readTextFile } from './fs.js'

export async function loadDocument(inputPath: string): Promise<SpecraDocument> {
  const resolvedFiles = await resolveSpecFiles(inputPath)
  const parsedDocuments: SpecraDocument[] = []

  for (const filePath of resolvedFiles) {
    const source = await loadSourceWithoutImports(filePath)
    parsedDocuments.push(parseDocument(source))
  }

  return mergeDocuments(parsedDocuments, resolvedFiles.map(toDisplayPath))
}

export async function resolveSpecFiles(inputPath: string): Promise<string[]> {
  if (await isDirectory(inputPath)) {
    const entrypoints = await glob(['*.scl', '*.scl.md'], {
      absolute: false,
      cwd: inputPath,
      onlyFiles: true,
    })

    const resolvedEntrypoints = entrypoints
      .map((filePath) => path.resolve(inputPath, filePath))
      .sort((left, right) => left.localeCompare(right))

    if (resolvedEntrypoints.length === 0) {
      throw new Error(
        `No root .scl or .scl.md files were found under "${inputPath}". Add a root contract file such as "spec.scl.md" or pass one explicitly.`,
      )
    }

    return collectImportedFiles(resolvedEntrypoints)
  }

  if (!(await fileExists(inputPath))) {
    throw new Error(
      `Spec input "${inputPath}" was not found. Run "specra-lang init" first or pass an existing .scl or .scl.md file.`,
    )
  }

  return collectImportedFiles([path.resolve(inputPath)])
}

export function formatSpecLocation(inputPath: string): string {
  return inputPath === defaultSpecDir ? 'specra/' : inputPath
}

function mergeDocuments(
  documents: SpecraDocument[],
  sourceFiles: string[],
): SpecraDocument {
  const merged: SpecraDocument = {
    constraints: {},
    entities: [],
    expectations: [],
    goal: '',
    operations: [],
    service: null,
    target: {},
  }

  for (const [index, document] of documents.entries()) {
    const sourceFile = sourceFiles[index] ?? `document-${index + 1}`

    if (document.service) {
      if (merged.service && merged.service !== document.service) {
        throw new Error(
          `Conflicting service declarations: "${merged.service}" and "${document.service}" in ${sourceFile}.`,
        )
      }

      merged.service = document.service
    }

    if (document.goal) {
      if (merged.goal && merged.goal !== document.goal) {
        throw new Error(
          `Conflicting goal declarations found in ${sourceFile}. Keep one shared goal across the project contract.`,
        )
      }

      merged.goal = document.goal
    }

    merged.entities.push(...document.entities)
    merged.operations.push(...document.operations)
    merged.expectations.push(...document.expectations)
    mergeRecord(
      merged.constraints,
      document.constraints,
      'constraint',
      sourceFile,
    )
    mergeRecord(merged.target, document.target, 'target', sourceFile)
  }

  return merged
}

async function collectImportedFiles(entrypoints: string[]): Promise<string[]> {
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const ordered: string[] = []

  for (const entrypoint of entrypoints) {
    await visitFile(entrypoint, visited, visiting, ordered)
  }

  return ordered
}

async function visitFile(
  filePath: string,
  visited: Set<string>,
  visiting: Set<string>,
  ordered: string[],
): Promise<void> {
  if (visited.has(filePath)) {
    return
  }

  if (visiting.has(filePath)) {
    throw new Error(
      `Circular spec import detected at ${toDisplayPath(filePath)}.`,
    )
  }

  visiting.add(filePath)

  const source = await loadParseableSource(filePath)
  const imports = parseImportPaths(source, filePath)

  for (const importedPath of imports) {
    if (!(await fileExists(importedPath))) {
      throw new Error(
        `Imported spec "${toDisplayPath(importedPath)}" was not found.`,
      )
    }

    await visitFile(importedPath, visited, visiting, ordered)
  }

  visiting.delete(filePath)
  visited.add(filePath)
  ordered.push(filePath)
}

async function loadSourceWithoutImports(filePath: string): Promise<string> {
  const source = await loadParseableSource(filePath)
  return source
    .split(/\r?\n/u)
    .filter((line) => !isImportLine(line))
    .join('\n')
}

async function loadParseableSource(filePath: string): Promise<string> {
  const source = await readTextFile(filePath)
  if (!filePath.endsWith('.md')) {
    return source
  }

  const blocks = extractSpecraBlocks(source)
  if (blocks.length === 0) {
    throw new Error(
      `Markdown spec "${toDisplayPath(filePath)}" does not contain any usable \`\`\`specra fenced blocks. Add a fenced block such as \`\`\`specra ... \`\`\` and keep it properly closed.`,
    )
  }

  return blocks.join('\n\n')
}

function parseImportPaths(source: string, importerPath: string): string[] {
  const imports: string[] = []

  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^\s*import\s+["'](.+)["']\s*$/u)
    if (!match) {
      continue
    }

    const rawPath = match[1]
    if (!rawPath) {
      continue
    }

    imports.push(path.resolve(path.dirname(importerPath), rawPath))
  }

  return imports
}

function isImportLine(line: string): boolean {
  return /^\s*import\s+["'](.+)["']\s*$/u.test(line)
}

function extractSpecraBlocks(source: string): string[] {
  const blocks: string[] = []
  const lines = source.split(/\r?\n/u)
  let currentBlock: string[] | null = null
  let currentStartLine = 0

  for (const [index, line] of lines.entries()) {
    if (currentBlock === null) {
      if (/^```specra\s*$/u.test(line)) {
        currentBlock = []
        currentStartLine = index + 1
      }
      continue
    }

    if (/^```\s*$/u.test(line)) {
      const block = currentBlock.join('\n').trim()
      if (block.length > 0) {
        blocks.push(block)
      }
      currentBlock = null
      currentStartLine = 0
      continue
    }

    currentBlock.push(line)
  }

  if (currentBlock !== null) {
    throw new Error(
      `Found an unclosed \`\`\`specra block starting at line ${currentStartLine}. Close it with a matching \`\`\` line.`,
    )
  }

  return blocks
}

function mergeRecord(
  target: Record<string, ScalarValue>,
  source: Record<string, ScalarValue>,
  label: 'constraint' | 'target',
  sourceFile: string,
): void {
  for (const [key, value] of Object.entries(source)) {
    if (Object.hasOwn(target, key) && target[key] !== value) {
      throw new Error(
        `Conflicting ${label} "${key}" found in ${sourceFile}. Declare shared ${label}s once or keep the value consistent across files.`,
      )
    }

    target[key] = value
  }
}

function toDisplayPath(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath)
  return relativePath.length > 0 && !relativePath.startsWith('..')
    ? relativePath
    : filePath
}
