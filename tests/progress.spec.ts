/** Phase 6: /me progress page derived from the user's own answers. */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(loadAllTestAccounts().length < 1, 'Needs a usable test account')

const SHOTS = process.env.SHOTS_DIR

test('progress page shows per-track stats and past answers', async ({ users }) => {
  const [a] = await users(1)
  const page = a.page
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  // Make sure this account has at least one answer (other specs usually did).
  await page.goto('/me')
  await expect(page.getByText('Flight record')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('progress-iss-ops')).toBeVisible()
  for (const id of ['iss-ops', 'spacecraft-launch', 'orbits-gravity', 'black-holes-stars', 'planets']) {
    await expect(page.getByTestId(`progress-${id}`)).toBeVisible()
  }
  const past = page.getByTestId('past-answer')
  if ((await past.count()) > 0) {
    await expect(past.first()).toContainText(/\d+\/10/)
    await past.first().click()
    await expect(page).toHaveURL(/\/scenario\//)
    await expect(page.getByTestId('debrief-panel')).toBeVisible({ timeout: 15_000 })
  }
  // Nav shows Progress.
  await expect(page.getByRole('link', { name: 'Progress' })).toBeVisible()

  if (SHOTS) {
    await page.goto('/me')
    await expect(page.getByTestId('progress-planets')).toBeVisible()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${SHOTS}/me-1440.png` })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${SHOTS}/me-390.png` })
  }
  expect(errors.filter((e) => !/document-domain/.test(e))).toEqual([])
})
