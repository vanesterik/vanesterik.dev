---

title: Stopping Claude from grading its own homework
date: 2026-11-16
description: How Unity, a Claude Code plugin, splits a user story over a designer, a builder and a reviewer that don't share a context, and why the hundredth story then looks like the first.
---

Every feature I build with Claude Code goes the same way. I describe what I want. Claude reads the code and proposes a design, and I say yes. It writes a plan, and I say yes. It writes the code and the tests, and the tests pass. Then I ask it to review its own work, and it reviews its own work, and it finds its own work to be very good. Again.

It's not lying. It wrote that code an hour ago, in the same conversation, with all its reasons still in view. Of course it agrees with itself. I'd agree with me too, if I'd just spent an hour explaining myself to me. And the longer a session runs, the more of its own reasoning it carries around, and the less of that reasoning gets questioned.

![Kermit the Frog facing a hooded, darker Kermit: the Evil Kermit meme](/posts/stopping-claude-from-grading-its-own-homework/evil-kermit.jpg "Claude: I’ll review this pull request carefully. Also Claude: you wrote it an hour ago. It’s perfect.")

Now, I _could_ just open a fresh session and ask for a review there. That works. But then I'm the one carrying the design from one window to the next, pasting issue text, remembering which branch was which. Being the clipboard between two AIs is not the job I had in mind. So I built [Unity](https://github.com/vanesterik/unity), a Claude Code plugin that splits a story over roles that don't share a context and don't take each other's word for it. The only thing they share is GitHub: the issue, its pull request and a Project board. (The name comes from Unity, the hive mind in Rick and Morty that assimilates a whole planet. It fits: anything is possible, as long as you align to the workflow.)

## The roles in one paragraph

Each role is named after the board column it works in, and each one is the same model with a different job and a clean memory:

- **Design** is the one I talk to. It reads the codebase, works out the design with me, with numbered acceptance criteria (`AC1`, `AC2`, ...) that can be checked from outside the code, and posts it on the issue. My approval of that posted version is the one human gate in the whole flow.
- **The builder** starts with a fresh context, the design and nothing else. It branches from the latest `main`, plans against that code, and implements the plan task by task, unit tests first, one commit per task. Its pull request maps every criterion to the code and the tests that meet it.
- **The reviewer** starts fresh too. It reads the whole diff once, against the design, runs the tests itself and posts a verdict. It reads the code as someone who has to maintain it next year, which is a person nobody in the first conversation was thinking about.
- **The tester** only shows up when I ask, to test what the shipped stories add up to. It gets its own section below.

## How a story flows

![How a story moves between me, GitHub and Claude](stopping-claude-from-grading-its-own-homework/story-flow.svg "Three lanes over time. I write the story, approve the design and merge. Claude designs with me, then builds and reviews, each with a fresh context. Every handover goes through GitHub: the issue, the design, the card moving to Build, the pull request and the verdict. A blocking verdict sends the story back to build.")

What's going on:

- **Backlog to Design.** `/unity:design <issue>` picks up a story I wrote as a GitHub issue. Changes I ask for go up as a new version of the design (v2, v3), and a design with more than 8 acceptance criteria gets flagged, with the question whether to split it. I decide.
- **Design to Build.** Only on my approval of the posted design. Then I clear the session and run `/unity:ship <issue>`, which starts the builder and then the reviewer, each as its own agent.
- **Review back to Build.** Blocking findings send the story back. Each role runs at most once per `/unity:ship`, so a rework never loops on its own.
- **Review to Done.** I merge with a rebase, so every task stays its own commit on `main`. The pull request says `Closes #<issue>`, and the board's _Item closed_ workflow moves the card to Done.

The nice part about this split: Claude is great at writing code and terrible at doubting code it just wrote. A second Claude that never saw the first one's reasoning has no such problem. It's the same model. It just didn't hear the excuses.

## The boring part that makes it work

Agents are creative, and creativity is the last thing you want in a handover. So everything between the roles is deterministic:

- **Every role reads the same inputs from GitHub,** and checks the board first. A role started on an issue in the wrong column stops.
- **Scripts write the numbers.** Verdicts, coverage and counts are computed by `pipeline.js` from what the roles posted, not typed by an agent who'd like the story to be done.
- **Agents can't ask me anything mid-run.** Where a role needs a decision, it stops and hands back.
- **Every post starts with a hidden marker** (`<!-- role:review -->`), so the next role finds the latest one, and the issue collects a one-line pointer to each result. A year later it reads as a timeline of the story.

## Flying on autopilot

Shipping one story at a time is fine. But once a few designs are approved, my part shrinks to typing `/unity:ship`, waiting, merging, and typing `/unity:ship` again. That's not a job. That's a loop with a person stuck in it.

So Unity can fly on autopilot. `/unity:autopilot` picks up every approved design in the Build column, top first, builds it, reviews it, merges it, and goes back to the column for the next one. It keeps going until Build is empty, and then tells me what it did. I approve the designs; the rest happens while I'm doing something else, like writing about it.

![How autopilot works through the Build column](stopping-claude-from-grading-its-own-homework/autopilot.svg "Approved stories wait in the Build column, top first. Autopilot takes the top one, builds it and reviews it, each with a fresh context, and a script merges it once the reviewer approved it and CI is green. Blocking findings go back to the builder at most twice. Then it takes the next story, from the updated main, until the column is empty and it writes a digest. The first story that gets stuck ends the run and goes back to Design.")

What's going on:

- **Top first.** I set the order by dragging the cards. Stories designed together usually build on each other, so the order matters.
- **From the updated `main`.** Every story starts after the one before it has merged, so its builder plans against code that already has it.
- **The digest.** The run ends with one summary, written by a script: each merged story with its pull request and the commits it landed on `main` (what I'd revert to undo it), where it stopped and why, and what still waits in Build.

## Testing what the stories add up to

Unit tests answer one question: does the code do what the builder meant? They can't tell you whether what the builder meant is what the design said, or whether story twelve quietly broke a promise story four made. For that you need someone who has read the designs, never the code, and pokes at the running system.

That someone is the tester, and it doesn't take part in a story. I run `/unity:test` when I choose, typically at the end of an epic, and it checks what the stories shipped since the last run add up to. It works with two skills, both built on the work of [Tim Lolkema](https://github.com/tlolkema), who wrote about [using agent skills to write Playwright tests](https://tlolkema.substack.com/p/using-agent-skills-to-write-playwright) and [why you should start using agentic testing](https://tlolkema.substack.com/p/why-you-should-start-using-agentic):

![What a test run does](stopping-claude-from-grading-its-own-homework/test-run.svg "The tester reads the designs, explores the running system by hand with test-user-story, and turns its findings into tests with write-system-test. Each test runs five times. A test that passes ends up in a pull request for me to review. A failing one is either the test’s fault, and gets fixed, or the app’s, and becomes a story in Backlog while the failing test stays. It never touches application code.")

### Exploring: test-user-story

The first skill is exploratory testing, the way a person would do it, if that person were extremely patient and kept receipts. Given a story, it:

- **Derives test cases from the acceptance criteria,** each tagged with the criteria it checks (`AC1`, `AC2`). Every criterion gets at least one case. A criterion it can't check from the outside (an email is sent) is marked _untested_, not quietly skipped.
- **Reads the code only to learn how to drive the system,** never to decide what's correct. The criteria decide that. Otherwise you're back to a Claude agreeing with itself, just with extra steps.
- **Drives the real thing** in a browser with `playwright-cli`, or from the command line for a project without one, and adds a few exploratory cases on top: error paths, boundaries, keyboard navigation.
- **Retries a failure once, from a clean state.** Fails again: it's a fail. Passes the second time: it's a pass, marked _flaky_, with what went wrong the first time. Flaky is a finding, not noise.
- **Keeps evidence.** A screenshot at every checkpoint, framed around what proves the step, and looked at before it goes in the report. A screenshot of the top of the page, proving that the page has a top, gets retaken.
- **Doesn't get to write its own verdict.** A script turns the run's data into an HTML report with a coverage table per criterion, and computes the result: any fail is a failure, an untested criterion is incomplete, the rest is a pass.

I can run it by hand on any one story with `/unity:test-user-story <issue>`. Inside `/unity:test`, the tester does the same kind of exploring, but along the flows _across_ stories: where one story's output is another one's input. That's where the interesting bugs live, because no single story owned them.

### Scripting: write-system-test

Exploring finds things once. The second skill makes sure they stay found, by turning a flow into a scripted test. When I set up a project, `/unity:init` asks which kind it writes: **integration** tests in the project's own test framework, **E2E** tests in the browser with Playwright, or both.

- **Tests drive the system the way a user would.** The real process, the real server, the real output. Calling internal functions is unit testing, and that's the builder's job.
- **Every test says what it's for.** Its title starts with "Should", and it's tagged with every issue and criterion it covers (`@issue-42 @AC2`), so a failing test points straight at a promise.
- **For E2E,** state is set up through the API, not by clicking through the UI, and elements are found by role, then label, then placeholder, then text. A component without proper labels doesn't get a clever locator to work around it. It gets reported.
- **Every new test runs five times on its own.** It has to pass all five.

When a test fails, the skill first asks whose fault it is:

- **The test is wrong** (a locator, a missing wait, bad test data): fix the test, run it five times again.
- **The application is wrong:** keep the test as written, failing, and make sure it fails on the criterion and not on its own setup. The tester files a story for it. It never fixes application code, and it never weakens an assertion until the application agrees with it.
- **It passes only sometimes:** report it, with the failure. No retries, no sleeps. A test that needs a nap to pass is telling you something.

The suite is supposed to stay small: one test per flow across stories, plus a smoke set (the system starts with its real configuration, its real data loads, each entry point answers once). So every run also revisits what's there. It keeps what covers a flow, rewrites what no longer matches a design, and deletes what only repeats the unit tests. The changes go on a `test/<date>` branch and pull request, for me to review, and every defect becomes a new story in Backlog, with how to reproduce it. From there it goes through design like any other work.

## Guardrails, because it merges by itself

Autopilot merges without asking me, so it gets some rules, built into the scripts, not just the prompts:

- **One human gate.** My design approval. Nothing reaches Build without it.
- **The merge is a script's call.** `pipeline.js merge` rebase-merges a pull request only when the reviewer's approval is on its head commit and CI is green. It waits up to 8 minutes for running checks.
- **The first stuck story ends the run.** Stories designed together usually depend on each other. A story gets two reworks; after that it's labeled `autopilot:stopped`, gets a comment saying why, and goes back to Design, because that usually means the design didn't hold up.
- **The tester may only write tests.** A hook blocks edits outside the test paths while a run is active. (If a run is interrupted, its marker file stays behind and the builder refuses to start until you delete it. It's not personal.)
- **Where a person must merge, protect `main`.** Autopilot then stops at the refused merge instead of going around it.

It also turned out to be a question of money. A Claude Pro session limit arrived after roughly 6 hours of running the flow. So the builder and tester now run on Sonnet, the reviewer on whatever the session runs, test output comes in a quiet form (failures and totals only), and I ship from a fresh session, because a session that still holds the design conversation sends all of it along again on every turn, for nothing.

## What this is really about

I didn't make Claude smarter. I made it forget. Three copies of the same model, not allowed to talk to each other except through an issue and a pull request, turn out to catch what one copy with a perfect memory waves through. That's not an AI idea. That's just why companies have code review.

So if you have an agent somewhere that checks its own work, it's worth splitting. The agent that writes the tests for the code it just wrote. The one that reviews its own pull request. The one that summarizes its own run and calls it a success. Give the checking to a fresh context, give them a handover that a script can read, and let a column on a board be the only thing they agree on.

## The cheat sheet

Unity builds on [Superpowers](https://github.com/obra/superpowers) and the [GitHub CLI](https://cli.github.com) with access to Projects. The [README](https://github.com/vanesterik/unity#usage) has every step in more detail.

### Install, once per machine

```shell
gh auth refresh -s project
```

```text
/plugin install superpowers@claude-plugins-official
/plugin marketplace add vanesterik/unity
/plugin install unity@unity
```

### Set up a project

Create a GitHub Project whose **Status** field has exactly `Backlog`, `Design`, `Build`, `Review` and `Done`, and turn on its _Item closed_ workflow (set Status to Done) by hand. Then:

```text
/unity:init <owner> <project-number>
```

### Design a story

```text
/unity:design <issue>
```

### Ship it, from a fresh session

```text
/clear
/unity:ship <issue>
```

### Ship and merge every approved story

```text
/clear
/unity:autopilot
```

### See where everything stands

```text
/unity:status
```

### Test the whole project, at the end of an epic

```text
/unity:test
```

`/unity:test --all` reads every shipped story again, for when the suite needs a review from the ground up.

### Explore one story by hand

```text
/unity:test-user-story <issue>
```

### Write integration or E2E tests outside a test run

```text
/unity:write-system-test
```

That's it. My stories now get reviewed by a Claude that has never heard my reasons, or its own. It's the closest I've come to a colleague who doesn't like me, and the code is better for it.
