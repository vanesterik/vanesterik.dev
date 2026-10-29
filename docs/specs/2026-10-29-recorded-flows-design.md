# Recorded flows in web project previews

Status: approved in conversation on 2026-10-29, for story #84.

## Purpose

A web project's preview on `/projects/` is a still screenshot in a `BrowserFrame`. It shows what the site looks like, not what it does. Each web project's preview should instead play a short recording of a flow being clicked through on the site: one continuous take of about 30 seconds that loops, muted and inline.

The recordings are made by scripts kept in this repository, so a recording can be made again when a site changes, instead of being redone by hand.

Success means:
- opening a web project's row plays its flow in the browser frame, sharp on a retina screen;
- the row opens without the preview jumping: the screenshot shown before the video plays is the video's own first frame;
- each recording can be replaced by running one command.

## Non-goals

- Terminal recordings for cli and mcp projects: that's #116 (asciinema).
- A visible cursor in the recordings, or zooming in on clicks.
- Recording in CI. The live sites change and may challenge an automated browser, and CrossVision only runs locally, so the recordings are made on Koen's Mac and committed.
- End-to-end tests. #115 builds them on the Playwright this story adds.

## The flows

Each flow is one continuous take, about 30 seconds, at a calm, human pace: scrolling is smooth, and there are pauses long enough to see what each step did. The steps are Koen's; the timing within the 30 seconds is the builder's.

### Sports Direct (`sports-direct`)

On the live UK site, starting at its homepage, `https://www.sportsdirect.com/` (Koen's choice, after the Irish site refused the headless browser; recorded with a visible window, `HEADED=1`). The project's `url` changes from the trainers page to that homepage, so the browser frame's address matches the first frame, which becomes the new screenshot. _My call_ (the `url`):

1. Scroll down and up on the homepage.
2. Put the focus in the search bar.
3. Type "Adidas".
4. Scroll down on the Adidas page.
5. Click a shoe card.
6. On the shoe's detail page, click a different color.
7. Click the thumbnails in the carousel, so it slides.
8. Click a size.
9. Click the add to bag button.
10. Click the basket icon in the top navigation.

The shoe is added to the bag of an anonymous session, never checked out.

### LeasePlan (`leaseplan`)

On the live site, the project's `url` (Ayvens' showroom, `https://www.ayvens.com/nl-nl/zakelijk-leasen-showroom/`):

1. Scroll down and up on the homepage.
2. Click the first car card.
3. Scroll down and up on its landing page.
4. Click the first edition card.
5. Drag the carousel so the car turns 360 degrees.
6. Click each of the colors.
7. Scroll down until the buy zone on the right is in view.
8. Drag the duration and mileage sliders, so the price updates.
9. Check and uncheck a few of the additional features beneath the sliders, so the price updates.

### CrossVision (`crossvision`)

On a local run of `/Users/vanesterik/Projects/provincie-utrecht/self-supervised-models`, started with `task dev` (the Vite front end and the API on port 8000), with the runs, datasets and predictions already in its `artifacts/`:

1. Click the first run.
2. Hover over the training loss data points, then the recall and precision data points.
3. Click "Datasets" in the top navigation.
4. Click the first dataset.
5. Scroll down to the sample.
6. Click to show more tiles, and scroll down some more.
7. Click "Predictions" in the top navigation.
8. Click the first prediction in the list.
9. Scroll down slowly, to see all its annotations.
10. Click "Settings" in the top navigation.
11. Click through the color palettes.

The script expects `task dev` to be running already and fails with a clear message when the front end doesn't answer; it doesn't start CrossVision itself.

## Decisions

| Topic             | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who records       | Claude makes the first three recordings while building this story; afterwards Koen makes them again himself with the same commands, so the scripts must run on his Mac without Claude: one command per project, and a clear message for anything they need first (CrossVision's `task dev`, ffmpeg)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| All three ship    | The story ships with all three videos and their new screenshots; none is left on its old screenshot (Koen's choice)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Tool              | Playwright (Koen's choice), added as the dev dependency `@playwright/test`, which #115's end-to-end tests then use as their runner. The recordings use its library API (`chromium.launch`, a context with `recordVideo`), not the test runner. Chromium only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Scripts           | One script per project in `scripts/recordings/<slug>.ts`, plus a shared helper for what they all do (launch, record, smooth scroll, pause, close, hand the raw video to the encoder). Run with Node 24's TypeScript support (`node scripts/recordings/<slug>.ts`), one npm script per project or one taking the slug, such as `npm run record -- sports-direct`. _My call_                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Viewport          | 1440 × 900 CSS pixels (16:10, the `BrowserFrame`'s `aspect-[16/10]`), a desktop layout on every site. _My call_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Sharpness         | The video is 1440 × 900 pixels. The preview is at most about 800 CSS pixels wide (the 640px column plus the open row's `lg:-mx-20` breakout), so that's 1.8 video pixels per CSS pixel: about retina-sharp, at a quarter of the pixels of a 2880 × 1800 video. Playwright scales its video down to fit 800 × 800 unless `recordVideo.size` is set, so it's set to 1440 × 900. Koen chose sharp over small files. The first recording is a checkpoint: Claude shows it to Koen before writing the other two scripts, and he judges by eye whether it's sharp enough. If it's too soft, the shared helper captures frames another way (Chromium's screencast through CDP, or screenshots) and encodes those instead, before the other scripts are written. _My call_ (the sizes and the checkpoint) |
| Encoding          | ffmpeg turns the raw WebM into `public/projects/<slug>.mp4`: H.264, `yuv420p`, `+faststart`, no audio track, trimmed to the flow (no blank page at the start, no close at the end), at a quality where text stays crisp. About 5 to 10 MB per video is fine. ffmpeg is a tool on the Mac (`mise use -g ffmpeg`, or Homebrew), not an npm dependency. _My call_                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Loop              | The flow ends where it ends (in the bag, the buy zone, the settings); the video loops back to its first frame. No crossfade. _My call_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Screenshot        | ffmpeg also writes the video's first frame to `public/projects/<slug>.jpg`, replacing today's screenshot (Koen's choice). It's the `poster` of the video and the `image` of the preview, so the frame doesn't change when the video starts. The CrossVision, Sports Direct and LeasePlan screenshots in `public/projects/` are replaced. `sportsdirect.jpg` becomes `sports-direct.jpg`, after the slug. _My call_ (the name)                                                                                                                                                                                                                                                                                                                                                                     |
| Third-party sites | The scripts dismiss cookie banners, choosing the least consent the banner offers. A site that challenges the automated browser (a captcha or a block page) makes the script fail with a clear message; nobody solves captchas in a script                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Content           | `preview.video` (already accepted by `src/lib/projects.ts`) names the video, such as `"/projects/sports-direct.mp4"`. A video needs an `image` (its poster), in the browser frame: `preview.video` without `image`, or with `frame: "terminal"`, fails the build, named by the slug                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| The note          | A new optional `preview.note`: a line in muted grey under the browser frame (`text-xs text-muted-foreground`, in the details' Lausanne). Only LeasePlan has one: "Recorded in 2026; the site has changed since I worked on it." Sports Direct has none: Koen's code is still at work there, especially on the detail page. CrossVision has none. _My call_ (the wording and the field name; `note` is added to `PREVIEW_FIELDS`)                                                                                                                                                                                                                                                                                                                                                                  |
| Playback          | `BrowserFrame` takes an optional `video`. With one, it renders `<video muted loop playsInline poster={image}>` with the video, in place of the `<img>`, the same `aspect-[16/10] w-full object-cover`. It plays by itself (`autoPlay`), except under `prefers-reduced-motion: reduce`, where it shows the poster with the browser's controls, so the visitor can start it. The `BrowserFrame` stays as it looks today: border, dots and address                                                                                                                                                                                                                                                                                                                                                   |
| Loading           | The Accordion renders a row's content only while it's open, so the `<video>` element, and its download, only exist once its row opens. `preload` is left to the browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Hydration         | A deep link (`/projects/<slug>/`) prerenders the open row with its video. The reduced-motion choice can only be known in the browser, so the first render is the same in the static HTML and on the client, and the video starts once it's known it may (`useSyncExternalStore` on the media query, as the theme selector does with the theme). _My call_                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Missing files     | Every file a preview names (`image`, `video`) must exist under `public/`. The check runs where Node's `fs` is available, not in `src/lib/projects.ts`, which stays safe in the browser: in the projects pages at build time, failing the build named by the slug. _My call_ (that images are checked too)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Storybook         | A `BrowserFrame` story with a video, and a `ProjectIndex` or `ProjectDetails` story showing the note. The video plays from `public/` with the base path, as the screenshots do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Documentation     | `CLAUDE.md`: the recordings (how to make one again, what each script expects), `preview.video` and `preview.note`, and ffmpeg as a tool on the Mac                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Left to the builder

- The exact timing and pauses within each 30-second take, and how scrolling is made smooth.
- The selectors each script uses on each site, and how it waits for a page to be ready.
- ffmpeg's exact settings (CRF, preset, trim points), within "text stays crisp" and roughly 5 to 10 MB.
- How the projects pages run the missing-file check, as long as a missing file fails the build with the project's slug.

## Risks

- The live sites change. A script that worked once may break on a later run; it's fixed when a recording is next made, not watched.
- Sports Direct may challenge an automated browser (Koen doesn't expect it to). If it does, the script fails clearly, and the way through is found within this story (for example a visible, non-headless browser), since all three videos ship together.
- CrossVision's flow depends on the data in its local `artifacts/`. Different data makes a different video.
