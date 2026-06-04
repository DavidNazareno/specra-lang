# Verification Workflow

Specra verification currently works in three layers.

## 1. Source contract

The Specra contract defines:

- entities
- operations
- constraints
- expectations

That is the source of truth.

## 2. Expected verification data

Specra derives normalized artifacts from the source spec:

- `.specra/plan.json`
- `.specra/ctx.json`
- `.specra/specra.db`

These artifacts are used by coding agents or downstream tooling.

When a project uses `specra-lang install`, the generated agent guidance should direct the coding agent to:

1. read the relevant `.scl.md` files under `specra/`
2. refresh `.specra/` with `specra-lang refresh`
3. scaffold `.specra/verify/proof.json` with `specra-lang proof`
4. run the app's tests or reproduction steps
5. replace the `__fill__` placeholders in `.specra/verify/proof.json`
6. call `specra-lang verify` or `specra-lang verify --results .specra/verify/proof.json`

## 3. Observed implementation results

A separate implementation artifact provides what the real code did or claims to do.

Today the intended path is proof-based:

1. Generate a proof template:

```bash
pnpm specra-lang proof examples/imports-app
```

2. Run the app's tests or reproduction steps.

3. Replace the `__fill__` placeholders in `.specra/verify/proof.json` with what the tests actually observed.

4. Verify observed behavior against the spec:

```bash
pnpm specra-lang verify examples/imports-app --results .specra/verify/proof.json
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

- the `.scl.md` contract defines what must be true
- the implementation produces observed results
- Specra checks whether the implementation satisfied the declared contract

That makes Specra useful as a governing layer for AI-assisted implementation.
