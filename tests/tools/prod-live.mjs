// Live-AI check on the DEPLOYED app: generation (exa + anthropic), image job
// (fal), grading (anthropic). Prints the real content for human review.
// Usage: node tests/tools/prod-live.mjs <baseURL> <track> <outDir> [account] [answer]
import { chromium } from '@playwright/test'
import { chromiumLaunchOptions, findTestAccountByName, newSignedInContext } from 'deepspace/testing'

const [baseURL, track, outDir, account = 'Crew A', answer] = process.argv.slice(2)
const browser = await chromium.launch(chromiumLaunchOptions())
const ctx = await newSignedInContext(browser, findTestAccountByName(account), baseURL)
const page = await ctx.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
const errors = []
const actionBodies = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))
page.on('response', async (r) => { if (r.url().includes('/api/actions/')) actionBodies.push(`${r.url().split('/').pop()}: ${(await r.text().catch(() => '')).slice(0, 300)}`) })
const log = (m) => console.log(m)

try {
  await page.goto(`${baseURL}/track/${track}`)
  await page.getByTestId('request-briefing').waitFor({ timeout: 20000 })
  const t0 = Date.now()
  await page.getByTestId('request-briefing').click()
  await page.waitForURL(/\/scenario\//, { timeout: 120000 })
  log(`generateScenario: ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${page.url()}`)
  await page.getByText('Skip to full text').click().catch(() => {})
  const title = await page.locator('#briefing-title').textContent()
  const briefing = await page.locator('article p.sr-only').textContent()
  const sources = await page.locator('article a[target=_blank]').evaluateAll((as) => as.map((a) => `${a.textContent?.trim()} <${a.href}>`))
  log(`\nTITLE: ${title}\nBRIEFING (${briefing?.split(/\s+/).length} words): ${briefing}\nSOURCES:\n  ${sources.join('\n  ') || '(none)'}`)

  const t1 = Date.now()
  const img = await page.getByTestId('scenario-image').waitFor({ state: 'attached', timeout: 90000 }).then(() => true).catch(() => false)
  log(`\nimage: ${img ? `arrived live after ${((Date.now() - t1) / 1000).toFixed(1)}s -> ${await page.getByTestId('scenario-image').getAttribute('src')}` : 'did not arrive in 90s (gradient kept)'}`)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${outDir}/live-brief-${track}.png` })

  const text = answer || 'I would first make sure the crew and hardware are safe, then gather data from telemetry and Mission Control, compare it with the procedures, and make the decision with the most margin, explaining the physics behind it.'
  await page.getByRole('textbox').fill(text)
  const t2 = Date.now()
  await page.getByTestId('transmit-button').click()
  await page.getByTestId('debrief-panel').waitFor({ timeout: 120000 })
  log(`\nsubmitAnswer: ${((Date.now() - t2) / 1000).toFixed(1)}s`)
  const debrief = await page.getByTestId('debrief-panel').innerText()
  log(`DEBRIEF:\n${debrief.slice(0, 1800)}`)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${outDir}/live-debrief-${track}.png`, fullPage: true })
} catch (e) {
  log(`FAILED: ${e.message}`)
  log(actionBodies.join('\n'))
  process.exitCode = 1
} finally {
  const real = errors.filter((e) => !/document-domain/.test(e))
  log(`\nconsole errors: ${real.length ? real.join(' | ') : 'none'}`)
  await browser.close()
}
