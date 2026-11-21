// Production smoke: drive the DEPLOYED app with a test account.
// Usage: node tests/tools/prod-smoke.mjs <baseURL> <outDir> [track]
// Checks: request briefing -> no key data on the wire -> transmit -> debrief,
// console errors, and takes 1440 + 390 screenshots.
import { chromium } from '@playwright/test'
import { chromiumLaunchOptions, findTestAccountByName, newSignedInContext } from 'deepspace/testing'

const [baseURL, outDir, track = 'planets'] = process.argv.slice(2)
const browser = await chromium.launch(chromiumLaunchOptions())
const ctx = await newSignedInContext(browser, findTestAccountByName('Crew A'), baseURL)
const page = await ctx.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const wire = []
const errors = []
page.on('websocket', (ws) => ws.on('framereceived', (f) => wire.push(String(f.payload))))
page.on('response', async (r) => { if (r.url().includes('/api/')) wire.push(await r.text().catch(() => '')) })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))

const step = (msg) => console.log(`- ${msg}`)
try {
  await page.goto(`${baseURL}/track/${track}`)
  await page.getByTestId('request-briefing').waitFor({ timeout: 20000 })
  await page.getByTestId('request-briefing').click()
  await page.waitForURL(/\/scenario\//, { timeout: 60000 })
  await page.getByTestId('transmit-button').waitFor({ timeout: 20000 })
  step(`briefing opened: ${page.url()}`)
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${outDir}/prod-brief-1440.png` })

  const before = wire.join('\n')
  const leaked = before.includes('"collection":"answerKeys"') || /"correctAnswer":"[^"]/.test(before)
  step(`answer key data on the wire before submit: ${leaked ? 'LEAKED' : 'none'}`)

  await page.getByRole('textbox').fill('I would cut power use, enter low power mode to keep the battery warm with heaters, pause driving and science, and wait for tau to fall before a listening campaign to recover the rover.')
  await page.getByTestId('transmit-button').click()
  await page.getByTestId('debrief-panel').waitFor({ timeout: 60000 })
  const score = await page.getByRole('img', { name: /Score/ }).getAttribute('aria-label')
  step(`debrief shown: ${score}`)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${outDir}/prod-debrief-1440.png` })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByTestId('debrief-panel').waitFor({ timeout: 20000 })
  step('revisit shows stored debrief')
  await page.screenshot({ path: `${outDir}/prod-scenario-390.png` })
} catch (e) {
  console.log(`FAILED: ${e.message}`)
  process.exitCode = 1
} finally {
  const real = errors.filter((e) => !/document-domain/.test(e))
  step(`console errors: ${real.length ? real.join(' | ') : 'none'}`)
  await browser.close()
}
