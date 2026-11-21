// Dev helper: signed-in screenshot of one element on any origin.
// Usage: node tests/tools/shot-auth.mjs <baseURL> <path> <out.png> <width> <height> <selector> [account]
import { chromium } from '@playwright/test'
import { chromiumLaunchOptions, findTestAccountByName, newSignedInContext } from 'deepspace/testing'
const [baseURL, path, out, w, h, selector, account = 'Crew C'] = process.argv.slice(2)
const browser = await chromium.launch(chromiumLaunchOptions())
const ctx = await newSignedInContext(browser, findTestAccountByName(account), baseURL)
const page = await ctx.newPage()
await page.setViewportSize({ width: +w, height: +h })
await page.goto(`${baseURL}${path}`)
const el = page.locator(selector).first()
await el.waitFor({ timeout: 20000 })
await page.waitForTimeout(1200)
await el.screenshot({ path: out })
await browser.close()
