# Agents

Specra currently supports these coding-agent targets:

- `opencode`
- `claude` for Claude Code
- `codex` for Codex CLI and Codex agents

## What `specra-lang install` does

`specra-lang install` writes guidance for the selected target so the agent follows the Specra loop:

1. read the contract in `specra/`
2. run `specra-lang check`
3. run `specra-lang refresh`
4. run `specra-lang proof`
5. execute tests or reproduction steps
6. fill `.specra/verify/proof.json`
7. run `specra-lang verify`

## Target details

### OpenCode

Install with:

```bash
specra-lang install --target opencode
```

Specra writes:

- `opencode.jsonc`
- `.opencode/agents/specra.md`

### Claude Code

Install with:

```bash
specra-lang install --target claude
```

Specra writes:

- `CLAUDE.md`

### Codex

Install with:

```bash
specra-lang install --target codex
```

Specra writes:

- `AGENTS.md`

## Local and global modes

Project-local install:

```bash
specra-lang install --target opencode --location local
```

User-wide install:

```bash
specra-lang install --target opencode --location global
```

The same pattern works for `claude` and `codex`.

## What is not supported yet

Specra does not yet include first-party support for:

- Cursor rules
- Windsurf
- Gemini CLI
- generic MCP auto-install across every agent surface
