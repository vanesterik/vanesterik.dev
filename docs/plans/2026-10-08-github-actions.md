# Replace the workflows with `ci.yml` and `deploy.yml`: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in this session, on the branch `ci/github-actions`. Subagents may review; they never implement (see `~/.claude/CLAUDE.md`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four disabled workflows and their composite setup action with two workflows. `ci.yml` checks every change. `deploy.yml` releases a `v*.*.*` tag: it re-runs the checks, syncs the site to S3 and publishes Storybook to GitHub Pages. The README also gets status badges and a Storybook link. This is story #39.

**Architecture:** Three commits:

1. `ci.yml` replaces `continuous-integration.yml`. It runs on this pull request, so it proves itself.
2. `deploy.yml` replaces `production-environment.yml`, and the preview, Lighthouse and composite-action files are deleted.
3. README, licence and `CLAUDE.md` changes.

The repository settings that Pages needs are set after merge, with Koen's go-ahead.

**Tech stack:** GitHub Actions. Actions are pinned by commit SHA:
- `actions/checkout` v7.0.1
- `actions/setup-node` v7.1.0
- `aws-actions/configure-aws-credentials` v6.3.0
- `actions/upload-pages-artifact` v5.0.0
- `actions/deploy-pages` v5.0.1

`actionlint` 1.7 checks the workflow files.

**Spec:** `docs/specs/2026-10-08-github-actions-design.md` (this pull request's first commit).

## Global constraints

- **Pinned actions:** every action is pinned by full commit SHA with a `# vX.Y.Z` comment. Dependabot's `github-actions` ecosystem already updates these.
- **Node and dependencies:** Node comes from `.nvmrc` through `actions/setup-node` with `cache: npm`, and dependencies install with `npm ci`.
- **Least privilege:** workflows grant `contents: read`. Only the Storybook job adds `pages: write` and `id-token: write`.
- **Secrets stay in variables:** secrets reach shell commands only through `env:`, never inlined into a `run:` script.
- **Before each commit:** run `actionlint` on `.github/workflows/`, plus `npm run lint`. Biome doesn't check YAML, but the commit hook runs it anyway.
- **Commit messages:** conventional, with a lowercase subject, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push each task commit as soon as it's made.

## Review focus

1. **A tag on a failing commit:** neither deploy job may run. Pinned by `needs: ci` in Task 2, step 2, and checked by `actionlint` (Task 2, step 3).
2. **Two releases in quick succession:** a running S3 sync must not be cancelled midway, which could leave the bucket half-updated. Pinned by `cancel-in-progress: false` in Task 2, step 2.
3. **`ci.yml` when called from `deploy.yml`:** its concurrency must not cancel anything, and a new run must not cancel an older one on `main`. Pinned by `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` in Task 1, step 2.
4. **Storybook under the Pages sub-path `/vanesterik.dev/`:** assets must load from relative URLs. Pinned by the check in Task 2, step 4.
5. **Secret leakage:** the bucket name and keys must never be echoed into a command line. Pinned by the `env:` pattern in Task 2, step 2, and the check in Task 2, step 3.

---

### Task 1: Add `ci.yml`

**Files:**
- Create: `.github/workflows/ci.yml`
- Delete: `.github/workflows/continuous-integration.yml`

**Interfaces:**
- Produces: the workflow `ci.yml`, callable with `uses: ./.github/workflows/ci.yml`, with no inputs or secrets. Its job id is `checks`.

- [ ] **Step 1: Install actionlint and confirm it checks the current workflows**

```bash
brew install actionlint
actionlint -version
actionlint .github/workflows/*.yml
```

Expected: a version line starting with `1.7`. The last command lists any issues in the old workflows; they're about to be deleted, so they're only a baseline.

- [ ] **Step 2: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_call:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  # A newer push replaces an older run on a pull request, never on main or in a deploy
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  checks:
    name: Lint, typecheck, test and build
    runs-on: ubuntu-latest

    steps:
      - name: Check out code
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Set up Node
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Build site
        run: npm run build

      - name: Build Storybook
        run: npm run build-storybook
```

Delete the old workflow:

```bash
git rm -q .github/workflows/continuous-integration.yml
```

- [ ] **Step 3: Lint the workflow**

Run: `actionlint .github/workflows/ci.yml`
Expected: no output, exit code 0.

- [ ] **Step 4: Commit, push, and watch it run on the pull request**

```bash
git add .github/workflows
git commit -F - <<'EOF'
ci: add ci.yml

Check every push to main and every pull request with lint, typecheck,
tests and both builds, and make the workflow callable so the deploy can
reuse it. Replaces continuous-integration.yml and its setup action
dependency.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
gh pr checks 40 --watch --interval 15
```

Expected: one check, `Lint, typecheck, test and build`, which passes. If it fails, read the log with `gh run view --log-failed` and fix the cause before going on.

---

### Task 2: Add `deploy.yml` and remove the old workflows

**Files:**
- Create: `.github/workflows/deploy.yml`
- Delete: `.github/workflows/preview-environment.yml`, `.github/workflows/production-environment.yml`, `.github/workflows/web-performance-audit.yml`, `.github/actions/setup-node/action.yml`

**Interfaces:**
- Consumes: `ci.yml` from Task 1.
- Produces: the jobs `ci`, `site` and `storybook`. The `storybook` job runs in the `github-pages` environment, so the repository settings after merge must allow tags there.

- [ ] **Step 1: Confirm nothing else uses the old files**

Run: `grep -rn "setup-node/\|preview-environment\|production-environment\|web-performance-audit\|e2e-tests" .github README.md CLAUDE.md package.json`
Expected: matches only in the workflows being deleted and in `CLAUDE.md`'s CI section, which Task 3 rewrites.

- [ ] **Step 2: Write the workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: read

jobs:
  ci:
    name: CI
    uses: ./.github/workflows/ci.yml

  site:
    name: Deploy site to S3
    needs: ci
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-site
      # Never interrupt a sync: --delete could leave the bucket half-updated
      cancel-in-progress: false

    steps:
      - name: Check out code
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Set up Node
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@e1253824e5c10ff9df46874f81ed3ec929e19cfd # v6.3.0
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_DEFAULT_REGION }}

      - name: Sync to S3
        env:
          BUCKET: ${{ secrets.AWS_S3_BUCKET_NAME }}
        run: aws s3 sync ./out "s3://$BUCKET" --delete

  storybook:
    name: Deploy Storybook to GitHub Pages
    needs: ci
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    concurrency:
      group: deploy-storybook
      cancel-in-progress: false

    steps:
      - name: Check out code
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Set up Node
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build Storybook
        run: npm run build-storybook

      - name: Upload Storybook
        uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
        with:
          path: storybook-static

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1
```

Delete the old workflows and the composite action:

```bash
git rm -q .github/workflows/preview-environment.yml .github/workflows/production-environment.yml .github/workflows/web-performance-audit.yml
git rm -r -q .github/actions
```

- [ ] **Step 3: Lint both workflows, and check that no secret is inlined into a script**

Run: `actionlint .github/workflows/*.yml && ls .github/workflows && grep -n 'run:.*secrets\.' .github/workflows/*.yml`
Expected:
- `actionlint` prints nothing.
- The directory holds only `ci.yml` and `deploy.yml`.
- The `grep` prints nothing (exit code 1), so no `run:` line references `secrets.` directly.

- [ ] **Step 4: Check that Storybook works under a sub-path**

GitHub Pages serves the site from `/vanesterik.dev/`, so every asset URL in the Storybook build must be relative.

Run: `npm run build-storybook > /dev/null && grep -oE '(src|href)="/[^/"][^"]*"' storybook-static/index.html storybook-static/iframe.html | head`
Expected: no output. An absolute URL such as `src="/assets/..."` would break under the sub-path.

- [ ] **Step 5: Commit and push**

```bash
git add .github
git commit -F - <<'EOF'
ci: deploy the site and storybook from release tags

On a v*.*.* tag, re-run the CI checks, then sync the site to S3 and
publish Storybook to GitHub Pages. Remove the preview environment, the
Lighthouse audit, the old production workflow and the composite setup
action, which nothing uses any more.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
gh pr checks 40 --watch --interval 15
```

Expected: CI passes again. `deploy.yml` doesn't run, because a branch push isn't a tag.

---

### Task 3: Add the README badges and Storybook link, the licence, and the docs

**Files:**
- Modify: `README.md`, `LICENSE`, `package.json`, `CLAUDE.md`

- [ ] **Step 1: Put the badges and the Storybook link in the README**

Insert these lines at the very top of `README.md`, followed by a blank line, before `# van_esterik`:

```markdown
[![CI](https://github.com/vanesterik/vanesterik.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/vanesterik/vanesterik.dev/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/vanesterik/vanesterik.dev)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/vanesterik/vanesterik.dev)](CHANGELOG.md)
```

After the description line, `Showcase website of ... exported as a static site.`, add a blank line and:

```markdown
Browse the components in [Storybook](https://vanesterik.github.io/vanesterik.dev/).
```

- [ ] **Step 2: Update the licence**

In `LICENSE`, change `Copyright (c) 2023 Koen van Esterik` to `Copyright (c) 2023-2026 Koen van Esterik`.

Run: `npm pkg set license=MIT && npm pkg get license`
Expected: `"MIT"`.

- [ ] **Step 3: Rewrite the CI section of `CLAUDE.md`**

Replace everything from `## CI and deployment` to the end of the file with:

```markdown
## CI and deployment

Two workflows. Actions are pinned by commit SHA with a version comment, which Dependabot updates.

- **`ci.yml`** (push to `main`, pull requests, and called by `deploy.yml`): lint, typecheck, test, build, build Storybook. A newer push cancels an older run on the same pull request.
- **`deploy.yml`** (tag `v*.*.*`): runs `ci.yml`, then in parallel syncs `out/` to the production S3 bucket (access-key secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_S3_BUCKET_NAME`) and publishes Storybook to GitHub Pages at https://vanesterik.github.io/vanesterik.dev/. Deploys are never cancelled midway.

Releasing (`npm run release`, then pushing the tag) is the only way to deploy. GitHub Pages must use the source "GitHub Actions", and its `github-pages` environment must allow `v*.*.*` tags.
```

In the `## Git hooks and commit messages` section, change `Pushing that tag deploys production, so releasing is Koen's call.` to `Pushing that tag deploys the site and Storybook, so releasing is Koen's call.`

- [ ] **Step 4: Run the checks**

Run: `npm run lint && actionlint .github/workflows/*.yml && grep -n "setup-node/\|Preview Environment\|Lighthouse" CLAUDE.md README.md`
Expected: lint passes, `actionlint` prints nothing, and the `grep` prints nothing.

- [ ] **Step 5: Commit and push**

```bash
git add README.md LICENSE package.json CLAUDE.md
git commit -F - <<'EOF'
docs: add readme badges, storybook link and licence details

Show the CI, licence and version badges at the top of the README and
link to the published Storybook. Bring the licence year up to date,
declare the MIT licence in package.json, and describe the two workflows
in CLAUDE.md.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push
gh pr checks 40 --watch --interval 15
```

Expected: CI passes.

- [ ] **Step 6: Mark the pull request ready for review**

Update the pull request body to list all five commits (design, plan, Tasks 1 to 3) under "Review commit by commit". It must also list the repository settings still to make after merge, from the spec's "Repository settings" section. Then run `gh pr ready 40`.

## After merge (outside this plan, each with Koen's go-ahead)

1. **Enable GitHub Pages** with source "GitHub Actions": `gh api -X POST repos/vanesterik/vanesterik.dev/pages -f build_type=workflow`.
2. **Allow `v*.*.*` tags in the `github-pages` environment:**
   - set the environment to custom deployment policies: `gh api -X PUT repos/vanesterik/vanesterik.dev/environments/github-pages -F "deployment_branch_policy[protected_branches]=false" -F "deployment_branch_policy[custom_branch_policies]=true"`;
   - add the default branch: `gh api -X POST repos/vanesterik/vanesterik.dev/environments/github-pages/deployment-branch-policies -f name=main -f type=branch`;
   - add the tag pattern: `gh api -X POST repos/vanesterik/vanesterik.dev/environments/github-pages/deployment-branch-policies -f name='v*.*.*' -f type=tag`.
3. **Optional:** delete the unused `preview` and `release` environments.
4. **Update the GitHub Actions memory note:** CI runs again, and deploys happen on release tags.
