/**
 * Acceptance: "Bad JSON from the model shows an error, not a crash."
 * Only meaningful when the worker runs with AI_MOCK_BAD_JSON="true" (set it in
 * wrangler.toml locally, run with BAD_JSON_MODE=1, then set it back).
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(process.env.BAD_JSON_MODE !== '1', 'Run with BAD_JSON_MODE=1 and AI_MOCK_BAD_JSON="true"')
test.skip(loadAllTestAccounts().length < 1, 'Needs a usable test account')

test('malformed model output: friendly inline errors, page keeps working', async ({ users }) => {
  test.setTimeout(60_000)
  const [a] = await users(1)
  const page = a.page
  const crashes: string[] = []
  page.on('pageerror', (e) => crashes.push(e.message))

  // Generation path: briefing request fails gracefully in place.
  await page.goto('/track/planets')
  await page.getByTestId('request-briefing').click()
  const generated = await Promise.race([
    page.waitForURL(/\/scenario\//, { timeout: 15_000 }).then(() => 'navigated'),
    page.getByRole('alert').filter({ hasText: /garbled transmission/i }).waitFor({ timeout: 15_000 }).then(() => 'error'),
  ])

  if (generated === 'error') {
    await expect(page.getByTestId('request-briefing')).toBeEnabled()
  } else {
    // An unanswered scenario was reused (no model call). Grading path instead:
    const draft = 'Cut power, keep the battery warm, pause driving, and wait for the dust to clear.'
    await page.getByRole('textbox').fill(draft)
    await page.getByTestId('transmit-button').click()
    await expect(page.getByRole('alert').filter({ hasText: /garbled transmission/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('textbox')).toHaveValue(draft) // draft kept
    await expect(page.getByTestId('transmit-button')).toBeEnabled()
  }
  expect(crashes).toEqual([])
})
