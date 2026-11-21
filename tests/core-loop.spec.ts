/**
 * Phase 2 core loop (AI_MODE=mock): request briefing -> read -> transmit ->
 * debrief. Also proves the answer key is not on the wire before submitting,
 * and that the server rejects double submits, oversize answers, and
 * unauthenticated action calls.
 */
import type { Page } from '@playwright/test'
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import { MOCK_SCENARIOS } from '../src/server/mock-data'

test.skip(loadAllTestAccounts().length < 1, 'Needs a usable test account (npx deepspace test accounts create ...)')

const SHOTS = process.env.SHOTS_DIR

/** Record every WS frame and /api response body the page receives. */
function wireTap(page: Page) {
  const received: string[] = []
  let bearer = ''
  page.on('websocket', (ws) => ws.on('framereceived', (f) => received.push(String(f.payload))))
  page.on('request', (req) => {
    const auth = req.headers()['authorization']
    if (auth?.startsWith('Bearer ') && req.url().includes('/api/actions/')) bearer = auth
  })
  page.on('response', async (res) => {
    if (!res.url().includes('/api/')) return
    try {
      received.push(await res.text())
    } catch {
      /* body unavailable for redirects */
    }
  })
  return { received, getBearer: () => bearer }
}

const KEY_SNIPPETS = MOCK_SCENARIOS.map((s) => s.correctAnswer.slice(0, 60))

test('core loop: briefing, transmit, debrief; key hidden until submit', async ({ users }) => {
  test.setTimeout(90_000)
  const [a] = await users(1)
  const page = a.page
  const tap = wireTap(page)
  const consoleErrors: string[] = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  await page.goto('/track/iss-ops')
  await expect(page.getByRole('heading', { name: 'ISS Operations' })).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('request-briefing').click()
  await page.waitForURL(/\/scenario\//, { timeout: 30_000 })
  await expect(page.getByText('Incoming transmission')).toBeVisible()
  await expect(page.getByTestId('transmit-button')).toBeVisible()
  // Phase 4: briefing cites reputable sources as real external links.
  await expect(page.getByText('Grounded in', { exact: true })).toBeVisible()
  const firstSource = page.locator('article a[target=_blank]').first()
  await expect(firstSource).toHaveAttribute('href', /^https:\/\/([a-z0-9-]+\.)*(nasa\.gov|esa\.int|eso\.org|stsci\.edu|grc\.nasa\.gov)\//)
  await expect(firstSource).toHaveAttribute('rel', /noopener/)
  if (SHOTS) {
    await page.waitForTimeout(3500)
    await page.screenshot({ path: `${SHOTS}/scenario-brief-1440.png`, fullPage: true })
  }

  // ── Security: nothing key-related has reached this browser yet ──
  // (Column NAMES appear in the SDK's records.list_schemas metadata; that is
  // schema shape, not data. We assert no key DATA and no key RECORDS arrive.)
  const before = tap.received.join('\n')
  expect(before).not.toContain('"collection":"answerKeys"')
  expect(before).not.toMatch(/"correctAnswer":"[^"]/)
  for (const snippet of KEY_SNIPPETS) expect(before).not.toContain(snippet)

  // ── Transmit ──
  await page
    .getByRole('textbox')
    .fill(
      'First everyone puts on masks and respirators. We account for all crew, evacuate to the Russian segment and close the hatch. I call Houston so the ground can isolate the loop, and we sample the air before anyone re-enters.',
    )
  await page.getByTestId('transmit-button').click()
  await expect(page.getByTestId('debrief-panel')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Expert approach', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /Score \d+ out of 10/ })).toBeVisible()
  if (SHOTS) {
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${SHOTS}/scenario-debrief-1440.png`, fullPage: true })
  }

  // ── Server rejects a second submit and oversize text ──
  const scenarioId = page.url().split('/scenario/')[1]
  const bearer = tap.getBearer()
  expect(bearer).not.toBe('')
  const again = await page.request.post('/api/actions/submitAnswer', {
    headers: { Authorization: bearer },
    data: { scenarioId, text: 'A second try at the same mission, which must be refused.' },
  })
  expect(await again.json()).toMatchObject({ success: false, error: /already transmitted/i })

  const huge = await page.request.post('/api/actions/submitAnswer', {
    headers: { Authorization: bearer },
    data: { scenarioId, text: 'x'.repeat(1501) },
  })
  expect(await huge.json()).toMatchObject({ success: false, error: /1500/ })

  // ── Revisit shows the stored debrief ──
  await page.reload()
  await expect(page.getByTestId('debrief-panel')).toBeVisible({ timeout: 20_000 })

  expect(consoleErrors.filter((e) => !/document-domain/.test(e))).toEqual([])
})

test('signed-out callers cannot trigger actions (no integration spend)', async ({ request }) => {
  for (const name of ['generateScenario', 'submitAnswer', 'getDebrief']) {
    const res = await request.post(`/api/actions/${name}`, { data: { track: 'planets' } })
    expect(res.status()).toBe(401)
  }
  const direct = await request.post('/api/integrations/anthropic/chat-completion', {
    data: { messages: [{ role: 'user', content: 'hi' }] },
  })
  expect([401, 403]).toContain(direct.status())
})

test('mobile layout of a scenario', async ({ users }) => {
  test.skip(!SHOTS, 'screenshots only')
  const [a] = await users(1)
  await a.page.setViewportSize({ width: 390, height: 844 })
  await a.page.goto('/track/iss-ops')
  await a.page.getByTestId('mission-row').first().click()
  await expect(a.page.getByText('Incoming transmission')).toBeVisible({ timeout: 15_000 })
  await a.page.waitForTimeout(2500)
  await a.page.screenshot({ path: `${SHOTS}/scenario-390.png`, fullPage: true })
  await a.page.goto('/track/iss-ops')
  await expect(a.page.getByTestId('mission-row').first()).toBeVisible({ timeout: 15_000 })
  await a.page.screenshot({ path: `${SHOTS}/track-390.png`, fullPage: true })
})
