/**
 * TEMPORARY: one-off removal of the single answer the production smoke run
 * left (Crew A on the ISS "Scrubber Offline During Cabin Repair" scenario).
 * Removed again right after it has run.
 *
 * Safe by construction:
 * - It can only delete the record id hard-coded below. No query result ever
 *   decides what gets deleted.
 * - It reads every scenario, answer, upvote and answer-key id and refuses to
 *   delete anything if a record exists that is not on the expected list.
 *   It returns ids only, never answer-key content. It never reads `users`.
 * - Default is a dry run; deleting needs mode "delete" plus a confirm phrase.
 * - Callable only by the app owner or the two test accounts that made data.
 */

import type { ActionResult } from 'deepspace/worker'
import { fail, guarded, type Ctx } from './shared'

const TEST_ACCOUNTS = new Set(['PvV2D4wZstKl28viwa3IAavykDQDkuDA', 'PHC8vGEYgQTgY43LJMYQhZDPKOjLIjqP'])

const HUYGENS = '20044c43-b2ea-44f6-aed6-c2dbf8616ef8'
const ISS_SCRUBBER = '17bce360-a847-4d30-b04a-d390de828721'

const DELETE = {
  upvotes: [] as string[],
  answers: ['1795282787607_m4y4hd'],
  answerKeys: [] as string[],
  scenarios: [] as string[],
}

/** Every record expected to exist right now, per collection. */
const EXPECTED: Record<keyof typeof DELETE, Set<string>> = {
  upvotes: new Set(),
  answers: new Set(DELETE.answers),
  answerKeys: new Set([HUYGENS, ISS_SCRUBBER]),
  scenarios: new Set([HUYGENS, ISS_SCRUBBER]),
}

const ORDER = ['upvotes', 'answers', 'answerKeys', 'scenarios'] as const
const CONFIRM = 'DELETE-ORBIT-LAB-SMOKE-ANSWER'

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
