# Current Stable Surface

This document describes the parts of Specra that are considered stable enough to build on right now.

## Stable today

- The first public release target and versioning baseline (`0.1.0`)
- The `.scl.md` fenced-block structure and legacy `.scl` compatibility
- `entity`, `operation`, `expectation`, `constraint`, and `target` statements
- Parser and validator behavior for the currently documented syntax
- Normalized semantic model generation
- Compact runtime artifact generation
- Verification plan generation
- Verification of observed results against expectations
- SQLite-backed local state indexing
- Nx-based monorepo workflow
- Changesets-based versioning and changelog workflow

## Stable CLI commands

- `specra init [project-dir] [--template clean|hello-world] [--target codex,claude,opencode] [--yes]`
- `specra install [--target codex,claude,opencode|all] [--location local|global]`
- `specra uninstall [--target codex,claude,opencode|all] [--location local|global]`
- `specra guide`
- `specra inspect <file.scl.md|file.scl|folder>`
- `specra check <file.scl.md|file.scl|folder>`
- `specra refresh <file.scl.md|file.scl|folder> [--out <folder>]`
- `specra proof <file.scl.md|file.scl|folder> [--out <folder>]`
- `specra verify <file.scl.md|file.scl|folder> [--results <proof.json>]`

## Stable generated artifacts

- `.specra/ctx.json`
- `.specra/plan.json`
- `.specra/specra.db`
- `.specra/verify/proof.json`
- `.specra/verify/report.txt`

## Stable repository convention

- `specra/` is the default project contract root when no file is passed to the CLI
- `specra.config.jsonc` or `specra.config.json` can override the contract root and generated output directory
- `.scl.md` files can hold human Markdown plus fenced `specra` blocks
- multiple `.scl.md` or legacy `.scl` files can be composed with `import "./relative-file.scl.md"` from root entrypoints in `specra/`
- `.specra/` is the recommended hidden local output folder for generated state
- `.specra/verify/` is the recommended hidden local output folder for verification inputs and reports
- `specra/README.md` documents the app-local workflow after `specra init`
- local agent guidance can be installed into `AGENTS.md` and `CLAUDE.md`

## Stable agent targets

- `opencode`
- `claude` for Claude Code
- `codex` for Codex CLI and Codex agents

## Compatibility expectation

For now, breaking changes are still possible, but the current `.scl.md` syntax and CLI flow should be treated as the baseline that new work must preserve unless a documented RFC changes it.
