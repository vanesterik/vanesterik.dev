import { type Flow, pause, smoothScroll } from './record.ts'

// A card on the Adidas page that's a shoe, by its name; the page's picks
// are personalised, so the first card may be a shirt
const SHOE =
  /trainer|court|samba|gazelle|campus|superstar|stan smith|runfalcon|boot|shoe|ultraboost|forum|handball/i

// What the recording hides; the promo's class starts with a build hash
const HIDDEN =
  '#ot-sdk-btn-floating, [class*="_cmsPopup"] { display: none !important }'

/**
 * Sports Direct's storefront: from the homepage, through a search for Adidas,
 * to a shoe, its colors, photos and sizes, into the bag, and the bag itself.
 * Never checked out
 */
export default {
  start: 'https://www.sportsdirect.com/',
  // The store never stops loading trackers and recommendations
  waitUntil: 'load',

  prepare: async (page) => {
    await page
      .getByRole('textbox', { name: 'Search product or brand' })
      .waitFor()
    // The cookie banner comes in after the page, if it comes
    const reject = page.locator('#onetrust-reject-all-handler')
    await reject
      .waitFor({ timeout: 8000 })
      .then(() => reject.click())
      .catch(() => {})
    // Not the store: OneTrust's floating cookie button, and the site's promo
    // popup ("20% off Full Price"), hidden on this page and every page after
    await page.addStyleTag({ content: HIDDEN })
    await page.addInitScript((css) => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style')
        style.textContent = css
        document.head.append(style)
      })
    }, HIDDEN)
    await pause(page, 1000)
  },

  play: async (page) => {
    // The homepage, down and back up
    await pause(page, 800)
    await smoothScroll(page, 1600, 3000)
    await pause(page, 600)
    await smoothScroll(page, 'top', 2400)
    await pause(page, 700)

    // A search for Adidas
    const search = page.getByRole('textbox', {
      name: 'Search product or brand',
    })
    await search.click()
    await pause(page, 400)
    await search.pressSequentially('Adidas', { delay: 160 })
    await pause(page, 500)
    await search.press('Enter')
    await page.waitForURL(/adidas/i)
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
    await smoothScroll(page, shoe, 2800)
    await pause(page, 900)
    await shoe.click()

    // The shoe: two other colors, keeping the second, a few photos, a size,
    // into the bag
    const colors = page.locator(
      'xpath=//*[starts-with(normalize-space(text()), "Colour:")]/following::button[.//img]',
    )
    await colors.first().waitFor()
    await pause(page, 1200)
    await colors.nth(1).click()
    await pause(page, 1600)
    // The Predator opens in its third swatch, so the fourth is a third color
    await colors.nth((await colors.count()) > 3 ? 3 : 0).click()
    await pause(page, 1600)
    const thumbs = page.locator('button[class*="_thumb"]')
    for (const index of [1, 2, 3, 4, 5, 6]) {
      await thumbs.nth(index).click()
      await pause(page, 1000)
    }
    await page
      .locator('button[class*="fullWidth"]:not([class*="disabled"])')
      .first()
      .click()
    await pause(page, 900)
    await page.getByRole('button', { name: /add to bag/i }).click()
    // Long enough to read the bag's dropdown
    await pause(page, 3500)

    // The bag
    await page.getByRole('link', { name: 'cart button' }).click()
    await page.waitForURL(/cart/)
    await page.waitForLoadState('load')
    await pause(page, 3000)
  },
} satisfies Flow
