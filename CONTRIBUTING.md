# Contributing

Thanks for helping build Specra.

## Development principles

- Keep the language simple until real use cases force complexity.
- Prefer deterministic transforms over hidden AI behavior.
- Keep the core fully framework-neutral.
- Document syntax changes through RFCs before broadening the language.

## Local workflow

```bash
pnpm install
pnpm build
pnpm lint
```

## Pull requests

- Include tests for parser or generator behavior when relevant.
- Document breaking syntax changes.
- Keep package boundaries clean.
