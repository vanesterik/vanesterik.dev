# GitHub Actions: `ci.yml` and `deploy.yml`

Status: approved in conversation on 2026-10-08, for story #39.

## Purpose

The repository has four workflows, all disabled. Each installs through the composite action `.github/actions/setup-node`:

- `continuous-integration.yml`
- `preview-environment.yml`, which deployed every pull request to its own S3 bucket so Playwright and Lighthouse had a URL to test
- `production-environment.yml`
- `web-performance-audit.yml`, which ran Lighthouse against that preview

Playwright is gone. Lighthouse isn't useful for this static site, so the preview has no reason to exist either. Two workflows replace all four:

- `ci.yml` checks every change.
- `deploy.yml` releases a tagged version: the site to S3, and Storybook to GitHub Pages.

The README gets status badges and a link to the published Storybook.

## Decisions

| Topic | Decision |
|---|---|
| Deploy trigger | A pushed `v*.*.*` tag, as made by `npm run release` |
| Checks before deploying | `deploy.yml` reuses `ci.yml` (`workflow_call`); deploy jobs need it to pass |
| AWS access | The existing access-key secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_S3_BUCKET_NAME`); OIDC is a possible later story |
| Storybook hosting | GitHub Pages of this repository, https://vanesterik.github.io/vanesterik.dev/, deployed by `deploy.yml` |
| Setup | Inline `actions/setup-node` with `node-version-file: .nvmrc` and the npm cache; the composite action is removed |
| Action versions | Pinned by commit SHA with a version comment, which Dependabot updates |
| Version badge | Shields.io `github/package-json/v` (the site isn't published to npm) |
| Licence | `LICENSE` stays MIT with the year 2023-2026; `package.json` gets `"license": "MIT"` |

## `ci.yml`

- **Triggers:** `push` to `main`, `pull_request`, and `workflow_call`.
- **Permissions:** `contents: read`.
- **Concurrency:** `ci-${{ github.ref }}`. A newer run cancels an older one on pull requests, but never on `main` or in a deploy.
- **One job:**
  - check out;
  - set up Node from `.nvmrc` with the npm cache;
  - `npm ci`;
  - `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.

  Storybook isn't built here (Koen's decision): a broken story shows up when `deploy.yml` builds Storybook for a release.

## `deploy.yml`

- **Trigger:** `push` of tags matching `v*.*.*`.
- **Permissions:** `contents: read` at the top. The `storybook` job adds `pages: write` and `id-token: write`.
- **Concurrency:** one workflow-level group, `deploy`, with `cancel-in-progress: false`. Whole deploys queue in the order their tags were pushed, so an older release can never finish after a newer one, and a running sync is never interrupted. (Per-job groups would let two releases' CI runs race and deploy out of order.)
- **Jobs:**
  - **`ci`:** `uses: ./.github/workflows/ci.yml`.
  - **`site`** (needs `ci`):
    - check out, set up Node, `npm ci`, `npm run build`;
    - configure AWS credentials from the secrets;
    - `aws s3 sync ./out s3://$AWS_S3_BUCKET_NAME --delete`.
  - **`storybook`** (needs `ci`):
    - check out, set up Node, `npm ci`, `npm run build-storybook`;
    - `actions/upload-pages-artifact` with `storybook-static`;
    - `actions/deploy-pages`.

    Environment `github-pages`, with the deployed URL as its environment URL.

## Removed

`continuous-integration.yml`, `preview-environment.yml`, `production-environment.yml`, `web-performance-audit.yml` and `.github/actions/setup-node/`.

## README

- **Badges,** on the first lines, before the title:
  - **CI:** `https://github.com/vanesterik/vanesterik.dev/actions/workflows/ci.yml/badge.svg`, linking to that workflow's runs.
  - **Licence:** `https://img.shields.io/github/license/vanesterik/vanesterik.dev`, linking to `LICENSE`.
  - **Version:** `https://img.shields.io/github/package-json/v/vanesterik/vanesterik.dev`, linking to `CHANGELOG.md`.
- **Storybook link:** a line under the description pointing to the published Storybook.

## Repository settings (outside the code, done with Koen's go-ahead)

1. **Enable GitHub Pages** with source "GitHub Actions": `gh api -X POST repos/vanesterik/vanesterik.dev/pages -f build_type=workflow`.
2. **Allow tags to deploy Pages:** add a deployment branch policy to the `github-pages` environment that allows `v*.*.*` tags. Out of the box it only allows the default branch.
3. **Optional:** delete the unused `preview` and `release` environments.

## Done when

- `ci.yml` runs and passes on this story's pull request.
- The four old workflows and the composite action are gone, and nothing refers to them.
- The README shows the three badges and the Storybook link.
- After the settings are in place and the next release tag is pushed, the site is synced to S3 and Storybook is live on GitHub Pages. That last check happens after merge, on Koen's release.
