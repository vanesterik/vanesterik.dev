import { type Flow, pause, smoothScroll } from './record.ts'

// A card on the Adidas page that's a shoe, by its name; the page's picks
// are personalised, so the first card may be a shirt
const SHOE =
  /trainer|court|samba|gazelle|campus|superstar|stan smith|runfalcon|boot|shoe|ultraboost|forum|handball/i

/**
 * Sports Direct's storefront: from the homepage, through a search for Adidas,
 * to a shoe, its colors, photos and sizes, into the bag, and the bag itself.
 * Never checked out
 */
export default {
  start: 'https://www.sportsdirect.com/',

  prepare: async (page) => {
    const reject = page.locator('#onetrust-reject-all-handler')
    if (await reject.isVisible().catch(() => false)) await reject.click()
    // OneTrust's cookie settings button floats over every page
    await page.addStyleTag({
      content: '#ot-sdk-btn-floating { display: none !important }',
    })
    await pause(page, 1000)
  },

  play: async (page) => {
    // The homepage, down and back up
    await pause(page, 800)
    await smoothScroll(page, 1600, 2200)
    await pause(page, 400)
    await smoothScroll(page, 'top', 1800)
    await pause(page, 500)

    // A search for Adidas
    const search = page.getByRole('textbox', {
      name: 'Search product or brand',
    })
    await search.click()
    await pause(page, 400)
    await search.pressSequentially('Adidas', { delay: 120 })
    await pause(page, 500)
    await search.press('Enter')
    await page.waitForURL(/adidas/i)
    await page.waitForLoadState('networkidle')
    await pause(page, 800)

    // Down the Adidas page to a shoe
    const cards = page.locator('a[href*="colcode"]')
    await cards.first().waitFor()
    const names = await cards.allInnerTexts()
    const shoe = cards.nth(
      Math.max(
        0,
        names.findIndex((name) => SHOE.test(name)),
      ),
    )
    await smoothScroll(page, shoe, 2000)
    await pause(page, 700)
    await shoe.click()

    // The shoe: another color, a few photos, a size, into the bag
    const colors = page.locator(
      'xpath=//*[starts-with(normalize-space(text()), "Colour:")]/following::button[.//img]',
    )
    await colors.first().waitFor()
    await pause(page, 1200)
    await colors.nth(1).click()
    await pause(page, 1200)
    const thumbs = page.locator('button[class*="_thumb"]')
    for (const index of [1, 2, 3]) {
      await thumbs.nth(index).click()
      await pause(page, 800)
    }
    await page
      .locator('button[class*="fullWidth"]:not([class*="disabled"])')
      .first()
      .click()
    await pause(page, 900)
    await page.getByRole('button', { name: /add to bag/i }).click()
    await pause(page, 1800)

    // The bag
    await page.getByRole('link', { name: 'cart button' }).click()
    await page.waitForLoadState('networkidle')
    await pause(page, 2000)
  },
} satisfies Flow
