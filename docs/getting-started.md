# Getting Started

## Install

```bash
pnpm add -D specra
```

## Initialize a project

```bash
specra init
```

This creates:

- `specra/spec.scl.md`
- `specra/README.md`
- `.specra/.gitignore`

If you choose the `hello-world` template, Specra also creates `specra/features/hello-world.scl.md`.

## Daily workflow

```bash
specra check
specra refresh
specra proof
specra verify
```

### What each command does

- `specra check` validates the contract.
- `specra refresh` updates `.specra/ctx.json`, `.specra/plan.json`, and `.specra/specra.db`.
- `specra proof` scaffolds `.specra/verify/proof.json`.
- `specra verify` compares the proof against contract expectations.

## Agent loop

1. The agent reads the relevant `.scl.md` files under `specra/`.
2. The agent refreshes compact runtime artifacts.
3. The agent runs tests or reproduction steps.
4. The agent fills `.specra/verify/proof.json` with observed values.
5. The agent runs `specra verify`.

## Current agent support

Specra currently supports these coding-agent targets:

- `opencode`
- `claude` for Claude Code
- `codex` for Codex CLI and Codex agents

For the full target breakdown, see [Agents](/agents).

You can install project-local guidance with:

```bash
specra install --target opencode
specra install --target claude
specra install --target codex
```

Or install user-wide guidance with:

```bash
specra install --target opencode --location global
specra install --target claude --location global
specra install --target codex --location global
```

Specra does not yet include first-party support for other agent surfaces such as Cursor rules, Windsurf, or Gemini CLI.

## Notes

- The only package most users need is `specra`.
- The hidden `.specra/` folder is meant for generated state and verification artifacts.
- Legacy `.scl` files are still supported, but `.scl.md` is the preferred format.
