Summary

Specra is an AI-oriented specification language. The current direction of the project is not to compile full apps by itself, but to act as a strict contract between human intent, AI-assisted implementation, and verification. The language extension is `.scl`, the project is at `0.1.0`, and the repo is already prepared to be published as open source.

What is already done

The repo uses pnpm + Nx + TypeScript + Biome. It includes a `.scl` parser and validator, an AST, a normalized IR, AI context generation, verifiable expectations, a base verifier, and a snapshot-based TypeScript extractor.

Current packages:

- `@specra/ast`: document types
- `@specra/core`: parser and validator
- `@specra/ir`: normalized semantic model + verification plan
- `@specra/ai-context`: agent artifacts + brief
- `@specra/verifier`: compares observed results against expectations
- `@specra/verifier-typescript`: converts TypeScript-friendly snapshots into observed results
- `specra`: user-facing CLI package

Current CLI

- `specra inspect <file.scl>`
- `specra check <file.scl>`
- `specra context <file.scl>`
- `specra snapshot-template <file.scl>`
- `specra extract-typescript <file.scl> --impl <snapshot.json>`
- `specra generate <file.scl> --out <folder>`
- `specra verify <file.scl> --results <observed-results.json>`

Current `.scl` syntax

Supported:

- `service`
- `goal`
- `entity ... end`
- `operation`
- `expectation ... end`
- `constraint`
- `target`

Inside `expectation`:

- `operation:`
- `auth: valid|missing|optional`
- `input field: value`
- `expect outcome: success|unauthorized|error`
- `expect output.field: value`

Working example

There is an example in:

- `examples/booking-app/app.scl`

Fixtures/tests:

- `tests/specra.test.mjs`
- `tests/fixtures`

Artifacts currently generated

- `specra.json`
- `SUMMARY.md`
- `verification-plan.json`
- `ai-context.json`
- `AI-BRIEF.md`

Current verification model

The current flow is:

1. `.scl` defines intent and expectations
2. Specra generates context and a verification plan
3. an implementation produces a snapshot or observed results
4. `specra verify` compares observed results with expectations

Today the TypeScript extractor does not inspect arbitrary code yet; it uses a structured snapshot as the bridge.

Open source infrastructure already prepared

Already present:

- `README`
- docs for stable surface, language, verification, publishing, and versioning
- `CHANGELOG`
- `CODE_OF_CONDUCT`
- `CONTRIBUTING`
- GitHub issue/PR templates
- Changesets
- GitHub Actions for CI and Versioning

Important files:

- `README.md`
- `docs/current-stable-surface.md`
- `docs/language-scl.md`
- `docs/verification-workflow.md`
- `docs/versioning-and-releases.md`
- `docs/publishing-checklist.md`

What is still missing

The main missing pieces before a more realistic AI workflow:

- a comfortable façade such as `@specra/sdk`
- a less manual local end-to-end loop
- a real TypeScript extractor from code or tests, not only snapshots
- more realistic examples
- possibly an orchestrating command for local trial runs

Recommended next step

Create:

- `@specra/sdk`
- an `examples/local-trial` example
- a flow where the AI reads `app.scl`, gets `ai-context`, produces an implementation or snapshot, and then Specra verifies it automatically

Technical status

The base compiles and validates. The commands already used successfully are:

- `pnpm build`
- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm specra context ...`
- `pnpm specra generate ...`
- `pnpm specra verify ...`

Core idea

The current philosophy of the project is:

Specra does not let the AI do whatever it wants; it gives the model a small, validatable, and verifiable structure to implement within clear boundaries.

If you want, in the next chat you can ask directly:

`create @specra/sdk and a local-trial flow so we can start testing Specra with AI for real`
