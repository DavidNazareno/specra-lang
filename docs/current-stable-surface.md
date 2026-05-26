# Current Stable Surface

This document describes the parts of Specra that are considered stable enough to build on right now.

## Stable today

- The first public release target and versioning baseline (`0.1.0`)
- The `.scl` top-level structure
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

- `specra inspect <file.scl>`
- `specra check <file.scl>`
- `specra context <file.scl>`
- `specra snapshot-template <file.scl>`
- `specra extract-typescript <file.scl> --impl <snapshot.json>`
- `specra generate <file.scl> --out <folder>`
- `specra verify <file.scl> --results <observed-results.json>`

## Stable generated artifacts

- `specra.json`
- `SUMMARY.md`
- `verification-plan.json`
- `ai-context.json`
- `AI-BRIEF.md`

## Not stable yet

- Framework-specific extraction from live codebases
- Automatic AST extraction from arbitrary TypeScript apps
- Richer type system features such as enums or lists
- MCP integration
- Editor integration and language server support

## Compatibility expectation

For now, breaking changes are still possible, but the current `.scl` syntax and CLI flow should be treated as the baseline that new work must preserve unless a documented RFC changes it.
