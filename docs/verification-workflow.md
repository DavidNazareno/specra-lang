# Verification Workflow

Specra verification currently works in three layers.

## 1. Source contract

The `.scl` file defines:

- entities
- operations
- constraints
- expectations

That is the source of truth.

## 2. Expected verification data

Specra derives normalized artifacts from the source spec:

- `verification-plan.json`
- `ai-context.json`
- `AI-BRIEF.md`

These artifacts are used by coding agents or downstream tooling.

When a project uses `specra install`, the generated agent guidance should direct the coding agent to:

1. read the relevant `.scl` files under `specra/`
2. refresh `specra/generated/` with `specra trial`
3. run the app's tests or reproduction steps
4. write `specra/generated/observed-results.json`
5. call `specra verify --results specra/generated/observed-results.json`

## 3. Observed implementation results

A separate implementation artifact provides what the real code did or claims to do.

Today the TypeScript-oriented path is snapshot-based:

1. Generate a template:

```bash
pnpm specra snapshot-template examples/booking-app/app.scl
```

2. Fill the snapshot from a TypeScript implementation or from tests.

3. Extract observed results:

```bash
pnpm specra extract-typescript examples/booking-app/app.scl --impl tests/fixtures/typescript-implementation-snapshot.json
```

4. Verify observed behavior against the spec:

```bash
pnpm specra verify examples/booking-app/app.scl --results tests/fixtures/observed-results.json
```

## Current verifier model

The verifier currently checks:

- `outcome`
- `output.<fieldPath>`

Possible report statuses:

- `pass`
- `fail`
- `missing`

## Why this matters

Specra does not need to generate the full application itself to be useful.

The important property is this:

- `.scl` defines what must be true
- the implementation produces observed results
- Specra checks whether the implementation satisfied the declared contract

That makes Specra useful as a governing layer for AI-assisted implementation.
