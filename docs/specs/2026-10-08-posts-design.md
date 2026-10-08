# Posts: Markdown rendered as static pages

Status: approved in conversation on 2026-10-08, for story #41.

## Purpose

`/posts/` shows "coming soon". Koen has a first post, "Shipping image datasets off a Mac without the junk", written in Markdown.

Posts should stay Markdown files in the repository and be rendered to static HTML at build time:
- a list page of all posts;
- a detail page per post, in a centred column at most 640px wide, set in the site's fonts for comfortable reading.

Success means:
- adding a post is only a matter of adding a Markdown file;
- the first post reads well in light and dark;
- the static export to S3 works as before.

## Decisions

| Topic | Decision |
|---|---|
| Location | `content/posts/<slug>.md`; the file name without `.md` is the slug and the URL, `/posts/<slug>/` |
| Metadata | YAML front matter with `title`, `date` (`YYYY-MM-DD`) and `description`, all required. The body has no `# H1`, because the title comes from front matter |
| Parsing | `gray-matter` for front matter; unified with `remark-parse`, `remark-gfm`, `remark-rehype`, `@shikijs/rehype` and `rehype-stringify` for the body, at build time in server components |
| Code highlighting | Shiki with `github-light` and `github-dark`, both emitted as CSS variables and switched by the site's `dark` class |
| Prose styling | `@tailwindcss/typography` (0.5, loaded with `@plugin`), with its colour variables pointed at the site's tokens |
| Detail column | Centred, `max-w-160` (40rem, 640px) |
| List | Newest first. Each entry shows the date, the title as a link and the description |
| Dates | Formatted in UTC as `DD MON YYYY` (e.g. `08 OCT 2026`), shown in the mono uppercase style |
| Metadata tags | Each post sets `<title>` and `<meta name="description">` through `generateMetadata` |
| Coming soon | Stays for About and Projects; the posts page stops using it |

`@next/mdx` was considered and not chosen. The posts are Markdown, not MDX, and `@next/mdx` would turn each post into a route file instead of content beside `content/layout.json`.

## Units

### `lib/posts.ts`

The only code that reads `content/posts/`. It runs at build time only (server components and `generateStaticParams`).

```ts
type PostMeta = { slug: string; title: string; date: string; description: string }
type Post = PostMeta & { html: string }

getPosts(dir?: string): PostMeta[]              // newest first
getPost(slug: string, dir?: string): Promise<Post> // throws if the slug has no file
formatPostDate(date: string): string            // "2026-10-08" -> "08 OCT 2026", in UTC
```

- **`dir`** defaults to `content/posts`, so tests can point it at a fixtures folder.
- **Front matter validation:** a missing or non-string `title` or `description`, or a `date` that isn't a valid `YYYY-MM-DD`, throws an error naming the file. That fails the build.
- **YAML dates:** gray-matter parses an unquoted `2026-10-08` as a JavaScript `Date`. The loader normalises that back to the `YYYY-MM-DD` string.
- **Rendering:** the body goes through the unified pipeline above.

### `app/posts/page.tsx`

Server component that renders `<PostList posts={getPosts()} />` in the centred 640px column.

### `components/post-list.tsx`

Each entry, newest first:
- the date, in mono, uppercase, `text-muted-foreground`;
- the title as a `next/link` to `/posts/<slug>/`, in Lausanne bold at about prose-H2 size, turning `highlight` on hover;
- the description as one muted line.

With no posts, it renders "no posts yet".

### `app/posts/[slug]/page.tsx`

- `generateStaticParams` returns every slug from `getPosts()`, and `dynamicParams = false`, so unknown slugs get the 404 page in the static export.
- `generateMetadata` sets the title and description.
- **Page:** the centred 640px column with:
  - a header holding the date (mono, uppercase, muted) and the `<h1>` title (Lausanne bold);
  - the HTML in an `<article className="prose ...">` via `dangerouslySetInnerHTML`. That's safe because the HTML is generated at build time from Koen's own files.

### Styling in `app/globals.css`

- **Plugin:** `@plugin "@tailwindcss/typography";`.
- **Prose colours:** point the plugin's variables at the tokens:
  - `--tw-prose-body`, `--tw-prose-headings`, `--tw-prose-bold`, `--tw-prose-links`, `--tw-prose-code` and `--tw-prose-bullets` → `foreground`;
  - `--tw-prose-counters`, `--tw-prose-quotes`, `--tw-prose-quote-borders`, `--tw-prose-hr`, `--tw-prose-th-borders`, `--tw-prose-td-borders` and `--tw-prose-captions` → `muted-foreground`.

  The site's `--color-*: initial` removes the plugin's grey defaults, so these overrides are needed, and they make dark mode automatic.
- **Prose links:** underlined, turning `highlight` on hover.
- **Inline code:** in the mono font, without the plugin's backtick pseudo-elements.
- **Code blocks:**
  - `pre` uses the `secondary` token as background and is `rounded` like the buttons, with `overflow-x: auto` (the plugin's default).
  - Text colours come from Shiki's variables: `--shiki-light` by default and `--shiki-dark` under `.dark`, applied to `.shiki span` (and to `.shiki` for the default text colour).
  - Shiki's own background colours are not used.

## The first post

`content/posts/shipping-image-datasets-off-a-mac.md` is the post with this front matter added and its `# H1` removed. The body is otherwise unchanged:

```yaml
---
title: Shipping image datasets off a Mac without the junk
date: 2026-10-08
description: A small tar toolkit for moving image datasets off a Mac without .DS_Store and ._ files tagging along.
---
```

The date and description are proposals; Koen confirms or replaces them when he reviews this design.

## Testing

- **`lib/posts.test.ts`,** against `lib/__fixtures__/posts/`:
  - `getPosts` sorts newest first and returns the slugs;
  - each missing field fails with the file name;
  - an invalid date fails;
  - an unquoted YAML date becomes `YYYY-MM-DD`;
  - `getPost` renders a heading, a list and inline code;
  - a `shell` block comes out as a `pre.shiki` containing `--shiki-light` and `--shiki-dark` variables;
  - an unknown slug throws;
  - `formatPostDate` formats in UTC.
- **`components/post-list.test.tsx`:** links point to `/posts/<slug>/`, the order is kept, and the empty state renders.
- **Build:** `npm run build` produces `out/posts/index.html` and `out/posts/shipping-image-datasets-off-a-mac/index.html`. The latter contains Shiki markup and no "coming soon".
- **Browser:** the detail page in light and dark. The column is 640px wide on a desktop, the fonts are Lausanne and NB International Pro Mono, code is highlighted in both themes, and the cheat sheet scrolls sideways inside its block.

## Out of scope

Tags, RSS, pagination, reading time, a back link (the navigation's "posts" button covers it), images in posts and a page title for the rest of the site.
