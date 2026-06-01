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
pnpm specra refresh examples/imports-app
pnpm specra trial examples/imports-app
```

Both forms resolve the imported feature file and validate the combined contract. `refresh` writes the agent-facing files into `.specra/generated/` by default, and `trial` adds verification templates on top of that hidden workspace.
