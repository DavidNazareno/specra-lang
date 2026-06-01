# Local Trial

This example is the shortest recommended path for trying Specra end-to-end.
It intentionally stays as a compact legacy `.scl` example; new project contracts should prefer `.scl.md`.

## Run

```bash
pnpm build
pnpm specra trial examples/local-trial/app.scl --out examples/local-trial/generated
```

That generates a ready-to-use trial folder with:

- `AI-BRIEF.md` for the implementing agent
- `implementation-snapshot.template.json` for the TypeScript snapshot path
- `observed-results.template.json` for direct verification
- `verification-report.txt` with the current report
- `TRIAL.md` with the next commands to run

## Re-run verification

Using the snapshot path:

```bash
pnpm specra trial examples/local-trial/app.scl --out examples/local-trial/generated --impl examples/local-trial/generated/implementation-snapshot.template.json
```

Using direct observed results:

```bash
pnpm specra trial examples/local-trial/app.scl --out examples/local-trial/generated --results examples/local-trial/generated/observed-results.template.json
```

Edit the generated template files with real observed behavior before trusting the final report.
