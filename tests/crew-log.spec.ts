/**
 * Phase 3 Crew Log, three real signed-in users (deepspace/testing fixture):
 *   A submits first, B submits second, C never submits (the excluded user).
 * Proves on the WIRE (WebSocket frames + /api bodies), not just in the UI:
 *   - before submitting, B receives none of A's answer; C never does
 *   - the server refuses B's debrief/upvote before B submits
 *   - after both submit, answers and upvotes appear live for both (no reload)
 *   - self-upvote and double upvote are refused
 *   - the Crew Log is anonymous: "Crew member N" by submission order, "You"
 *     for your own entry, and no other user's name or email ever reaches a
 *     browser (no `displayName` on answers at all)
 */
import type { Page } from '@playwright/test'
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(loadAllTestAccounts().length < 3, 'Needs 3 usable test accounts named Crew A, Crew B, Crew C')

const SHOTS = process.env.SHOTS_DIR

function wireTap(page: Page) {
  const frames: string[] = []
  let jwt = ''
  page.on('websocket', (ws) => ws.on('framereceived', (f) => frames.push(String(f.payload))))
  page.on('response', async (res) => {
    if (!res.url().includes('/api/')) return
    const body = await res.text().catch(() => '')
    frames.push(body)
    const m = /"token":"(eyJ[^"]+)"/.exec(body)
    if (m) jwt = m[1]
  })
  return { frames, bearer: () => `Bearer ${jwt}` }
}

async function transmit(page: Page, text: string) {
  await page.getByRole('textbox').fill(text)
  await page.getByTestId('transmit-button').click()
  await expect(page.getByTestId('debrief-panel')).toBeVisible({ timeout: 30_000 })
}

test('Crew Log visibility, live sync, and upvote rules', async ({ users }) => {
  test.setTimeout(120_000)
  const [a, b, c] = await users(['Crew A', 'Crew B', 'Crew C'])
  const tapA = wireTap(a.page)
  const tapB = wireTap(b.page)
  const tapC = wireTap(c.page)
  const run = Date.now().toString(36)
  const markerA = `ALPHA-${run} thrust retrograde to drop into a lower faster orbit then phase forward`
  const markerB = `BRAVO-${run} lower the orbit with a retrograde burn, phase, then raise with a Hohmann transfer`

  // A opens a fresh briefing; B and C open the same scenario before anyone submits.
  await a.page.goto('/track/orbits-gravity')
  await a.page.getByTestId('request-briefing').click()
  await a.page.waitForURL(/\/scenario\//, { timeout: 30_000 })
  const scenarioPath = new URL(a.page.url()).pathname
  await Promise.all([b.page.goto(scenarioPath), c.page.goto(scenarioPath)])
  for (const p of [b.page, c.page]) {
    await expect(p.getByTestId('transmit-button')).toBeVisible({ timeout: 20_000 })
    await expect(p.getByTestId('crew-log-locked')).toBeVisible()
  }

  // A submits.
  await transmit(a.page, markerA)
  await expect(a.page.getByTestId('crew-entry')).toHaveCount(1, { timeout: 15_000 })
  const answerA = await a.page.locator('[data-testid=crew-entry][data-own]').getAttribute('data-answer-id')
  expect(answerA).toBeTruthy()

  // B has NOT submitted: nothing of A's answer reaches B, and the server refuses B.
  await b.page.waitForTimeout(2500)
  expect(tapB.frames.join('\n')).not.toContain(`ALPHA-${run}`)
  await expect(b.page.getByTestId('crew-log-locked')).toBeVisible()
  const debriefB = await b.page.request.post('/api/actions/getDebrief', {
    headers: { Authorization: tapB.bearer() },
    data: { scenarioId: scenarioPath.split('/').pop() },
  })
  expect(await debriefB.json()).toMatchObject({ success: false, error: /transmit your answer first/i })
  const earlyVote = await b.page.request.post('/api/actions/upvote', {
    headers: { Authorization: tapB.bearer() },
    data: { answerId: answerA },
  })
  expect(await earlyVote.json()).toMatchObject({ success: false, error: /transmit your own answer/i })

  // B submits: B now sees A's answer, and A sees B's answer arrive live (no reload).
  await transmit(b.page, markerB)
  await expect(b.page.getByText(`ALPHA-${run}`)).toBeVisible({ timeout: 15_000 })
  await expect(a.page.getByText(`BRAVO-${run}`)).toBeVisible({ timeout: 15_000 })
  await expect(a.page.getByTestId('crew-entry')).toHaveCount(2)
  await expect(b.page.getByTestId('crew-entry')).toHaveCount(2)

  // Anonymous labels: A answered first, B second. Own entry reads "You".
  const label = (p: Page, sel: string) => p.locator(`[data-testid=crew-entry]${sel} [data-testid=crew-label]`)
  await expect(label(a.page, '[data-own]')).toHaveText('You')
  await expect(label(b.page, '[data-own]')).toHaveText('You')
  await expect(label(a.page, ':not([data-own])')).toHaveText('Crew member 2')
  await expect(label(b.page, ':not([data-own])')).toHaveText('Crew member 1')
  for (const [viewer, other] of [[a, b], [b, a]] as const) {
    await expect(viewer.page.getByTestId('crew-log')).not.toContainText(other.name)
  }

  // A upvotes B via the UI; B sees the count change live.
  const bEntryOnA = a.page.locator('[data-testid=crew-entry]', { hasText: `BRAVO-${run}` })
  await bEntryOnA.getByTestId('upvote-button').click()
  const bEntryOnB = b.page.locator('[data-testid=crew-entry][data-own]')
  await expect(bEntryOnB.getByTestId('upvote-count')).toHaveText('1', { timeout: 15_000 })
  await expect(bEntryOnA.getByTestId('upvote-button')).toHaveAttribute('aria-pressed', 'true')

  // Own answer: button disabled, and the server refuses a forged self-upvote.
  const ownOnA = a.page.locator('[data-testid=crew-entry][data-own]')
  await expect(ownOnA.getByTestId('upvote-button')).toBeDisabled()
  const self = await a.page.request.post('/api/actions/upvote', {
    headers: { Authorization: tapA.bearer() },
    data: { answerId: answerA },
  })
  expect(await self.json()).toMatchObject({ success: false, error: /own answer/i })

  // Double upvote refused.
  const answerB = await bEntryOnA.getAttribute('data-answer-id')
  const twice = await a.page.request.post('/api/actions/upvote', {
    headers: { Authorization: tapA.bearer() },
    data: { answerId: answerB },
  })
  expect(await twice.json()).toMatchObject({ success: false, error: /already upvoted/i })

  // C never submitted: none of either answer ever reached C.
  await c.page.waitForTimeout(1500)
  const cWire = tapC.frames.join('\n')
  expect(cWire).not.toContain(`ALPHA-${run}`)
  expect(cWire).not.toContain(`BRAVO-${run}`)
  await expect(c.page.getByTestId('crew-log-locked')).toBeVisible()

  // Privacy on the WIRE: no browser ever received another user's name or
  // email, and answers carry no displayName field at all.
  const taps = [
    { who: a, tap: tapA },
    { who: b, tap: tapB },
    { who: c, tap: tapC },
  ]
  for (const { who, tap } of taps) {
    const wire = tap.frames.join('\n')
    expect(wire).not.toContain('"displayName"')
    for (const other of [a, b, c].filter((u) => u !== who)) {
      expect(wire, `${who.name}'s browser received ${other.name}'s name`).not.toContain(other.name)
      expect(wire, `${who.name}'s browser received ${other.name}'s email`).not.toContain(other.email)
    }
  }

  if (SHOTS) {
    await a.page.getByTestId('crew-log').scrollIntoViewIfNeeded()
    await a.page.waitForTimeout(800)
    await a.page.screenshot({ path: `${SHOTS}/crew-1440.png` })
    await b.page.setViewportSize({ width: 390, height: 844 })
    await b.page.getByTestId('crew-log').scrollIntoViewIfNeeded()
    await b.page.waitForTimeout(800)
    await b.page.screenshot({ path: `${SHOTS}/crew-390.png` })
  }
})
