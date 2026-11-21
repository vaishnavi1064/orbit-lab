// Security pass against the DEPLOYED app. Inspects real network payloads.
// Usage: node tests/tools/prod-security.mjs <baseURL> <scenarioId answered by Crew A and Crew B>
import { chromium, request as pwRequest } from '@playwright/test'
import { chromiumLaunchOptions, findTestAccountByName, newSignedInContext } from 'deepspace/testing'

const [baseURL, scenarioId] = process.argv.slice(2)
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
const browser = await chromium.launch(chromiumLaunchOptions())

async function signedIn(name) {
  const ctx = await newSignedInContext(browser, findTestAccountByName(name), baseURL)
  const page = await ctx.newPage()
  const wire = []
  let jwt = ''
  page.on('websocket', (ws) => ws.on('framereceived', (f) => wire.push(String(f.payload))))
  page.on('response', async (r) => {
    if (!r.url().includes('/api/')) return
    const body = await r.text().catch(() => '')
    wire.push(body)
    const m = /"token":"(eyJ[^"]+)"/.exec(body)
    if (m) jwt = m[1]
  })
  return { page, wire, bearer: () => `Bearer ${jwt}` }
}
const post = async (who, path, data) => (await who.page.request.post(`${baseURL}${path}`, { headers: { Authorization: who.bearer() }, data })).json()

try {
  // 1. Unauthenticated callers
  const anon = await pwRequest.newContext()
  for (const a of ['generateScenario', 'submitAnswer', 'upvote', 'getDebrief']) {
    const r = await anon.post(`${baseURL}/api/actions/${a}`, { data: { track: 'planets', scenarioId, answerId: 'x', text: 'x' } })
    check(`unauthenticated POST /api/actions/${a} rejected`, r.status() === 401, `HTTP ${r.status()}`)
  }
  for (const [ep, body] of [
    ['anthropic/chat-completion', { messages: [{ role: 'user', content: 'hi' }] }],
    ['exa/search', { query: 'mars' }],
    ['fal/run-model', { model_id: 'fal-ai/flux/schnell', input: { prompt: 'x' } }],
  ]) {
    const r = await anon.post(`${baseURL}/api/integrations/${ep}`, { data: body })
    check(`unauthenticated POST /api/integrations/${ep} rejected`, r.status() === 401 || r.status() === 403, `HTTP ${r.status()}`)
  }

  // 2. Crew C has NOT answered this scenario: inspect what reaches C's browser.
  const A = await signedIn('Crew A')
  await A.page.goto(`${baseURL}/scenario/${scenarioId}`)
  await A.page.getByTestId('crew-entry').first().waitFor({ timeout: 20000 })
  const entries = await A.page.locator('[data-testid=crew-entry]').evaluateAll((els) =>
    els.map((e) => ({ id: e.getAttribute('data-answer-id'), own: e.hasAttribute('data-own'), text: e.querySelector('p')?.textContent ?? '' })),
  )
  const mine = entries.find((e) => e.own)
  const theirs = entries.find((e) => !e.own)
  const debriefA = await post(A, '/api/actions/getDebrief', { scenarioId })
  const keySnippet = debriefA.success ? debriefA.data.correctAnswer.slice(0, 50) : '__no_key__'
  console.log(`      (scenario has ${entries.length} answers; key snippet captured from A's own debrief)`)

  const C = await signedIn('Crew C')
  await C.page.goto(`${baseURL}/scenario/${scenarioId}`)
  await C.page.getByTestId('transmit-button').waitFor({ timeout: 20000 })
  await C.page.waitForTimeout(4000)
  const cWire = C.wire.join('\n')
  check('C (not submitted) received no answerKeys records', !cWire.includes('"collection":"answerKeys"'))
  check('C (not submitted) received no correct-answer text', !cWire.includes(keySnippet))
  for (const e of entries) {
    check(`C received none of answer ${e.id?.slice(0, 8)}'s text`, !cWire.includes(e.text.slice(0, 60)))
  }
  check('C sees the Crew Log locked', await C.page.getByTestId('crew-log-locked').isVisible())
  const cDebrief = await post(C, '/api/actions/getDebrief', { scenarioId })
  check('server refuses C getDebrief (key) before submitting', cDebrief.success === false, cDebrief.error)
  const cVote = await post(C, '/api/actions/upvote', { answerId: theirs?.id })
  check('server refuses C upvote before submitting', cVote.success === false, cVote.error)

  // 3. Server-side rejections for a signed-in user
  const dbl = await post(A, '/api/actions/submitAnswer', { scenarioId, text: 'A second attempt at the same mission which must be refused.' })
  check('double submit refused', dbl.success === false && /already/i.test(dbl.error), dbl.error)
  const big = await post(A, '/api/actions/submitAnswer', { scenarioId, text: 'x'.repeat(1501) })
  check('answer over 1500 chars refused', big.success === false && /1500/.test(big.error), big.error)
  const bad = await post(A, '/api/actions/submitAnswer', { scenarioId, text: { $ne: '' } })
  check('non-string answer refused', bad.success === false, bad.error)
  const self = await post(A, '/api/actions/upvote', { answerId: mine?.id })
  check('self-upvote refused', self.success === false && /own answer/i.test(self.error), self.error)
  const first = await post(A, '/api/actions/upvote', { answerId: theirs?.id })
  const second = await post(A, '/api/actions/upvote', { answerId: theirs?.id })
  check('double upvote refused', second.success === false && /already/i.test(second.error), `first: ${first.success ? 'ok' : first.error}; second: ${second.error}`)
} catch (e) {
  check(`script error: ${e.message}`, false)
} finally {
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  process.exitCode = failed ? 1 : 0
  await browser.close()
}
