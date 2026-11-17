---

name: writing-blog-posts
description: Use when writing, drafting, outlining, restructuring or editing a blog post for vanesterik.dev (a Markdown file in content/posts/), or when asked to make a draft "sound like me", match the voice of the other posts, or turn notes, a project or a fix into a post.
---

# Writing blog posts for vanesterik.dev

## Overview

Every post is a practical write-up of one small, real thing Koen built or figured out, told in his voice: a dry, first-person, tongue-in-cheek account where the humor comes from being painfully honest about how petty, mundane or slightly absurd the problem is. Think Louis C.K. on a Tuesday: deadpan, self-aware, escalating the specifics of a tiny annoyance until it is funny, then getting the technical part exactly right.

**Core principle:** the jokes are observations, never gags. The reader leaves with something that works (a command, a pattern, a tool) and the feeling that a real person was mildly irritated by it first.

Reference posts (read both before writing): `content/posts/shipping-image-datasets-off-a-mac.md` and `content/posts/letting-claude-do-my-bookkeeping.md`.

## The structure

A post has these parts, in this order. Section names are plain and specific, never clever-for-clever's-sake.

1. **Front matter.** `title`: plain words saying what the post is about, optionally with a deadpan aside (`Letting Claude do my bookkeeping (while I say yes)`, `… without the junk`). `date`: `YYYY-MM-DD`. `description`: one sentence, what it is and why the reader might care. No `# H1` in the body: the title is the heading.
2. **The cold open (no heading, 2 to 3 paragraphs).** Start inside the recurring chore or situation, with concrete, slightly repetitive detail ("The phone bill is telecom at 21%, again. The train ticket is travel at 9%, again."). Then the honest confession of motive: the petty, human reason this was worth doing ("I have a slight OCD streak", "it's the dullest kind of work there is"). Admit the sensible shortcut and why you didn't take it ("Now, I _could_ just…"). End with "So I…" and what you ended up with, linking the repo if there is one.
3. **The concept in one section.** Define the thing the reader needs before the rest makes sense, briefly: `## MCP in one paragraph`, `## The junk we're talking about`. Bulleted terms with a bold lead and a personified, one-line explanation ("Finder's little notebook about how you like the folder to look").
4. **The body: how it works, step by step.** Numbered steps (`## Step 1: see what you're dealing with`) or the flow of the thing (`## How a booking flows`), with a drawing where a picture helps (see Pictures below). After every non-trivial code block or diagram comes **"What's going on:"** and a bullet list, one bullet per flag, party or part, each with a bold or code lead.
5. **The thing that caught me out (optional).** Only when there was a real gotcha; never invent one to fill the slot, and leave it out when the author doesn't want it. Tell it as a small story with exact numbers ("I packed 52,210 PNG tiles … and found 52,211 `._` files sitting next to them. One for every image, plus one for the folder."). Introduce it plainly: "Here's the thing that caught me out." / "One thing I didn't see coming:". Then the fix, and why it works.
6. **Trust, but verify / guardrails.** How you know it worked, or what stops it from going wrong. Bullets with bold leads stating the rule, then one sentence of why.
7. **What this is really about (optional).** One or two paragraphs that step back and hand the idea to the reader, ending on a short list of _their_ likely chores ("Your energy meter's export. The spreadsheet you update every month."). Only when the post has a point bigger than its tool.
8. **The cheat sheet.** `## The cheat sheet`: everything the reader would copy, in one place, ready to paste. Commented `shell` block for commands; `###` per task with a `text` block for prompts.
9. **The closer.** "That's it." followed by one or two short sentences: a deadpan punchline that calls back to the opening confession ("but my brain sleeps better knowing the folder is images and nothing but images", "My accountant hasn't noticed a thing. Which, for bookkeeping, is exactly the point.").

## The voice

| Do                                                  | Example                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| First person, plain words, short sentences          | "So this is the command:"                                                      |
| Confess the petty motive, early and without apology | "I'll be honest: I have a slight OCD streak"                                   |
| Rhythm of repetition for tedium                     | "…VAT-free, again."                                                            |
| Personify files, tools and systems, once each       | "`._cat_0001.jpg` ghosts", "a buddy called", "twins"                           |
| Understatement for the stakes                       | "Lovely. On to packing."                                                       |
| Exact, specific numbers and names                   | "a couple of thousand lines", "52,211"                                         |
| Italic for a single stressed word, underscores      | "how _little_ it took"                                                         |
| Deadpan parenthetical warnings                      | "(Always run the `-print` version first. `-delete` doesn't ask twice.)"        |
| Address the reader as "you" when handing over       | "you can give it to an LLM as a tool, with your rules around it"               |
| Honest about the split between human and machine    | "great at the conversation … and terrible at being trusted blindly with money" |

The absurdist edge is a matter of **escalating precision**, not of punchlines: describe the dull thing more exactly than anyone should, take your own pettiness completely seriously, and let the gap between the effort and the stakes do the work. One dry beat per section is plenty; a paragraph of pure technique with no joke is fine.

## House rules

- American spelling ("color", "behavior").
- No em dashes. Use a colon, a full stop or parentheses instead.
- Headings are `##` and `###`, sentence case, no punctuation at the end.
- Bulleted explanations start with a **bold** or `code` lead, then a colon or full stop.
- Code fences always name a language (`shell`, `text`, `python`, `mermaid`). Commands are real and tested; say which OS when it matters.
- **Pictures** are drawn with the `beelddenker:beelddenker` skill as hand-made SVGs in `content/posts/<slug>/<name>.svg`, put in the post as an image on its own line: `![Alt text, the title](<slug>/<name>.svg "One or two sentences describing the picture")`. The build draws it inline (`src/lib/rehype-svg.ts`), so it uses the drawing classes in `src/app/globals.css` (`box`, `tag`, `band`, `line`, `arrowhead`, `small`, `dashed`, `gate`, and `me` (warm) and `claude` (cool) as the one color dimension) and recolors with the theme. Draw at most 632 wide, the post column; a missing file or alt text fails the build.
- **A photo or screenshot** (JPEG, PNG, WebP, GIF, AVIF) goes in `public/posts/<slug>/<name>.jpg`, 800 wide where the source allows (it shows at 800 on wide screens, and a smaller file is stretched), and in the post as an image on its own line with a path from the root of `public/`: `![Alt text](/posts/<slug>/<name>.jpg "Caption")`. The title becomes a visible caption (`src/lib/rehype-image.ts`). Keep the file small: re-encode it (`ffmpeg -i in.jpg -q:v 4 out.jpg`) before committing.
- Mermaid still works for a quick diagram, but a drawing is the default. Mermaid diagrams need an `accTitle:` line (and an `accDescr:`), use only flowchart, state, sequence, class, ER or XY chart, and curly quotes (“ ”) in labels, never straight double quotes. Otherwise the build fails.
- Link the repo or docs inline, the first time the thing is named.
- The file name is the URL slug: `content/posts/<lowercase-hyphenated-title>.md`.

## Common mistakes

| Mistake                                                          | Fix                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Opening with context or a definition ("MCP is a protocol that…") | Open in the chore. Definitions go in section 3.                             |
| Jokes that are puns, pop-culture nods or "lol" asides            | Replace with an honest observation about the situation.                     |
| Hype ("game-changer", "supercharge", "seamless")                 | Say what it does and how long it takes now.                                 |
| A gotcha without numbers                                         | Give the count, the file, the error. Specificity is the joke and the proof. |
| Code with no "What's going on:" after it                         | Explain each flag or part in a bullet.                                      |
| No cheat sheet, or one that isn't copy-pasteable                 | Collect every command or prompt, ready to paste.                            |
| Ending on a summary ("In this post we saw…")                     | "That's it." and a callback to the opening confession.                      |
| Humor that bends the facts                                       | Facts win. Cut the joke.                                                    |

## Checklist before handing over a draft

- [ ] Front matter has `title`, `date`, `description`; no `# H1`
- [ ] Cold open: chore, confession, "I could just…", "So I…"
- [ ] Concept section, body with "What's going on:"
- [ ] A gotcha, if there is one, is real and has numbers
- [ ] Verify or guardrails section
- [ ] Cheat sheet, then "That's it." and a callback closer
- [ ] No em dashes, American spelling, pictures as SVG drawings with alt text and a description
- [ ] `npm run build` passes (a broken post fails the build with its file name)
- [ ] `npm run lint` passes: Biome formats posts too (it wants an empty line after the opening `---`); `npx biome check --write <post>` fixes it
