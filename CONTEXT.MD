Summary

Specra is a contract-first layer for AI-assisted software delivery. It is not trying to compile full applications from specs. The current product direction is simpler: keep a small contract next to the app, generate compact agent-facing state, let the agent run tests and collect evidence, and verify that evidence against expectations.

Current product shape

- Source contract lives in `specra/*.scl.md`
- Generated hidden state lives in `.specra/`
- The user-facing npm package is `specra`
- The intended workflow is:
  1. `specra init`
  2. `specra check`
  3. `specra refresh`
  4. `specra proof`
  5. agent runs tests
  6. agent fills `proof.json`
  7. `specra verify`

Current internal packages

- `@specra/ast`: document types
- `@specra/core`: parser and validator
- `@specra/ir`: normalized semantic model and verification plan
- `@specra/verifier`: compares observed results against expectations
- `specra`: user-facing CLI package

Current CLI surface

- `specra guide`
- `specra init [project-dir]`
- `specra install`
- `specra uninstall`
- `specra inspect <file.scl.md|file.scl|folder>`
- `specra check <file.scl.md|file.scl|folder>`
- `specra refresh <file.scl.md|file.scl|folder>`
- `specra proof <file.scl.md|file.scl|folder>`
- `specra verify <file.scl.md|file.scl|folder> [--results <proof.json>]`

Current generated state

- `.specra/ctx.json`
- `.specra/plan.json`
- `.specra/specra.db`
- `.specra/verify/proof.json`
- `.specra/verify/report.txt`

Current verification model

1. `.scl.md` defines intent and expectations
2. `specra refresh` derives compact runtime state
3. `specra proof` scaffolds the evidence file
4. the coding agent runs tests and writes observed values into `proof.json`
5. `specra verify` checks that proof against the contract

Important constraints

- Specra does not validate arbitrary code directly
- Specra verifies observed evidence, not implementation internals
- The current bridge from tests into verification is the proof file the agent fills

Repository status

- TypeScript monorepo with pnpm + Nx + Biome
- Docs site with VitePress
- GitHub Actions for CI, docs, and versioning
- Single public install surface: `specra`

Short product framing

Specra should feel like the lightest useful way to do contract-driven AI coding:

- write a small contract
- give the agent compact state
- force the agent to produce evidence
- verify that evidence
