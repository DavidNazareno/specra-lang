# Publishing Checklist

Use this checklist before creating the public GitHub repository.

## Repository hygiene

- Review `README.md` for clarity and first impression
- Confirm `LICENSE` is correct
- Confirm `CHANGELOG.md` exists
- Confirm `.gitignore` excludes local caches and generated files
- Confirm documentation links are up to date

## Technical verification

- Run `pnpm install`
- Run `pnpm build`
- Run `pnpm lint`
- Run `pnpm test`
- Run `pnpm specra check examples/imports-app`
- Run `pnpm specra context examples/imports-app`
- Run `pnpm specra verify examples/imports-app --results tests/fixtures/observed-results.json`
- Run `pnpm --filter @specra/cli pack`
- Run `pnpm --filter @specra/core pack`

## Open source readiness

- Add a repository description
- Add topics such as `dsl`, `ai`, `verification`, `typescript`, `nx`
- Decide whether GitHub Discussions should be enabled
- Create initial labels such as `bug`, `enhancement`, `docs`, `language`, `verifier`
- Create the first milestone, for example `v0.2.0`
- Verify GitHub Actions are enabled for the repository
- Verify the `Versioning` workflow can create pull requests

## Suggested first issues

- Add richer contract types such as `optional` and `list`
- Add a verifier report output format for CI
- Add a real TypeScript code extractor beyond snapshots
- Add example projects for additional domains
