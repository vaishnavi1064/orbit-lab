/**
 * generateScenario(track)
 *
 * Reuse first: if the caller has not answered every existing scenario in the
 * track, return the oldest unanswered one (no AI call, shared by all users).
 * Otherwise generate a new one, store the answer key server-only, then the
 * public scenario under the same id (so a scenario never exists without a key).
 */

import type { ActionResult } from 'deepspace/worker'
import { isTrackId } from '../lib/tracks'
import type { AnswerData, GenerateScenarioResult, ScenarioData } from '../lib/types'
import { generateScenarioContent } from '../server/ai'
import { aiContext, fail, guarded, type Ctx } from './shared'

/** Spend control: new scenarios a single user may trigger per 24h. */
export const DAILY_GENERATION_CAP = 8

export async function generateScenario(ctx: Ctx): Promise<ActionResult<GenerateScenarioResult>> {
  return guarded<GenerateScenarioResult>('generateScenario', async () => {
    const track = ctx.params.track
    if (!isTrackId(track)) return fail('Unknown track.')

    const [scenarios, mine] = await Promise.all([
      ctx.tools.query<ScenarioData>('scenarios', { where: { track }, limit: 500 }),
      ctx.tools.query<AnswerData>('answers', { where: { track, userId: ctx.userId }, limit: 500 }),
    ])
    if (!scenarios.success) return fail('Could not read the mission log.')
    if (!mine.success) return fail('Could not read your answers.')

    const answered = new Set(mine.data.records.map((r) => r.data.scenarioId))
    const unanswered = scenarios.data.records
      .filter((r) => !answered.has(r.recordId))
      .sort((a, b) => a.data.number - b.data.number)
    if (unanswered.length > 0) return { success: true, data: { scenarioId: unanswered[0].recordId, reused: true } }

    // Spend control before any AI call.
    const recent = await ctx.tools.query<ScenarioData>('scenarios', { where: { generatedBy: ctx.userId }, limit: 200 })
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    const generatedToday = recent.success
      ? recent.data.records.filter((r) => Date.parse(r.createdAt) > dayAgo).length
      : 0
    if (generatedToday >= DAILY_GENERATION_CAP) {
      return fail(`You have opened ${DAILY_GENERATION_CAP} new briefings today. Mission Control resumes tomorrow.`)
    }

    const existingTitles = scenarios.data.records.map((r) => r.data.title)
    const content = await generateScenarioContent(aiContext(ctx), { track, existingTitles, sources: [] })

    const scenarioId = crypto.randomUUID()
    const key = await ctx.tools.create(
      'answerKeys',
      { scenarioId, correctAnswer: content.correctAnswer, rubric: content.rubric },
      scenarioId,
    )
    if (!key.success) return fail('Could not file the answer key. Try again.')

    const number = scenarios.data.records.reduce((max, r) => Math.max(max, r.data.number), 0) + 1
    const scenario: ScenarioData = {
      track,
      number,
      title: content.title,
      briefing: content.briefing,
      imageUrl: '',
      sources: [],
      generatedBy: ctx.userId,
    }
    const created = await ctx.tools.create('scenarios', scenario, scenarioId)
    if (!created.success) return fail('Could not publish the briefing. Try again.')

    return { success: true, data: { scenarioId, reused: false } }
  })
}
