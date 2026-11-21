/**
 * TEMPORARY: one-off removal of the test data left in production by the
 * Crew A / Crew B test accounts. Removed again right after it has run.
 *
 * Safe by construction:
 * - It can only delete the record ids hard-coded below. No query result ever
 *   decides what gets deleted.
 * - It reads every scenario, answer, upvote and answer-key id and refuses to
 *   delete anything if a record exists that is not on the expected list.
 *   It returns ids only, never answer-key content. It never reads `users`.
 * - Default is a dry run; deleting needs mode "delete" plus a confirm phrase.
 * - Callable only by the app owner or the two test accounts that made the data.
 */

import type { ActionResult } from 'deepspace/worker'
import { fail, guarded, type Ctx } from './shared'

const TEST_ACCOUNTS = new Set(['PvV2D4wZstKl28viwa3IAavykDQDkuDA', 'PHC8vGEYgQTgY43LJMYQhZDPKOjLIjqP'])

/** Kept: the live-generated Huygens scenario and its answer key. */
const KEEP_SCENARIO = '20044c43-b2ea-44f6-aed6-c2dbf8616ef8'

/** The five mock-era scenarios (their answer keys share these ids). */
const MOCK_SCENARIOS = [
  '796017a6-a202-456b-83b0-c54c439f66e5',
  '1aeb43c1-cab1-4d99-9547-5329459fde64',
  'c91db551-4d17-4557-9725-11b5b47956b1',
  '622cb508-a945-4839-825e-0899aca33e3a',
  'c6351c48-2e28-47a8-a6e2-384ea590b0fc',
]

const DELETE = {
  upvotes: ['1795253878163_f7wr9u', '1795252706069_rgceyg'],
  answers: [
    '1795253641177_6y28i5',
    '1795253778543_h6raex',
    '1795253435912_vj0a7s',
    '1795253176288_xsm1yg',
    '1795252923350_vgvqid',
    '1795252701328_uwh7ft',
    '1795252705252_42bajx',
    '1795251626008_jz54cr',
    '1795253753832_9i7s6g',
  ],
  answerKeys: MOCK_SCENARIOS,
  scenarios: MOCK_SCENARIOS,
} as const

/** Every record expected to exist right now, per collection. */
const EXPECTED: Record<keyof typeof DELETE, Set<string>> = {
  upvotes: new Set(DELETE.upvotes),
  answers: new Set(DELETE.answers),
  answerKeys: new Set([...MOCK_SCENARIOS, KEEP_SCENARIO]),
  scenarios: new Set([...MOCK_SCENARIOS, KEEP_SCENARIO]),
}

/** Deletion order: votes, answers, answer keys, scenarios. */
const ORDER = ['upvotes', 'answers', 'answerKeys', 'scenarios'] as const
const CONFIRM = 'DELETE-ORBIT-LAB-TEST-DATA'

type CollectionReport = { total: number; toDelete: number; missing: string[]; unexpected: string[] }
type Report = { mode: 'dry-run' | 'delete'; ok: boolean; collections: Record<string, CollectionReport>; deleted?: Record<string, number> }

async function inspect(ctx: Ctx): Promise<Record<string, CollectionReport>> {
  const out: Record<string, CollectionReport> = {}
  for (const name of ORDER) {
    const res = await ctx.tools.query(name, { limit: 5000 })
    if (!res.success) throw new Error(`could not read ${name}`)
    const ids = new Set(res.data.records.map((r) => r.recordId))
    out[name] = {
      total: ids.size,
      toDelete: DELETE[name].filter((id) => ids.has(id)).length,
      missing: DELETE[name].filter((id) => !ids.has(id)),
      unexpected: [...ids].filter((id) => !EXPECTED[name].has(id)),
    }
  }
  return out
}

export async function cleanupTestData(ctx: Ctx): Promise<ActionResult<Report>> {
  return guarded<Report>('cleanupTestData', async () => {
    if (ctx.userId !== ctx.env.OWNER_USER_ID && !TEST_ACCOUNTS.has(ctx.userId)) return fail('Not allowed.')
    const mode = ctx.params.mode === 'delete' ? 'delete' : 'dry-run'

    const collections = await inspect(ctx)
    const ok = Object.values(collections).every((c) => c.unexpected.length === 0)
    console.log(`[cleanupTestData] ${mode} ok=${ok} ${JSON.stringify(collections)}`)
    if (mode === 'dry-run' || !ok) return { success: true, data: { mode, ok, collections } }

    if (ctx.params.confirm !== CONFIRM) return fail('Missing confirm phrase.')
    const deleted: Record<string, number> = {}
    for (const name of ORDER) {
      deleted[name] = 0
      for (const id of DELETE[name]) {
        if (collections[name].missing.includes(id)) continue
        const r = await ctx.tools.remove(name, id)
        if (!r.success) return fail(`Stopped: could not delete ${name}/${id}: ${r.error}`)
        deleted[name]++
      }
    }
    console.log(`[cleanupTestData] deleted ${JSON.stringify(deleted)}`)
    return { success: true, data: { mode, ok, collections, deleted } }
  })
}
