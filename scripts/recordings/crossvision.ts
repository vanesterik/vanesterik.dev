import type { Page } from '@playwright/test'

import { type Flow, pause, smoothScroll } from './record.ts'

// CrossVision's front end, started with task dev in self-supervised-models
const START = 'http://localhost:5173/runs'

// Hover each point of a chart in turn, left to right
const hoverPoints = async (page: Page, chart: number, ms: number) => {
  const points = page
    .locator('svg.recharts-surface')
    .nth(chart)
    .locator('circle.recharts-dot')
  const boxes = await Promise.all(
    (await points.all()).map((point) => point.boundingBox()),
  )
  const ordered = boxes
    .filter((box) => box !== null)
    .sort((a, b) => a.x - b.x || a.y - b.y)
  for (const box of ordered) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 4,
    })
    await pause(page, ms)
  }
}

// Back to the top, then a section of the navigation
const navigate = async (page: Page, section: string) => {
  await smoothScroll(page, 'top', 700)
  await page.getByRole('link', { name: section, exact: true }).click()
  await page.waitForLoadState('networkidle')
}

/**
 * CrossVision, on a local run: a run's training charts, a dataset and its
 * tiles, a prediction and its annotations, and the color palettes
 */
export default {
  start: START,

  check: async () => {
    await fetch(START).catch(() => {
      throw new Error(
        "CrossVision isn't running: start it with task dev in self-supervised-models",
      )
    })
  },

  prepare: async (page) => {
    await pause(page, 800)
  },

  play: async (page) => {
    // The first run, and its training charts
    await pause(page, 1000)
    await page
      .locator('a[href^="/runs/"]:not([href="/runs/new"])')
      .first()
      .click()
    await page.locator('svg.recharts-surface').first().waitFor()
    await pause(page, 800)
    await hoverPoints(page, 0, 180)
    await smoothScroll(page, page.locator('svg.recharts-surface').nth(1), 900)
    await hoverPoints(page, 1, 110)
    await page.mouse.move(1300, 450)
    await pause(page, 500)

    // The first dataset, its sample, and more of its tiles
    await navigate(page, 'Datasets')
    await pause(page, 700)
    await page
      .locator('a[href^="/datasets/"]:not([href="/datasets/new"])')
      .first()
      .click()
    await page.getByText('Sample', { exact: true }).waitFor()
    await pause(page, 700)
    await smoothScroll(page, page.getByText('Sample', { exact: true }), 1500)
    await pause(page, 800)
    const more = page.getByRole('button', { name: /Show \d+ more tiles/ })
    await smoothScroll(page, more, 1000)
    await pause(page, 400)
    await more.click()
    await pause(page, 600)
    await smoothScroll(page, 'bottom', 1500)
    await pause(page, 600)

    // The first prediction, down through its annotations
    await navigate(page, 'Predictions')
    await pause(page, 700)
    await page
      .locator('a[href^="/predictions/"]:not([href="/predictions/new"])')
      .first()
      .click()
    await page.waitForLoadState('networkidle')
    await pause(page, 1000)
    // The annotations are a grid of tiles: down to its last one, not the
    // cards under it
    const tiles = page.locator('main img')
    await tiles.first().waitFor()
    await smoothScroll(page, tiles.last(), 4000, 'end')
    await pause(page, 600)

    // The settings, through the color palettes
    await navigate(page, 'Settings')
    await pause(page, 800)
    for (const palette of [
      'Solarized Light',
      'GitHub Light',
      'Catppuccin Mocha',
      'Nord',
      'Tokyo Night',
      'Dracula',
    ]) {
      await page.getByText(palette, { exact: true }).click()
      await pause(page, 700)
    }
    await pause(page, 600)
  },
} satisfies Flow
