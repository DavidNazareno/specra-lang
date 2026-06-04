# Getting Started

## Install

Install the npm package:

```bash
pnpm add -D specra-lang
```

The package name is `specra-lang`, and the CLI command is also `specra-lang`.

For a one-off run without installing:

```bash
pnpm dlx specra-lang init
# or
npx specra-lang init
```

## Initialize a project

After installation, run:

```bash
specra-lang init
```

This creates:

- `specra/spec.scl.md`
- `specra/README.md`
- `.specra/.gitignore`

If you choose the `hello-world` template, Specra also creates `specra/features/hello-world.scl.md`.

## Daily workflow

```bash
specra-lang check
specra-lang refresh
specra-lang proof
specra-lang verify
```

### What each command does

- `specra-lang check` validates the contract.
- `specra-lang refresh` updates `.specra/ctx.json`, `.specra/plan.json`, and `.specra/specra.db`.
- `specra-lang proof` scaffolds `.specra/verify/proof.json`.
- `specra-lang verify` compares the proof against contract expectations.

## Agent loop

1. The agent reads the relevant `.scl.md` files under `specra/`.
2. The agent refreshes compact runtime artifacts.
3. The agent runs tests or reproduction steps.
4. The agent fills `.specra/verify/proof.json` with observed values.
5. The agent runs `specra-lang verify`.

## Current agent support

Specra currently supports these coding-agent targets:

- `opencode`
- `claude` for Claude Code
- `codex` for Codex CLI and Codex agents

For the full target breakdown, see [Agents](/agents).

You can install project-local guidance with:

```bash
specra-lang install --target opencode
specra-lang install --target claude
specra-lang install --target codex
```

Or install user-wide guidance with:

```bash
specra-lang install --target opencode --location global
specra-lang install --target claude --location global
specra-lang install --target codex --location global
```

Specra does not yet include first-party support for other agent surfaces such as Cursor rules, Windsurf, or Gemini CLI.

## Notes

- The only package most users need is `specra-lang`, and it installs the `specra-lang` command.
- The hidden `.specra/` folder is meant for generated state and verification artifacts.
- Legacy `.scl` files are still supported, but `.scl.md` is the preferred format.
