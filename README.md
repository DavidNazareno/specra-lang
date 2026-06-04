# Specra

Specra is an intent-first language for AI-assisted software development.

Instead of asking an AI to edit large codebases directly, Specra gives humans and agents a compact
source of truth that captures:

- domain entities
- operations
- expectations
- constraints
- target platforms

That source can then be validated, turned into compact agent-facing artifacts, and checked against observed behavior.

## Status

Specra is in an early experimental phase.

This repository currently includes:

- a TypeScript monorepo
- Nx orchestration for project graph and task running
- a Markdown-first `.scl.md` parser and validator, with legacy `.scl` compatibility
- a normalized semantic model
- compact runtime artifacts for agents
- a basic expectation verifier
- a first TypeScript-oriented implementation snapshot extractor
- a CLI
- a local SQLite state index for compact retrieval

## Documentation

- [Current Stable Surface](docs/current-stable-surface.md)
- [`.scl.md` Language Guide](docs/language-scl.md)
- [Verification Workflow](docs/verification-workflow.md)
- [Versioning And Releases](docs/versioning-and-releases.md)
- [Publishing Checklist](docs/publishing-checklist.md)

## Repository layout

```txt
docs/
examples/
packages/
  ast/
  cli/
  core/
```

## Example

````md
# Booking App

```specra
service: BookingApp
goal: Manage restaurant reservations

entity Reservation:
id: UUID
customerName: string
date: string
partySize: number
status: string
end

operation createReservation:
input: Reservation
output: Reservation
end

expectation createReservation_success:
operation: createReservation
auth: valid
input customerName: "Ana"
input date: "2026-06-01T20:00:00Z"
input partySize: 4
expect outcome: success
expect output.status: "pending"
end

constraint auth_required: true
target runtime: generic
target database: postgres
```
````

## `.scl.md` syntax rules

Top-level statements allowed:

- `service Name` or `service: Name`
- `goal: text`
- `entity Name ... end` or `entity Name: ... end`
- `operation name(InputA, InputB) -> Output` or `operation name: ... end`
- `expectation name ... end` or `expectation name: ... end`
- `constraint key: value`
- `target key: value`

Inside an `entity` block, only field declarations are allowed:

- `fieldName: Type`

Inside an `expectation` block, only these lines are allowed:

- `operation: operationName`
- `auth: valid|missing|optional`
- `input fieldName: value`
- `expect outcome: success|unauthorized|error`
- `expect output.fieldName: value`

Everything else is rejected by the parser.

## Core workflow

```bash
pnpm add -D specra
specra init
specra check
specra refresh
specra proof
specra verify
```

## Additional commands

```bash
pnpm install
pnpm build
pnpm graph
pnpm lint
pnpm test
pnpm changeset
pnpm specra init --template hello-world
pnpm specra install --target codex,claude,opencode --location local
pnpm specra context
pnpm specra snapshot-template
pnpm specra extract-typescript --impl tests/fixtures/typescript-implementation-snapshot.json
pnpm specra trial
```

## Install

For end users, Specra is a single npm package:

```bash
pnpm add -D specra
```

The compact runtime artifacts now include:

- `.specra/ctx.json`
- `.specra/plan.json`
- `.specra/specra.db`

The `trial` flow also scaffolds verification artifacts:

- `.specra/verify/snap.json`
- `.specra/verify/proof.json`
- `.specra/verify/report.txt`

## Current agent support

Specra currently supports:

- OpenCode via `opencode`
- Claude Code via `claude`
- Codex CLI and Codex agents via `codex`

You can install agent guidance locally or globally with `specra install`.

## In a real app repository

The intended setup is to keep Specra inside the same repository as your app.

```txt
my-next-app/
  app/
  components/
  specra/
    spec.scl.md
    README.md
```

Start with:

```bash
pnpm specra init
```

That creates `specra/` as the contract root, with a single `spec.scl.md` in the minimal case and `specra/README.md` for the local workflow. If you choose the `hello-world` template, Specra also adds `specra/features/hello-world.scl.md` so you can see a split contract from day one. `specra init` now guides the user through two choices: whether to start with a clean contract or a hello-world example, and which agents should get local guidance. After that, the CLI defaults to `specra/`, so `pnpm specra check`, `pnpm specra refresh`, `pnpm specra proof`, and `pnpm specra verify` work without repeating the input path, while generated agent-facing artifacts stay hidden under `.specra/`.

If you prefer a non-interactive setup:

```bash
pnpm specra init --yes
pnpm specra init --yes --template hello-world
pnpm specra init --yes --target opencode
```

If you prefer user-wide instructions instead of per-project files:

```bash
pnpm specra install --target codex,claude,opencode --location global
```

Today Specra verifies observed results against the contract. Automatic extraction from live Next.js tests is still a future step, so the current bridge into verification is the hidden `.specra/verify/` workspace or an explicit results file.

The intended loop is:

1. write or update the contract
2. run `specra refresh`
3. run `specra proof`
4. let the agent execute tests
5. let the agent fill `proof.json` with observed values
6. run `specra verify`

If you need to move the contract root or generated workspace, add a project config file such as `specra.config.jsonc`:

```jsonc
{
  "contractRoot": "docs/contracts",
  "generatedDir": ".cache/specra"
}
```

## Package layout

The only package most users should install is `specra`.

The monorepo still contains internal packages for parser, IR, verification, and agent-context concerns so the codebase stays maintainable. Those support packages remain implementation details; the intended install surface is still a single package, `specra`.

## Principles

- intent before implementation
- deterministic generation over prompt-only generation
- framework-neutral core first
- good defaults for open source collaboration
- explicit constraints that AI can reason about

## Community

- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md)
- [Changesets Guide](.changeset/README.md)
