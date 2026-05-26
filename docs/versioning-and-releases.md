# Versioning And Releases

Specra uses Changesets and GitHub Actions for versioning and changelog updates.

## Current release posture

The first public release target is `0.1.0`.

That means:

- the project is pre-1.0
- breaking changes are still possible
- release notes should still be clear and intentional

## Local workflow

When a change should be reflected in release notes:

```bash
pnpm changeset
```

Then answer the prompt and commit the generated file in `.changeset/`.

## GitHub workflow

Two workflows are configured:

- `CI`
- `Versioning`

### CI

Runs on pull requests and pushes to `main`:

- `pnpm build`
- `pnpm lint`
- `pnpm test`

### Versioning

Runs on pushes to `main` and uses Changesets to:

- detect unreleased changesets
- create or update a version PR
- update package versions
- update changelog entries

## What to do after creating the GitHub repo

1. Set the default branch to `main` if it is not already.
2. Push the repository contents.
3. Verify that GitHub Actions are enabled.
4. Merge a PR with a sample changeset to confirm the versioning flow works.

## Notes

The repository is not set up for npm publishing yet. The current pipeline focuses on:

- package version bookkeeping
- changelog updates
- release discipline

Publishing packages can be added later once the public package surface is stable.
