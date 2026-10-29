import type { Page } from '@playwright/test'

import { type Flow, pause, smoothScroll } from './record.ts'

// Drag the mouse from one point to another in small steps, as a hand would
const drag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps: number,
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps })
  await page.mouse.up()
}

// The centre of an element on screen
const centre = async (page: Page, selector: string, index = 0) => {
  const box = await page.locator(selector).nth(index).boundingBox()
  if (!box) throw new Error(`LeasePlan: no ${selector} on the page`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * LeasePlan's showroom, now Ayvens': from the showroom into the first car and
 * its first edition, turning it, trying its colors, and changing the lease so
 * the price follows
 */
export default {
  start: 'https://www.ayvens.com/nl-nl/zakelijk-leasen-showroom/',

  prepare: async (page) => {
    await page.getByRole('button', { name: 'Weiger Alle Cookies' }).click()
    // Ayvens' cookie settings button floats over every page; not their site
    await page.addStyleTag({
      content: '.ot-floating-button { display: none !important }',
    })
    await pause(page, 1000)
  },

  play: async (page) => {
    const firstCar = page
      .getByRole('button', { name: /Bekijk uitvoeringen/ })
      .first()

    // The showroom, down and back up to the first car
    await pause(page, 800)
    await smoothScroll(page, 1500, 2000)
    await pause(page, 400)
    await smoothScroll(page, firstCar, 1800)
    await pause(page, 600)
    await firstCar.click()

    // The car's page, down to its editions and back
    await page.getByRole('heading', { name: /Kies de uitvoering/ }).waitFor()
    await pause(page, 800)
    const firstEdition = page.locator('a[href*="/onze-autos/"]').first()
    await smoothScroll(page, 1000, 1300)
    await pause(page, 400)
    await smoothScroll(page, firstEdition, 1200)
    await pause(page, 500)
    await firstEdition.click()

    // The edition: turn the car all the way round, then its colors
    const turnLeft = page.getByRole('button', {
      name: 'Draai de auto tegen de klok in',
    })
    await turnLeft.waitFor()
    await pause(page, 1000)
    await drag(page, { x: 1000, y: 430 }, { x: 300, y: 430 }, 50)
    await drag(page, { x: 1000, y: 430 }, { x: 300, y: 430 }, 50)
    await pause(page, 600)
    const colors = page.locator('button.colorButton')
    for (const index of [1, 2, 0]) {
      await colors.nth(index).click()
      await pause(page, 800)
    }

    // The buy zone: duration and mileage, then a few extras
    await smoothScroll(page, 560, 1200)
    await pause(page, 600)
    const duration = await centre(page, '[role="slider"]', 0)
    await drag(page, duration, { x: duration.x - 160, y: duration.y }, 40)
    await pause(page, 1000)
    const mileage = await centre(page, '[role="slider"]', 1)
    await drag(page, mileage, { x: mileage.x + 160, y: mileage.y }, 40)
    await pause(page, 1000)
    // By name, as the page has other checkbox lists further down; one at a
    // time, as two at once grow the buy zone and push the next out of view
    for (const extra of [
      'Winterbanden',
      'Winterbanden',
      'Laadpakket',
      'Laadpakket',
    ]) {
      await page.locator('label', { hasText: extra }).first().click()
      await pause(page, 700)
    }
    await pause(page, 800)
  },
} satisfies Flow
