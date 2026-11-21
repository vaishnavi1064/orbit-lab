/**
 * getDebrief(scenarioId): the caller's feedback plus the answer key, ONLY if
 * the caller has already submitted for this scenario. Used when revisiting.
 */

import type { ActionResult } from 'deepspace/worker'
import type { AnswerData, AnswerKeyData, Debrief, ScenarioData } from '../lib/types'
import { asArray, fail, guarded, stringParam, type Ctx } from './shared'

export async function getDebrief(ctx: Ctx): Promise<ActionResult<Debrief>> {
  return guarded<Debrief>('getDebrief', async () => {
    const scenarioId = stringParam(ctx.params, 'scenarioId')
    if (!scenarioId) return fail('Missing scenario.')

    const mine = await ctx.tools.query<AnswerData>('answers', { where: { scenarioId, userId: ctx.userId }, limit: 1 })
    if (!mine.success) return fail('Could not read your answer.')
    const answer = mine.data.records[0]?.data
    if (!answer) return fail('Transmit your answer first.')

    const [keyRes, scenarioRes] = await Promise.all([
      ctx.tools.get<AnswerKeyData>('answerKeys', scenarioId),
      ctx.tools.get<ScenarioData>('scenarios', scenarioId),
    ])
    if (!keyRes.success || !scenarioRes.success) return fail('Debrief unavailable for this mission.')

    return {
      success: true,
      data: {
        score: answer.score,
        gotRight: asArray(answer.gotRight),
        missed: asArray(answer.missed),
        correctAnswer: keyRes.data.record.data.correctAnswer,
        rubric: asArray(keyRes.data.record.data.rubric),
        sources: asArray(scenarioRes.data.record.data.sources),
        text: answer.text,
      },
    }
  })
}
