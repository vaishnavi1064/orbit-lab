// READ-ONLY inventory of test data on the DEPLOYED app. Signs in as each test
// account and records the WebSocket frames the app's own pages receive, so it
// sees exactly what RBAC lets that account read: its answers (/me), every
// answer on scenarios it is crew for, and its own upvotes (scenario pages).
// Never writes or deletes.
// Usage: node tests/tools/prod-inventory.mjs <baseURL> <outFile.json>
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { chromiumLaunchOptions, findTestAccountByName, newSignedInContext } from 'deepspace/testing'

const [baseURL, outFile] = process.argv.slice(2)
const NAMES = ['Crew A', 'Crew B', 'Crew C']
const browser = await chromium.launch(chromiumLaunchOptions())
const out = { baseURL, at: new Date().toISOString(), accounts: {}, answers: {}, upvotes: {} }

// Walk any JSON frame and collect record envelopes ({ recordId, data }).
function collect(node, sink) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach((n) => collect(n, sink))
  if (typeof node.recordId === 'string' && node.data && typeof node.data === 'object') sink.push(node)
  for (const v of Object.values(node)) collect(v, sink)
}

try {
  for (const name of NAMES) {
    const account = findTestAccountByName(name)
    const ctx = await newSignedInContext(browser, account, baseURL)
    const page = await ctx.newPage()
    const seen = []
    page.on('websocket', (ws) =>
      ws.on('framereceived', (f) => {
        try { collect(JSON.parse(String(f.payload)), seen) } catch { /* binary or non-JSON */ }
      }),
    )
    await page.goto(`${baseURL}/me`)
    await page.waitForTimeout(5000)
    const userId = seen.find((r) => r.data.userId && r.data.text && r.data.displayName)?.data.userId
    const ownScenarioIds = [...new Set(seen.filter((r) => r.data.text && r.data.userId === userId).map((r) => r.data.scenarioId))]
    for (const sid of ownScenarioIds) {
      await page.goto(`${baseURL}/scenario/${sid}`)
      await page.waitForTimeout(3500)
    }
    for (const r of seen) {
      if (typeof r.data.text === 'string' && r.data.scenarioId) out.answers[r.recordId] = r
      else if (r.data.answerId) out.upvotes[r.recordId] = r
    }
    out.accounts[name] = { email: account.email, userId: userId ?? null, scenariosAnswered: ownScenarioIds }
    console.log(`${name}: userId=${userId ?? '(no answers)'}; answered ${ownScenarioIds.length} scenarios`)
    await ctx.close()
  }
  console.log(`total distinct answers seen: ${Object.keys(out.answers).length}; upvotes seen: ${Object.keys(out.upvotes).length}`)
  writeFileSync(outFile, JSON.stringify(out, null, 2))
  console.log(`wrote ${outFile}`)
} catch (e) {
  console.log(`FAILED: ${e.message}`)
  process.exitCode = 1
} finally {
  await browser.close()
}
