import path from 'node:path'

import type { CliOptions } from '../types.js'
import {
  parseInstallLocation,
  parseSingleTarget,
  parseTargets,
  resolveTargetFilePath,
} from '../lib/agents/agent-targets.js'
import { renderManagedInstructionBlock } from '../lib/agents/agent-templates.js'
import {
  ensureDir,
  fileExists,
  readTextFile,
  removeFile,
  writeTextFile,
} from '../lib/fs.js'
import {
  removeOpencodeProjectFiles,
  syncOpencodeProjectFiles,
} from '../lib/opencode.js'
import {
  removeManagedBlock,
  upsertManagedBlock,
} from '../lib/managed-blocks.js'
import { resolveInstallOptions } from './install-interactive.js'

export async function installAgentInstructions(
  projectDir: string,
  options: CliOptions,
): Promise<void> {
  if (options.printConfig) {
    const target = parseSingleTarget(options.printConfig)
    console.log(renderManagedInstructionBlock(target))
    return
  }

  const resolvedOptions = await resolveInstallOptions(options)
  const location = parseInstallLocation(resolvedOptions.location)
  const targets = parseTargets(resolvedOptions.target)

  const results = []
  for (const target of targets) {
    if (target === 'opencode') {
      const extraPaths = await syncOpencodeProjectFiles(projectDir, location)
      for (const extraPath of extraPaths) {
        results.push(path.relative(projectDir, extraPath) || extraPath)
      }
      continue
    }

    const filePath = resolveTargetFilePath(target, location, projectDir)
    const content = renderManagedInstructionBlock(target)
    const current = (await fileExists(filePath))
      ? await readTextFile(filePath)
      : ''
    const next = upsertManagedBlock(current, content)

    await ensureDir(path.dirname(filePath))
    await writeTextFile(filePath, next)
    results.push(path.relative(projectDir, filePath) || path.basename(filePath))
  }

  console.log(
    `Installed Specra agent guidance for ${targets.join(', ')} in ${location} mode.`,
  )
  for (const result of results) {
    console.log(`- Updated ${result}`)
  }
  console.log(
    '- Agents should now prefer the .scl.md files under specra/, plus specra refresh, specra proof, and specra verify.',
  )
}

export async function uninstallAgentInstructions(
  projectDir: string,
  options: CliOptions,
): Promise<void> {
  const location = parseInstallLocation(options.location)
  const targets = parseTargets(options.target)
  const removed: string[] = []

  for (const target of targets) {
    if (target === 'opencode') {
      const extraPaths = await removeOpencodeProjectFiles(projectDir, location)
      for (const extraPath of extraPaths) {
        removed.push(path.relative(projectDir, extraPath) || extraPath)
      }
      continue
    }

    const filePath = resolveTargetFilePath(target, location, projectDir)
    if (!(await fileExists(filePath))) {
      continue
    }

    const current = await readTextFile(filePath)
    const next = removeManagedBlock(current)

    if (next === current) {
      continue
    }

    if (next.trim().length === 0) {
      await removeFile(filePath)
    } else {
      await writeTextFile(filePath, next)
    }

    removed.push(path.relative(projectDir, filePath) || path.basename(filePath))
  }

  console.log(
    `Removed Specra agent guidance for ${targets.join(', ')} in ${location} mode.`,
  )
  if (removed.length === 0) {
    console.log('- No managed Specra blocks were present.')
    return
  }
  for (const result of removed) {
    console.log(`- Updated ${result}`)
  }
}
