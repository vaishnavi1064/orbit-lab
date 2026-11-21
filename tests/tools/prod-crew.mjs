// Production two-user Crew Log check against the DEPLOYED app.
// Usage: node tests/tools/prod-crew.mjs <baseURL> <track>
import { chromium } from '@playwright/test'
import { chromiumLaunchOptions, findTestAccountByName, newSignedInContext } from 'deepspace/testing'

const [baseURL, track = 'black-holes-stars'] = process.argv.slice(2)
const browser = await chromium.launch(chromiumLaunchOptions())
const open = async (name) => {
  const ctx = await newSignedInContext(browser, findTestAccountByName(name), baseURL)
  const page = await ctx.newPage()
  const wire = []
  const errors = []
  page.on('websocket', (ws) => ws.on('framereceived', (f) => wire.push(String(f.payload))))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  return { page, wire, errors }
}
const transmit = async (page, text) => {
  await page.getByRole('textbox').fill(text)
  await page.getByTestId('transmit-button').click()
  await page.getByTestId('debrief-panel').waitFor({ timeout: 60000 })
}
const log = (m) => console.log(`- ${m}`)
const run = Date.now().toString(36)

const A = await open('Crew A')
const B = await open('Crew B')
try {
  await A.page.goto(`${baseURL}/track/${track}`)
  await A.page.getByTestId('request-briefing').click()
  await A.page.waitForURL(/\/scenario\//, { timeout: 60000 })
  const url = A.page.url()
  await B.page.goto(url)
  await B.page.getByTestId('transmit-button').waitFor({ timeout: 20000 })
  log(`both on ${url}`)

  await transmit(A.page, `ALPHA-${run} tidal forces stretch the star and an accretion disk forms`)
  await B.page.waitForTimeout(3000)
  log(`B (not submitted) received A's answer on the wire: ${B.wire.join('').includes(`ALPHA-${run}`) ? 'YES (LEAK)' : 'no'}`)

  await transmit(B.page, `BRAVO-${run} tidal disruption event, the flare fades over months`)
  await B.page.getByText(`ALPHA-${run}`).waitFor({ timeout: 20000 })
  log('B now sees A in the Crew Log')
  await A.page.getByText(`BRAVO-${run}`).waitFor({ timeout: 20000 })
  log('A saw B arrive live, no reload')

  await A.page.locator('[data-testid=crew-entry]', { hasText: `BRAVO-${run}` }).getByTestId('upvote-button').click()
  await B.page.locator('[data-testid=crew-entry][data-own] [data-testid=upvote-count]').filter({ hasText: '1' }).waitFor({ timeout: 20000 })
  log("A's upvote reached B live")
} catch (e) {
  console.log(`FAILED: ${e.message}`)
  process.exitCode = 1
} finally {
  const errs = [...A.errors, ...B.errors].filter((e) => !/document-domain/.test(e))
  log(`console errors: ${errs.length ? errs.join(' | ') : 'none'}`)
  await browser.close()
}
