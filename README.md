# Specra

Specra is an intent-first language for AI-assisted software development.

Instead of asking an AI to edit large codebases directly, Specra gives humans and agents a compact
source of truth that captures:

- domain entities
- operations
- expectations
- constraints
- target platforms

That source can then be validated, transformed, and generated into real application code.

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

## Commands

```bash
pnpm install
pnpm build
pnpm graph
pnpm lint
pnpm test
pnpm changeset
pnpm specra init
pnpm specra init --template hello-world
pnpm specra install --target codex,claude,opencode --location local
pnpm specra check
pnpm specra context
pnpm specra refresh
pnpm specra snapshot-template
pnpm specra extract-typescript --impl tests/fixtures/typescript-implementation-snapshot.json
pnpm specra trial
```

The compact runtime artifacts now include:

- `.specra/ctx.json`
- `.specra/plan.json`
- `.specra/specra.db`

The `trial` flow also scaffolds verification artifacts:

- `.specra/verify/snap.json`
- `.specra/verify/proof.json`
- `.specra/verify/report.txt`

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

That creates `specra/` as the contract root, with a single `spec.scl.md` in the minimal case and `specra/README.md` for the local workflow. If you choose the `hello-world` template, Specra also adds `specra/features/hello-world.scl.md` so you can see a split contract from day one. `specra init` now guides the user through two choices: whether to start with a clean contract or a hello-world example, and which agents should get local guidance. After that, the CLI defaults to `specra/`, so `pnpm specra check`, `pnpm specra refresh`, and `pnpm specra verify` work without repeating the input path, while generated agent-facing artifacts stay hidden under `.specra/`.

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

If you need to move the contract root or generated workspace, add a project config file such as `specra.config.jsonc`:

```jsonc
{
  "contractRoot": "docs/contracts",
  "generatedDir": ".cache/specra"
}
```

## Current package roles

- `@specra/ast`: syntax-level document types
- `@specra/core`: parser and validator for `.scl.md`, with legacy `.scl` support
- `@specra/ir`: normalized semantic model and verification plan builder
- `@specra/ai-context`: compact context serialization for coding agents
- `@specra/verifier`: compares observed implementation results against expectations
- `@specra/verifier-typescript`: turns a TypeScript implementation snapshot into observed expectation results
- `@specra/cli`: user-facing commands over all the above

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
