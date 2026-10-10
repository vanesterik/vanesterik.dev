# About page: introduction, experience, companies and contact

Status: approved in conversation on 2026-10-10, for story #63, pending review of this document.

## Purpose

`/about/` shows "coming soon". Koen wants an about page in the style of the text column of https://camillemormal.com/about: a large introduction followed by short, indented sections. The page should present him as he is now, an applied data scientist with a master's degree, backed by more than a decade of front-end development.

Success means:
- a visitor can tell within a minute who Koen is, where he has worked and how to reach him;
- the page reads well from a phone to a wide screen, in light and dark;
- changing a job, a company or the introduction is an edit to a content file, not to code.

## Scope

Taken from the reference: the text column in its position on the page, the large introduction, the section structure and the relative text sizes.

Changed from the reference:
- **Introduction:** rewritten for Koen (see Content).
- **Working Experience:** Koen's roles from his LinkedIn profile.
- **Brands I Worked With:** renamed to **Companies I Worked With**, with companies from his LinkedIn profile.
- **Get In Touch:** Email, LinkedIn and GitHub only.
- **Weight:** the reference sets everything in a regular weight; this page sets its large text in Lausanne bold.

Left out: the minimap on the left, the Awards & Recognition and Credits sections, and anything outside the page's main content. The site's header, footer and navigation stay as they are.

## Decisions

| Topic | Decision |
|---|---|
| Content | `content/about.json`, read with a typed JSON import like `content/layout.json`; no runtime validation |
| Shared content | The tagline and the contact links come from `content/layout.json`, so each lives in one place |
| Experience | One line per company: the latest title held there and the whole period, newest first |
| Companies | Employers and direct clients first, newest first, then the projects named in the Lab Digital 2016–2017 role; HAN University of Applied Sciences is left out |
| Column | From `md` (768px): starts at 45% of the main column's width and ends 10% before its right edge. Below `md`: full width |
| Text sizes | Scale with the window at the reference's proportions, with minimums for small screens |
| Fonts | Lausanne bold (700) for the large text; periods in NB International Pro Mono, uppercase, `text-muted-foreground` |
| Links | As in the footer's `LinkList`: `mailto:` in the same tab, other links in a new tab with `rel="noopener noreferrer"`; `hover:text-highlight` |
| Rendering | Server components only; no client JavaScript |
| Coming soon | Stays for Projects; the about page stops using it |

## Content

### Introduction

Two paragraphs:

> I'm an applied data scientist with a master's degree to match, building on more than a decade of experience in front-end development.
>
> Live to learn. Learn to code. Code to build. Build to live. That loop took me from building interfaces to building with data, and the craft of the first now shapes how I do the second.

The second paragraph starts with `tagline` from `content/layout.json`, its lines joined with spaces.

### Working Experience

From https://www.linkedin.com/in/kdesterik/, newest first:

| Title | Company | Period |
|---|---|---|
| Data Scientist | Provincie Utrecht | 2026 – Present |
| Data Science Intern | Provincie Utrecht | 2025 – 2026 |
| Development Team Lead & Senior Frontend Developer | Lab Digital | 2022 – 2024 |
| Product Owner | Flex IT Distribution | 2021 |
| Senior Frontend Developer | LeasePlan | 2018 – 2021 |
| Designer & Creative Developer | Jungle Minds | 2017 – 2018 |
| Art Director, Designer & Creative Developer | Lab Digital | 2016 – 2017 |
| Digital Director & Partner | Flip-Flop Interactive | 2013 – 2016 |
| Creative Intern | Tribal DDB Shanghai | 2012 |

Lab Digital (2022–2024) and LeasePlan held several roles each; the line shows the last one.

### Companies I Worked With

Provincie Utrecht, Lab Digital, Flex IT Distribution, LeasePlan, Jungle Minds, Flip-Flop Interactive, Tribal DDB Shanghai, Amstel Gold Race, Hanno, Nutricia, Toyota.

LinkedIn spells Nutricia as "Nutrucia"; the page uses the company's own spelling.

### Get In Touch

Email, LinkedIn and GitHub, in that order:
- **Email:** the `mailto:` link in `contact` in `content/layout.json`;
- **LinkedIn** and **GitHub:** the entries named `linkedin` and `github` in `social` in `content/layout.json`.

The page shows them with these names, not the footer's lowercase names and address.

## Units

### `content/about.json`

```json
{
  "intro": "I'm an applied data scientist with a master's degree to match, …",
  "afterTagline": "That loop took me from building interfaces to building with data, …",
  "experience": [
    { "title": "Data Scientist", "company": "Provincie Utrecht", "period": "2026 – Present" }
  ],
  "companies": ["Provincie Utrecht", "Lab Digital"]
}
```

`period` is display text, so an open period reads `Present` without date logic.

### `components/about-section.tsx`

A section with a heading and an indented list, used for all three sections:

```tsx
type AboutSectionProps = {
  title: string
  children: ReactNode // the <li> elements
}
```

It renders `<section>` with an `<h2>` and a `<ul>` holding the children, the list indented by about two characters' width of the heading. The items are passed in, so each section decides what an item holds.

### `app/about/page.tsx`

Server component that renders, in the column:
- a visually hidden `<h1>About</h1>` (`sr-only`), as the large introduction is not a heading;
- the two introduction paragraphs;
- `<AboutSection title="Working Experience">` with an item per role: the title and the company each on their own line at item size, the period under them in the mono style;
- `<AboutSection title="Companies I Worked With">` with one name per item;
- `<AboutSection title="Get In Touch">` with one link per item.

It sets `<title>` to "About" through `export const metadata`.

### Sizes and spacing

Measured on the reference at a 1512px-wide window and kept as proportions:

| Element | Size |
|---|---|
| Introduction and section headings | `clamp(1.75rem, 2.8vw, 3.5rem)`, about 42px at 1512px |
| Items: titles, companies, names, links | `clamp(1.375rem, 2.3vw, 2.875rem)`, about 35px at 1512px |
| Periods | `text-xs`, mono, uppercase, as elsewhere on the site |
| Line height | 1.3 |
| Between the introduction paragraphs | about one line (1.15em) |
| Before each section | about 6.5em of the introduction size (about 280px at 1512px) |
| Between a heading and its first item, and between items | about 1.2em of the item size |

Exact values may be adjusted in the browser to match the reference by eye.

## Testing

Vitest and Testing Library, next to each file:

- **`about-section.test.tsx`:** renders its title as a level-2 heading and its children inside a list.
- **`app/about/page.test.tsx`:**
  - the introduction includes the tagline from `content/layout.json`;
  - Working Experience lists 9 roles, the first being Data Scientist at Provincie Utrecht;
  - Companies I Worked With lists 11 companies;
  - Get In Touch links Email, LinkedIn and GitHub to the addresses in `content/layout.json`, with `mailto:` in the same tab and the others in a new one;
  - there is no Awards & Recognition or Credits section.

In the browser: the column's position and the text sizes from 375px to a wide screen, both themes, and the header and footer overlapping the content as on other pages.

## Documentation

`CLAUDE.md`'s architecture section adds `content/about.json` and `components/about-section.tsx`, and notes that the about page reads the tagline and contact links from `content/layout.json`.
