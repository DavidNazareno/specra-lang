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
pnpm add -D specra-lang
specra-lang init
specra-lang check
specra-lang refresh
specra-lang proof
specra-lang verify
```

Package name: `specra-lang`
CLI command: `specra-lang`

## Additional commands

For contributors working inside this repository:

```bash
pnpm install
pnpm build
pnpm graph
pnpm lint
pnpm test
pnpm changeset
pnpm specra-lang init --template hello-world
pnpm specra-lang install --target codex,claude,opencode --location local
```

## Install

For end users, Specra is a single npm package named `specra-lang`, and it exposes the CLI command `specra-lang`.

Install it in a project:

```bash
pnpm add -D specra-lang
```

Run it once without installing:

```bash
pnpm dlx specra-lang init
# or
npx specra-lang init
```

After installation, use the CLI as:

```bash
specra-lang init
specra-lang check
specra-lang refresh
specra-lang proof
specra-lang verify
```

The compact runtime artifacts now include:

- `.specra/ctx.json`
- `.specra/plan.json`
- `.specra/specra.db`
- `.specra/verify/proof.json`
- `.specra/verify/report.txt`

## Current agent support

Specra currently supports:

- OpenCode via `opencode`
- Claude Code via `claude`
- Codex CLI and Codex agents via `codex`

You can install agent guidance locally or globally with `specra-lang install`.

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

Start with one of these:

```bash
pnpm dlx specra-lang init
# or, after installing specra-lang in the project:
specra-lang init
```

That creates `specra/` as the contract root, with a single `spec.scl.md` in the minimal case and `specra/README.md` for the local workflow. If you choose the `hello-world` template, Specra also adds `specra/features/hello-world.scl.md` so you can see a split contract from day one. `specra-lang init` now guides the user through two choices: whether to start with a clean contract or a hello-world example, and which agents should get local guidance. After that, the CLI defaults to `specra/`, so `specra-lang check`, `specra-lang refresh`, `specra-lang proof`, and `specra-lang verify` work without repeating the input path, while generated agent-facing artifacts stay hidden under `.specra/`.

If you prefer a non-interactive setup:

```bash
pnpm dlx specra-lang init --yes
pnpm dlx specra-lang init --yes --template hello-world
pnpm dlx specra-lang init --yes --target opencode
```

If you already installed `specra-lang`, the same commands can be run as:

```bash
specra-lang init --yes
specra-lang init --yes --template hello-world
specra-lang init --yes --target opencode
```

If you prefer user-wide instructions instead of per-project files:

```bash
specra-lang install --target codex,claude,opencode --location global
```

Today Specra verifies observed results against the contract. Automatic extraction from live Next.js tests is still a future step, so the current bridge into verification is the hidden `.specra/verify/` workspace or an explicit results file that an agent fills from test execution.

The intended loop is:

1. write or update the contract
2. run `specra-lang refresh`
3. run `specra-lang proof`
4. let the agent execute tests
5. let the agent fill `proof.json` with observed values
6. run `specra-lang verify`

If you need to move the contract root or generated workspace, add a project config file such as `specra.config.jsonc`:

```jsonc
{
  "contractRoot": "docs/contracts",
  "generatedDir": ".cache/specra"
}
```

## Package layout

The only package most users should install is `specra-lang`.

The monorepo still contains internal packages for parser, IR, and verification concerns so the codebase stays maintainable. Those support packages remain implementation details; the intended install surface is still a single package, `specra-lang`.

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
