[![CI](https://github.com/vanesterik/vanesterik.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/vanesterik/vanesterik.dev/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/vanesterik/vanesterik.dev)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/vanesterik/vanesterik.dev)](CHANGELOG.md)

# van_esterik

Showcase website of [@vanesterik](https://github.com/vanesterik), built with Next.js and exported as a static site.

Browse the components in [Storybook](https://vanesterik.github.io/vanesterik.dev/).

## Stack

- [Next.js](https://nextjs.org/) (App Router, static export) and React
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) components with [Lucide](https://lucide.dev/) icons
- [Biome](https://biomejs.dev/) for linting and formatting
- [Vitest](https://vitest.dev/) and Testing Library for tests
- [Storybook](https://storybook.js.org/) for browsing components
- TypeScript

## Getting started

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Export the static site to `out/` |
| `npm run lint` | Check linting and formatting with Biome |
| `npm run format` | Apply Biome's fixes and formatting |
| `npm run typecheck` | Generate Next.js types and run `tsc` |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run coverage` | Run the tests with coverage |
| `npm run storybook` | Start Storybook on port 6006 |
| `npm run build-storybook` | Build a static Storybook to `storybook-static/` |
| `npm run release` | Bump the version, update the changelog and tag |
