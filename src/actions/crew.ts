/**
 * Crew Log access: keep every answer's `crew` list equal to the full set of
 * users who have submitted for the scenario. `read: 'shared'` on `answers`
 * turns that list into "you can read this once you have submitted".
 *
 * Called right after a new answer is created. Re-querying AFTER the create
 * makes two simultaneous submits converge: the DO serializes writes, so the
 * later reconcile always sees both rows. The DO re-checks read access on each
 * update and pushes newly readable rows to connected clients (live Crew Log).
 */

import type { AnswerData } from '../lib/types'
import { asArray, type Ctx } from './shared'

export async function syncCrew(ctx: Ctx, scenarioId: string): Promise<void> {
  const res = await ctx.tools.query<AnswerData>('answers', { where: { scenarioId }, limit: 500 })
  if (!res.success) throw new Error(`crew sync query failed: ${res.error}`)

  const crew = [...new Set(res.data.records.map((r) => r.data.userId))].sort()
  const updates = res.data.records
    .filter((r) => {
      const current = asArray<string>(r.data.crew)
      return current.length !== crew.length || crew.some((id) => !current.includes(id))
    })
    .map((r) => ctx.tools.update('answers', r.recordId, { crew }))

  const results = await Promise.all(updates)
  const failed = results.find((r) => !r.success)
  if (failed && !failed.success) throw new Error(`crew sync update failed: ${failed.error}`)
}
