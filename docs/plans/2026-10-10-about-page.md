# About page: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in this session, on the branch `feat/about-page`. Subagents may review; they never implement (see `~/.claude/CLAUDE.md`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the about page's "coming soon" with an introduction, working experience, companies and contact links, after the text column of https://camillemormal.com/about. This is story #63.

**Architecture:** Three tasks, one commit each:

1. `AboutSection`, a heading with an indented list, and two text-size tokens in `src/app/globals.css`.
2. `getContactLinks` in `src/lib/contact-links.ts`, which builds Email, LinkedIn and GitHub from `content/layout.json` and fails the build when one is missing, plus `getLinkTargetProps`, shared with the footer's `LinkList`.
3. `content/about.json`, the page, the docs and a check in the browser.

**Tech stack:** Next.js 16 App Router (server components, static export), Tailwind 4, Vitest with Testing Library in jsdom. No new dependencies.

**Spec:** `docs/specs/2026-10-10-about-page-design.md` (this pull request's first commit). Koen approved it on 2026-10-10.

**Not spiked beforehand.** The code below follows the existing patterns (`PostList`, `LinkList`, the typed import of `content/layout.json`). Exact spacing is tuned by eye in Task 3, as the spec allows.

## Global constraints

- **Static export:** everything renders at build time in server components; the page adds no client JavaScript.
- **Colours are tokens only:** `text-foreground`, `text-muted-foreground`, `hover:text-highlight`.
- **Large text:** Lausanne bold (`font-bold`). Periods: `font-mono font-normal text-xs uppercase text-muted-foreground`.
- **Column:** from `md`, `md:ml-[45%] md:mr-[10%]` of the main column; below `md`, full width.
- **Sizes:** introduction and headings `clamp(1.75rem, 2.8vw, 3.5rem)`; items `clamp(1.375rem, 2.3vw, 2.875rem)`; line height 1.3.
- **Copy:** "Working Experience", "Companies I Worked With", "Get In Touch"; links named "Email", "LinkedIn", "GitHub", in that order. Typographic apostrophes (’) in the introduction.
- **Before each commit:** run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
- **CI:** it runs on every push to the pull request; wait for it before the next task.
- **Commit messages:** conventional, with a lowercase subject, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review focus

1. **A link missing from `content/layout.json`:** if `linkedin`, `github` or the `mailto:` entry is renamed or removed, the build should fail with a message naming it, not render an empty link. Task 2 tests this.
2. **Phone widths:** at 375px, the longest title ("Development Team Lead & Senior Frontend Developer") and the introduction must wrap without a horizontal scrollbar. Task 3 checks this in the browser.
3. **Light theme periods:** `text-muted-foreground` is stone-300 on white, the same as the footer's copyright line; the periods must still be legible. Task 3 checks both themes in the browser.
4. **Header and footer overlap:** from `md` the transparent sticky header and footer sit over the page; the large text scrolling behind them must stay readable at the top and bottom of the page. Task 3 checks this in the browser.
5. **Two lines for the same company:** Lab Digital appears twice in Working Experience; React keys must stay unique so neither line is dropped. Task 3's test counts 9 roles and checks both Lab Digital lines.

---

### Task 1: The section component and its text sizes

**Files:**
- Modify: `src/app/globals.css` (the first `@theme` block)
- Create: `src/components/about-section.tsx`
- Test: `src/components/about-section.test.tsx`

**Interfaces:**
- Produces: `AboutSection({ title: string, children: ReactNode })`, rendering `<section>` with an `<h2>` and a `<ul>` around `children`; the Tailwind classes `text-intro` and `text-item`.

- [ ] **Step 1: Write the failing test**

`src/components/about-section.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AboutSection } from './about-section'

describe('AboutSection', () => {
  it('renders its title as a level-2 heading', () => {
    render(
      <AboutSection title="Companies I Worked With">
        <li>Toyota</li>
      </AboutSection>,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Companies I Worked With' }),
    ).toBeInTheDocument()
  })

  it('renders its items in a list', () => {
    render(
      <AboutSection title="Companies I Worked With">
        <li>Toyota</li>
        <li>Hanno</li>
      </AboutSection>,
    )
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['Toyota', 'Hanno'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/about-section.test.tsx`
Expected: FAIL, because `./about-section` doesn't exist.

- [ ] **Step 3: Add the text sizes**

In `src/app/globals.css`, in the first `@theme` block, after the `--font-mono` declaration:

```css
  /* The about page's text, scaled with the window: the introduction and
     headings, and the items under them */
  --text-intro: clamp(1.75rem, 2.8vw, 3.5rem);
  --text-intro--line-height: 1.3;
  --text-item: clamp(1.375rem, 2.3vw, 2.875rem);
  --text-item--line-height: 1.3;
```

- [ ] **Step 4: Write the component**

`src/components/about-section.tsx`:

```tsx
import type { ReactNode } from 'react'

type AboutSectionProps = {
  title: string
  // The section's <li> elements
  children: ReactNode
}

export const AboutSection = ({ title, children }: AboutSectionProps) => (
  <section className="mt-[6.5em] font-bold text-intro">
    <h2>{title}</h2>
    <ul className="mt-[1.2em] flex flex-col gap-[1.2em] pl-[2.4em] text-item">
      {children}
    </ul>
  </section>
)
```

The `em` values follow the font size of the element they're on: the section's margin is in introduction sizes, the list's in item sizes.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/about-section.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add src/app/globals.css src/components/about-section.tsx src/components/about-section.test.tsx
git commit -m "feat: add a section component for the about page" -m "Refs #63" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 2: Contact links from the layout content

**Files:**
- Create: `src/lib/contact-links.ts`
- Test: `src/lib/contact-links.test.ts`
- Modify: `src/components/link-list.tsx` (extract the target attributes)

**Interfaces:**
- Produces:
  - `getContactLinks({ contact, social }: { contact: Link[]; social: Link[] }): Link[]`, where `Link = { name: string; url: string }`, returning Email, LinkedIn and GitHub in that order, or throwing `Error('content/layout.json has no <description> link')`.
  - `getLinkTargetProps(url: string)`, exported from `src/components/link-list.tsx`: `{ target: '_self' }` for `mailto:` and `tel:` links, otherwise `{ rel: 'noopener noreferrer', target: '_blank' }`.

- [ ] **Step 1: Write the failing test**

`src/lib/contact-links.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { getContactLinks } from './contact-links'

const layout = {
  contact: [{ name: 'koen@vanesterik.dev', url: 'mailto:koen@vanesterik.dev' }],
  social: [
    { name: 'github', url: 'https://github.com/vanesterik' },
    { name: 'linkedin', url: 'https://www.linkedin.com/in/kdesterik/' },
  ],
}

describe('getContactLinks', () => {
  it('names email, LinkedIn and GitHub for display, in that order', () => {
    expect(getContactLinks(layout)).toEqual([
      { name: 'Email', url: 'mailto:koen@vanesterik.dev' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/in/kdesterik/' },
      { name: 'GitHub', url: 'https://github.com/vanesterik' },
    ])
  })

  it('fails, naming the link, when one is missing', () => {
    expect(() =>
      getContactLinks({ ...layout, social: [layout.social[0]] }),
    ).toThrow('content/layout.json has no linkedin link')
    expect(() => getContactLinks({ ...layout, contact: [] })).toThrow(
      'content/layout.json has no email link',
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/contact-links.test.ts`
Expected: FAIL, because `./contact-links` doesn't exist.

- [ ] **Step 3: Write the helper**

`src/lib/contact-links.ts`:

```ts
type Link = {
  name: string
  url: string
}

/**
 * Get the about page's contact links, named for display: email, LinkedIn and
 * GitHub, taken from the footer's links in content/layout.json. A missing link
 * fails the build instead of rendering an empty one.
 */
export const getContactLinks = ({
  contact,
  social,
}: {
  contact: Link[]
  social: Link[]
}): Link[] => [
  {
    name: 'Email',
    url: findUrl(contact, ({ url }) => url.startsWith('mailto:'), 'email'),
  },
  {
    name: 'LinkedIn',
    url: findUrl(social, ({ name }) => name === 'linkedin', 'linkedin'),
  },
  {
    name: 'GitHub',
    url: findUrl(social, ({ name }) => name === 'github', 'github'),
  },
]

const findUrl = (
  links: Link[],
  matches: (link: Link) => boolean,
  description: string,
) => {
  const link = links.find(matches)

  if (!link) throw new Error(`content/layout.json has no ${description} link`)

  return link.url
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/contact-links.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Share the footer's link targets**

In `src/components/link-list.tsx`, replace the inline spread

```tsx
            {...(isAlternativeLink(url)
              ? { target: '_self' }
              : { rel: 'noopener noreferrer', target: '_blank' })}
```

with

```tsx
            {...getLinkTargetProps(url)}
```

and add, below `isAlternativeLink`:

```tsx
/**
 * Open email and phone links in the same tab, and other links in a new one
 */
export const getLinkTargetProps = (url: string) =>
  isAlternativeLink(url)
    ? { target: '_self' }
    : { rel: 'noopener noreferrer', target: '_blank' }
```

Run: `npx vitest run src/components/link-list.test.tsx`
Expected: PASS, unchanged.

- [ ] **Step 6: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add src/lib/contact-links.ts src/lib/contact-links.test.ts src/components/link-list.tsx
git commit -m "feat: build the about page's contact links from the layout content" -m "Refs #63" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 3: The about page

**Files:**
- Create: `content/about.json`
- Modify: `src/app/about/page.tsx` (replace "coming soon")
- Test: `src/app/about/page.test.tsx`
- Modify: `CLAUDE.md` (architecture)

**Interfaces:**
- Consumes: `AboutSection` and the `text-intro` and `text-item` classes (Task 1); `getContactLinks` and `getLinkTargetProps` (Task 2); `tagline`, `contact` and `social` from `content/layout.json`.

- [ ] **Step 1: Write the failing test**

`src/app/about/page.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import layout from '@/content/layout.json'

import Page from './page'

const getSectionItems = (name: string) => {
  const section = screen
    .getByRole('heading', { level: 2, name })
    .closest('section') as HTMLElement
  return within(section).getAllByRole('listitem')
}

describe('About page', () => {
  it('has a page heading for screen readers', () => {
    render(<Page />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'About' }),
    ).toBeInTheDocument()
  })

  it('introduces Koen as an applied data scientist', () => {
    render(<Page />)
    expect(
      screen.getByText(/^I’m an applied data scientist with a master’s degree/),
    ).toBeInTheDocument()
  })

  it('opens the second paragraph with the tagline from the layout content', () => {
    render(<Page />)
    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.tagName === 'P' &&
            element.textContent?.startsWith(`${layout.tagline.join(' ')} That loop`),
        ),
      ),
    ).toBeInTheDocument()
  })

  it('lists working experience, one line per company, newest first', () => {
    render(<Page />)
    const roles = getSectionItems('Working Experience')
    expect(roles).toHaveLength(9)
    expect(roles[0]).toHaveTextContent(
      'Data ScientistProvincie Utrecht2026 – Present',
    )
    expect(roles[8]).toHaveTextContent('Creative InternTribal DDB Shanghai2012')
    // Both Lab Digital lines are there
    expect(
      roles.filter((role) => role.textContent?.includes('Lab Digital')),
    ).toHaveLength(2)
  })

  it('lists the companies Koen worked with', () => {
    render(<Page />)
    const companies = getSectionItems('Companies I Worked With')
    expect(companies).toHaveLength(11)
    expect(companies.map((company) => company.textContent)).toContain(
      'Nutricia',
    )
  })

  it('links email, LinkedIn and GitHub to the layout content', () => {
    render(<Page />)
    const links = getSectionItems('Get In Touch').map((item) =>
      within(item).getByRole('link'),
    )
    expect(links.map((link) => link.textContent)).toEqual([
      'Email',
      'LinkedIn',
      'GitHub',
    ])
    expect(links[0]).toHaveAttribute('href', layout.contact[0].url)
    expect(links[0]).toHaveAttribute('target', '_self')
    expect(links[1]).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/kdesterik/',
    )
    expect(links[1]).toHaveAttribute('target', '_blank')
    expect(links[1]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('has only the three agreed sections', () => {
    render(<Page />)
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(['Working Experience', 'Companies I Worked With', 'Get In Touch'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/about/page.test.tsx`
Expected: FAIL, as the page still renders "coming soon" and has no headings.

- [ ] **Step 3: Write the content**

`content/about.json`:

```json
{
  "intro": "I’m an applied data scientist with a master’s degree to match, building on more than a decade of experience in front-end development.",
  "afterTagline": "That loop took me from building interfaces to building with data, and the craft of the first now shapes how I do the second.",
  "experience": [
    {
      "title": "Data Scientist",
      "company": "Provincie Utrecht",
      "period": "2026 – Present"
    },
    {
      "title": "Data Science Intern",
      "company": "Provincie Utrecht",
      "period": "2025 – 2026"
    },
    {
      "title": "Development Team Lead & Senior Frontend Developer",
      "company": "Lab Digital",
      "period": "2022 – 2024"
    },
    {
      "title": "Product Owner",
      "company": "Flex IT Distribution",
      "period": "2021"
    },
    {
      "title": "Senior Frontend Developer",
      "company": "LeasePlan",
      "period": "2018 – 2021"
    },
    {
      "title": "Designer & Creative Developer",
      "company": "Jungle Minds",
      "period": "2017 – 2018"
    },
    {
      "title": "Art Director, Designer & Creative Developer",
      "company": "Lab Digital",
      "period": "2016 – 2017"
    },
    {
      "title": "Digital Director & Partner",
      "company": "Flip-Flop Interactive",
      "period": "2013 – 2016"
    },
    {
      "title": "Creative Intern",
      "company": "Tribal DDB Shanghai",
      "period": "2012"
    }
  ],
  "companies": [
    "Provincie Utrecht",
    "Lab Digital",
    "Flex IT Distribution",
    "LeasePlan",
    "Jungle Minds",
    "Flip-Flop Interactive",
    "Tribal DDB Shanghai",
    "Amstel Gold Race",
    "Hanno",
    "Nutricia",
    "Toyota"
  ]
}
```

- [ ] **Step 4: Write the page**

`src/app/about/page.tsx`:

```tsx
import type { Metadata } from 'next'

import { AboutSection } from '@/components/about-section'
import { getLinkTargetProps } from '@/components/link-list'
import { getContactLinks } from '@/lib/contact-links'
import about from '@/content/about.json'
import layout from '@/content/layout.json'

export const metadata: Metadata = {
  title: 'About',
}

export default function Page() {
  return (
    <div className="md:mr-[10%] md:ml-[45%]">
      {/* The large introduction isn't a heading, so the page's heading is only
          for screen readers */}
      <h1 className="sr-only">About</h1>
      <div className="flex flex-col gap-[1.15em] font-bold text-intro">
        <p>{about.intro}</p>
        <p>{`${layout.tagline.join(' ')} ${about.afterTagline}`}</p>
      </div>
      <AboutSection title="Working Experience">
        {about.experience.map(({ title, company, period }) => (
          <li key={`${company} ${period}`}>
            <p>{title}</p>
            <p>{company}</p>
            <p className="mt-[0.4em] font-mono font-normal text-muted-foreground text-xs uppercase">
              {period}
            </p>
          </li>
        ))}
      </AboutSection>
      <AboutSection title="Companies I Worked With">
        {about.companies.map((company) => (
          <li key={company}>{company}</li>
        ))}
      </AboutSection>
      <AboutSection title="Get In Touch">
        {getContactLinks(layout).map(({ name, url }) => (
          <li key={name}>
            <a
              className="hover:text-highlight"
              href={url}
              {...getLinkTargetProps(url)}
            >
              {name}
            </a>
          </li>
        ))}
      </AboutSection>
    </div>
  )
}
```

Biome sorts the imports on commit; let it.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/app/about/page.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 6: Update the architecture in `CLAUDE.md`**

- In the code block, change the `content/` line to:

  ```
  content/          layout.json (menu, theme options, contact, social links, tagline, copyright), about.json (about page), posts/*.md
  ```

- In "Layout and content are data-driven", add a sentence: "The about page (`src/app/about/page.tsx`) renders `content/about.json` in `AboutSection`s, and takes its tagline and its Email, LinkedIn and GitHub links from `content/layout.json` (`src/lib/contact-links.ts`), so they live in one place."

- [ ] **Step 7: Check it in the browser and tune the spacing**

With `npm run dev` (or Koen's running dev server) at `/about/`:

- **Wide screen (1512px):** the column starts at about 45% of the width; the introduction is about 42px, items about 35px; compare the spacing with https://camillemormal.com/about and adjust the `em` values in `about-section.tsx` and `page.tsx` if needed.
- **Phone (375px):** the column uses the full width, the longest title and the introduction wrap, and the page has no horizontal scrollbar (`document.documentElement.scrollWidth === innerWidth`).
- **Both themes:** the periods are legible in light and dark.
- **Header and footer:** from `md`, scrolling the page behind them keeps the text readable at the top and bottom.
- **Console:** no errors or React key warnings.

- [ ] **Step 8: Run the checks and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add content/about.json src/app/about/page.tsx src/app/about/page.test.tsx CLAUDE.md
git commit -m "feat: replace the about page's coming soon with Koen's introduction, experience and contact" -m "Refs #63" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

Then update the pull request description with the commit list, mark it ready and wait for CI.
