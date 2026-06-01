# Current Stable Surface

This document describes the parts of Specra that are considered stable enough to build on right now.

## Stable today

- The first public release target and versioning baseline (`0.1.0`)
- The `.scl.md` fenced-block structure and legacy `.scl` compatibility
- `entity`, `operation`, `expectation`, `constraint`, and `target` statements
- Parser and validator behavior for the currently documented syntax
- Normalized semantic model generation
- AI context artifact generation
- Verification plan generation
- Verification of observed results against expectations
- TypeScript implementation snapshot extraction
- Nx-based monorepo workflow
- Changesets-based versioning and changelog workflow

## Stable CLI commands

- `specra init [project-dir]`
- `specra install [--target codex,claude,opencode|all] [--location local|global]`
- `specra uninstall [--target codex,claude,opencode|all] [--location local|global]`
- `specra guide`
- `specra inspect <file.scl.md|file.scl|folder>`
- `specra check <file.scl.md|file.scl|folder>`
- `specra context <file.scl.md|file.scl|folder>`
- `specra refresh <file.scl.md|file.scl|folder> [--out <folder>]`
- `specra trial <file.scl.md|file.scl|folder> [--out <folder>] [--impl <snapshot.json>] [--results <observed-results.json>]`
- `specra snapshot-template <file.scl.md|file.scl|folder>`
- `specra extract-typescript <file.scl.md|file.scl|folder> --impl <snapshot.json>`
- `specra generate <file.scl.md|file.scl|folder> [--out <folder>]`
- `specra verify <file.scl.md|file.scl|folder> [--results <observed-results.json>]`

## Stable generated artifacts

- `specra.json`
- `SUMMARY.md`
- `verification-plan.json`
- `ai-context.json`
- `AI-BRIEF.md`
- `implementation-snapshot.template.json`
- `observed-results.template.json`
- `verification-report.txt`
- `TRIAL.md`

## Stable repository convention

- `specra/` is the default project contract root when no file is passed to the CLI
- `specra.config.jsonc` or `specra.config.json` can override the contract root and generated output directory
- `.scl.md` files can hold human Markdown plus fenced `specra` blocks
- multiple `.scl.md` or legacy `.scl` files can be composed with `import "./relative-file.scl.md"` from root entrypoints in `specra/`
- `.specra/generated/` is the recommended hidden local output folder for generated agent-facing artifacts
- `specra/README.md` documents the app-local workflow after `specra init`
- local agent guidance can be installed into `AGENTS.md` and `CLAUDE.md`

## Not stable yet

- Framework-specific extraction from live codebases
- Automatic AST extraction from arbitrary TypeScript apps
- Richer type system features such as enums or lists
- MCP integration
- Editor integration and language server support

## Compatibility expectation

For now, breaking changes are still possible, but the current `.scl.md` syntax and CLI flow should be treated as the baseline that new work must preserve unless a documented RFC changes it.
