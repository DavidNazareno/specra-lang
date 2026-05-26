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
- a minimal `.scl` parser and validator
- a normalized semantic model
- AI-context artifacts
- a basic expectation verifier
- a first TypeScript-oriented implementation snapshot extractor
- a CLI
- a generic export flow for normalized specifications

## Documentation

- [Current Stable Surface](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/docs/current-stable-surface.md)
- [`.scl` Language Guide](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/docs/language-scl.md)
- [Verification Workflow](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/docs/verification-workflow.md)
- [Versioning And Releases](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/docs/versioning-and-releases.md)
- [Publishing Checklist](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/docs/publishing-checklist.md)

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

```txt
service BookingApp
goal: Manage restaurant reservations

entity Reservation
id: UUID
customerName: string
date: string
partySize: number
status: string
end

operation createReservation(Reservation) -> Reservation

expectation createReservation_success
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

## `.scl` syntax rules

Top-level statements allowed:

- `service Name`
- `goal: text`
- `entity Name ... end`
- `operation name(InputA, InputB) -> Output`
- `expectation name ... end`
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
pnpm specra check examples/booking-app/app.scl
pnpm specra inspect examples/booking-app/app.scl
pnpm specra context examples/booking-app/app.scl
pnpm specra snapshot-template examples/booking-app/app.scl
pnpm specra extract-typescript examples/booking-app/app.scl --impl tests/fixtures/typescript-implementation-snapshot.json
pnpm specra generate examples/booking-app/app.scl --out examples/booking-app/generated
```

The generated verification artifacts now include:

- `specra.json`
- `SUMMARY.md`
- `verification-plan.json`
- `ai-context.json`
- `AI-BRIEF.md`

## Current package roles

- `@specra/ast`: syntax-level document types
- `@specra/core`: parser and validator for `.scl`
- `@specra/ir`: normalized semantic model and verification plan builder
- `@specra/ai-context`: stable context artifacts for coding agents
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

- [Contributing Guide](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/CONTRIBUTING.md)
- [Code of Conduct](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/CODE_OF_CONDUCT.md)
- [Changelog](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/CHANGELOG.md)
- [Changesets Guide](/Users/davidnazareno/Documents/Codex/2026-05-26/sabes-que-estaba-pensando-que-esta/.changeset/README.md)
