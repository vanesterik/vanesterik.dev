import rehypeShiki from '@shikijs/rehype'
import { toHtml } from 'hast-util-to-html'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { beforeAll, describe, expect, it } from 'vitest'

import { rehypeMermaid } from './rehype-mermaid'

const render = async (markdown: string) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeMermaid)
    .use(rehypeShiki, {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
  return toHtml(await processor.run(processor.parse(markdown)))
}

const diagram = (title = 'A flow', body = 'A->>B: hi') =>
  `\`\`\`mermaid\nsequenceDiagram\n  accTitle: ${title}\n  accDescr: A talks to B\n  ${body}\n\`\`\`\n`

const ids = (html: string) =>
  [...html.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id)

const references = (html: string) =>
  [...html.matchAll(/url\(#([^)]+)\)/g)].map(([, id]) => id)

describe('rehypeMermaid', () => {
  // The first render loads Shiki's grammars, themes and engine, which can take
  // longer than one test's timeout on a cold CI runner
  beforeAll(async () => {
    await render('```text\nwarm up\n```\n')
  }, 30_000)

  it('draws a mermaid fence as an accessible SVG', async () => {
    const html = await render(diagram())
    expect(html).toContain('<figure class="mermaid"><svg')
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-labelledby="mermaid-1-title"')
    expect(html).toContain('aria-describedby="mermaid-1-desc"')
    expect(html).toContain('<title id="mermaid-1-title">A flow</title>')
    expect(html).toContain('<desc id="mermaid-1-desc">A talks to B</desc>')
    expect(html).not.toContain('<pre')
  })

  it("colors it with the site's tokens, without fetching fonts", async () => {
    const classDiagram =
      '```mermaid\nclassDiagram\n  accTitle: Classes\n  A <|-- B\n```\n'
    for (const html of [await render(diagram()), await render(classDiagram)]) {
      expect(html).toContain('var(--background)')
      expect(html).toContain('var(--foreground)')
      expect(html).toContain('var(--muted-foreground)')
      expect(html).not.toContain('@import')
      expect(html).not.toContain('fonts.googleapis.com')
      // The import's URL has semicolons; nothing of it may break the rules
      expect(html).not.toContain('display=swap')
      expect(html).toMatch(/<style>\s*(\.mono \{[^}]*\}\s*)?svg \{/)
    }
  })

  it('gives every diagram its own ids', async () => {
    const html = await render(`${diagram()}\n${diagram('Another flow')}`)
    expect(new Set(ids(html)).size).toBe(ids(html).length)

    const svgs = html.match(/<svg[\s\S]*?<\/svg>/g) ?? []
    expect(svgs).toHaveLength(2)
    svgs.forEach((svg, index) => {
      expect(ids(svg).length).toBeGreaterThan(0)
      for (const id of ids(svg)) {
        expect(id.startsWith(`mermaid-${index + 1}-`)).toBe(true)
      }
      expect(references(svg).length).toBeGreaterThan(0)
      for (const reference of references(svg)) {
        expect(ids(svg)).toContain(reference)
      }
    })
  })

  it('keeps curly quotes in labels', async () => {
    expect(await render(diagram('A flow', 'A->>B: “Book Q3”'))).toContain(
      '“Book Q3”',
    )
  })

  it('takes everything after accTitle: as the title', async () => {
    expect(await render(diagram('  How: a flow  '))).toContain(
      '<title id="mermaid-1-title">How: a flow</title>',
    )
  })

  it('requires an accTitle', async () => {
    await expect(
      render('```mermaid\nsequenceDiagram\n  A->>B: hi\n```\n'),
    ).rejects.toThrow('a mermaid diagram needs an "accTitle:" line')
  })

  it("fails on a diagram type it can't draw", async () => {
    await expect(
      render('```mermaid\npie\n  accTitle: x\n  "a": 1\n```\n'),
    ).rejects.toThrow('Invalid mermaid header')
  })

  it('leaves other code blocks to Shiki', async () => {
    expect(await render('```text\nplain\n```\n')).toContain('<pre class="shiki')
  })
})
