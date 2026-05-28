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
pnpm specra check examples/imports-app/service.scl.md
```

Using the folder root:

```bash
pnpm specra check examples/imports-app
pnpm specra trial examples/imports-app --out examples/imports-app/generated
```

Both forms resolve the imported feature file and validate the combined contract.
