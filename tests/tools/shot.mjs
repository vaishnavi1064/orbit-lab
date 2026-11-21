// Dev helper: screenshot a URL (optionally one element) and print console errors.
// Usage: node tests/tools/shot.mjs <url> <out.png> <width> <height> [selector]
import { chromium } from '@playwright/test'
const [url, out, w, h, selector] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
if (selector) await page.locator(selector).first().screenshot({ path: out })
else await page.screenshot({ path: out })
console.log(errors.length ? errors.join('\n') : 'no console errors')
await browser.close()
