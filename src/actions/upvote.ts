/**
 * upvote(answerId)
 *
 * Rules (all enforced here, server-side; the DO's `uniqueOn` backs up #3):
 *  1. the answer exists
 *  2. you have submitted for that scenario (you can only upvote what you may read)
 *  3. one upvote per user per answer
 *  4. no upvoting your own answer
 * The count is recomputed from the upvotes table, so concurrent votes cannot
 * drift it, and the answer update is pushed live to the crew.
 */

import type { ActionResult } from 'deepspace/worker'
import type { AnswerData, UpvoteData } from '../lib/types'
import { fail, guarded, stringParam, type Ctx } from './shared'

export async function upvote(ctx: Ctx): Promise<ActionResult<{ upvoteCount: number }>> {
  return guarded<{ upvoteCount: number }>('upvote', async () => {
    const answerId = stringParam(ctx.params, 'answerId')
    if (!answerId) return fail('Missing answer.')

    const target = await ctx.tools.get<AnswerData>('answers', answerId)
    if (!target.success) return fail('That answer does not exist.')
    const answer = target.data.record.data

    if (answer.userId === ctx.userId) return fail('You cannot upvote your own answer.')

    const mine = await ctx.tools.query<AnswerData>('answers', {
      where: { scenarioId: answer.scenarioId, userId: ctx.userId },
      limit: 1,
    })
    if (!mine.success) return fail('Could not check your answer.')
    if (mine.data.count === 0) return fail('Transmit your own answer before voting.')

    const existing = await ctx.tools.query<UpvoteData>('upvotes', { where: { answerId, userId: ctx.userId }, limit: 1 })
    if (!existing.success) return fail('Could not check your votes.')
    if (existing.data.count > 0) return fail('You already upvoted this answer.')

    const vote: UpvoteData = { answerId, scenarioId: answer.scenarioId, userId: ctx.userId }
    const created = await ctx.tools.create('upvotes', vote)
    if (!created.success) {
      if (/duplicate/i.test(created.error)) return fail('You already upvoted this answer.')
      return fail('Could not record your vote. Try again.')
    }

    const all = await ctx.tools.query<UpvoteData>('upvotes', { where: { answerId }, limit: 1000 })
    const upvoteCount = all.success ? all.data.count : (answer.upvoteCount ?? 0) + 1
    await ctx.tools.update('answers', answerId, { upvoteCount })
    return { success: true, data: { upvoteCount } }
  })
}
