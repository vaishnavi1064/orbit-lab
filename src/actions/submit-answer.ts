/**
 * submitAnswer(scenarioId, text)
 *
 * One answer per user per scenario (checked here AND by `uniqueOn` in the DO),
 * max 1500 characters. Grades against the server-only key, saves the answer,
 * then (and only then) returns the key with the feedback.
 */

import type { ActionResult } from 'deepspace/worker'
import { MAX_ANSWER_CHARS, type AnswerData, type AnswerKeyData, type Debrief, type ScenarioData } from '../lib/types'
import { gradeAnswer } from '../server/ai'
import { aiContext, asArray, fail, guarded, stringParam, type Ctx } from './shared'
import { syncCrew } from './crew'

export async function submitAnswer(ctx: Ctx): Promise<ActionResult<Debrief>> {
  return guarded<Debrief>('submitAnswer', async () => {
    const scenarioId = stringParam(ctx.params, 'scenarioId')
    if (!scenarioId) return fail('Missing scenario.')

    const raw = ctx.params.text
    if (typeof raw !== 'string') return fail('Write your call before transmitting.')
    const text = raw.trim()
    if (text.length === 0) return fail('Write your call before transmitting.')
    if (text.length > MAX_ANSWER_CHARS) return fail(`Answers are limited to ${MAX_ANSWER_CHARS} characters.`)

    const existing = await ctx.tools.query<AnswerData>('answers', {
      where: { scenarioId, userId: ctx.userId },
      limit: 1,
    })
    if (!existing.success) return fail('Could not check your previous answers.')
    if (existing.data.count > 0) return fail('You already transmitted an answer for this mission.')

    const [scenarioRes, keyRes] = await Promise.all([
      ctx.tools.get<ScenarioData>('scenarios', scenarioId),
      ctx.tools.get<AnswerKeyData>('answerKeys', scenarioId),
    ])
    if (!scenarioRes.success) return fail('That mission does not exist.')
    if (!keyRes.success) return fail('This mission has no answer key on file.')
    const scenario = scenarioRes.data.record.data
    const key = keyRes.data.record.data
    const rubric = asArray<string>(key.rubric)

    const grade = await gradeAnswer(aiContext(ctx), {
      briefing: scenario.briefing,
      correctAnswer: key.correctAnswer,
      rubric,
      answer: text,
    })

    const answer: AnswerData = {
      scenarioId,
      track: scenario.track,
      userId: ctx.userId,
      text,
      score: grade.score,
      gotRight: grade.gotRight,
      missed: grade.missed,
      crew: [ctx.userId],
      upvoteCount: 0,
    }
    const created = await ctx.tools.create('answers', answer)
    if (!created.success) {
      // A concurrent double-submit loses the race at the DO's uniqueOn check.
      if (/duplicate/i.test(created.error)) return fail('You already transmitted an answer for this mission.')
      return fail('Could not save your answer. Try again.')
    }

    // Open the Crew Log both ways: this user joins every answer's crew, and
    // this answer's crew gets everyone who submitted before.
    try {
      await syncCrew(ctx, scenarioId)
    } catch (err) {
      // The answer is saved; the next submit on this scenario re-syncs.
      console.error(`[submitAnswer] ${err instanceof Error ? err.message : String(err)}`)
    }

    return {
      success: true,
      data: {
        score: grade.score,
        gotRight: grade.gotRight,
        missed: grade.missed,
        correctAnswer: key.correctAnswer,
        rubric,
        sources: asArray(scenario.sources),
        text,
      },
    }
  })
}
