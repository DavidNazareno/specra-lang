import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(__dirname, '..')

const packages = [
  {
    name: '@specra-lang/ast',
    dir: path.join(workspaceRoot, 'packages/ast'),
  },
  {
    name: '@specra-lang/core',
    dir: path.join(workspaceRoot, 'packages/core'),
  },
  {
    name: '@specra-lang/ir',
    dir: path.join(workspaceRoot, 'packages/ir'),
  },
  {
    name: '@specra-lang/verifier',
    dir: path.join(workspaceRoot, 'packages/verifier'),
  },
  {
    name: 'specra-lang',
    dir: path.join(workspaceRoot, 'packages/cli'),
  },
]

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'specra-publish-smoke-'))
const tarballDir = path.join(tempRoot, 'tarballs')
const consumerDir = path.join(tempRoot, 'consumer')

await mkdir(tarballDir, { recursive: true })
await mkdir(consumerDir, { recursive: true })

try {
  const tarballs = {}

  for (const pkg of packages) {
    tarballs[pkg.name] = await packPackage(pkg.dir, tarballDir)
  }

  await writeConsumerPackageJson(consumerDir, tarballs)
  run('pnpm', ['add', '--offline', '-D', tarballs['specra-lang']], consumerDir)
  run('pnpm', ['exec', 'specra-lang', 'guide'], consumerDir)
  run(
    'pnpm',
    ['exec', 'specra-lang', 'init', '--yes', '--template', 'clean'],
    consumerDir,
  )
  run('pnpm', ['exec', 'specra-lang', 'check'], consumerDir)

  const cliPackageJson = JSON.parse(
    await readFile(
      path.join(consumerDir, 'node_modules/specra-lang/package.json'),
      'utf8',
    ),
  )

  assert.equal(cliPackageJson.name, 'specra-lang')
  console.log(`Smoke publish check passed in ${consumerDir}`)
} finally {
  await rm(tempRoot, { recursive: true, force: true })
}

async function packPackage(packageDir, tarballDir) {
  const before = new Set(await listTarballs(tarballDir))
  run('pnpm', ['pack', '--pack-destination', tarballDir], packageDir)
  const after = await listTarballs(tarballDir)
  const created = after.filter((entry) => !before.has(entry))

  assert.equal(
    created.length,
    1,
    `Expected exactly one tarball for ${packageDir}, received ${created.length}.`,
  )

  return path.join(tarballDir, created[0])
}

async function listTarballs(tarballDir) {
  const entries = await readdir(tarballDir)
  return entries.filter((entry) => entry.endsWith('.tgz')).sort()
}

async function writeConsumerPackageJson(consumerDir, tarballs) {
  const packageJson = {
    name: 'specra-publish-smoke',
    private: true,
    type: 'module',
    packageManager: 'pnpm@10.33.0',
    pnpm: {
      overrides: {
        '@clack/prompts': '1.4.0',
        '@specra-lang/ast': tarballs['@specra-lang/ast'],
        '@specra-lang/core': tarballs['@specra-lang/core'],
        '@specra-lang/ir': tarballs['@specra-lang/ir'],
        '@specra-lang/verifier': tarballs['@specra-lang/verifier'],
        commander: '14.0.3',
        'fs-extra': '11.3.5',
        'jsonc-parser': '3.3.1',
        tinyglobby: '0.2.16',
        zod: '4.4.3',
      },
    },
  }

  await writeFile(
    path.join(consumerDir, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf8',
  )
}

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
  })
}
