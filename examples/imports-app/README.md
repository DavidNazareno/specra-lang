# Imports App

This example shows how to split a Specra contract across multiple `.scl.md` files.

## Layout

```txt
examples/imports-app/
  service.scl.md
  features/
    reservations.scl.md
```

The root file imports the feature file:

```specra
import "./features/reservations.scl.md"
```

## Run

Using the entry file:

```bash
pnpm specra-lang check examples/imports-app/service.scl.md
```

Using the folder root:

```bash
pnpm specra-lang check examples/imports-app
pnpm specra-lang refresh examples/imports-app --out examples/imports-app/.specra
pnpm specra-lang proof examples/imports-app --out examples/imports-app/.specra
pnpm specra-lang verify examples/imports-app --results examples/imports-app/.specra/verify/proof.json
```

Both forms resolve the imported feature file and validate the combined contract. In this example the output directory is passed explicitly so the generated state stays next to the example itself.
