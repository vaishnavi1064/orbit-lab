/**
 * Background jobs, run by AppJobRoom (worker.ts). Work that must outlive the
 * HTTP response goes here (Cloudflare kills waitUntil after 30s).
 *
 * `scenario-image`: generate the scenario's illustration with fal and write
 * `imageUrl` onto the public scenario. The update is pushed live to every
 * client viewing it. Failure is harmless: the UI keeps its gradient art.
 */

import type { Job, JobContext } from 'deepspace/worker'
import { buildCronContext } from 'deepspace/worker'
import type { Env } from '../worker'
import { isTrackId } from './lib/tracks'
import { generateImage, type AiContext } from './server/ai'

export async function runJob(job: Job, ctx: JobContext, env: Env): Promise<unknown> {
  switch (job.type) {
    case 'scenario-image':
      return scenarioImage(job.payload, ctx, env)
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

async function scenarioImage(payload: unknown, ctx: JobContext, env: Env) {
  const { scenarioId, title, track } = (payload ?? {}) as { scenarioId?: string; title?: string; track?: string }
  if (!scenarioId || !title || !isTrackId(track)) throw new Error('scenario-image: bad payload')

  // Owner context: integrations billed to the app owner, RBAC-bypassing record writes.
  const owner = buildCronContext(env, env.OWNER_USER_ID, `app:${env.DEEPSPACE_APP_ID}`)
  const ai: AiContext = {
    env,
    integrate: async (endpoint, body) => {
      try {
        const res = await owner.integrations.call(endpoint, body as Record<string, unknown>)
        if (res && typeof res === 'object' && 'success' in res) return res as Awaited<ReturnType<AiContext['integrate']>>
        return { success: true, data: res }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    },
  }

  ctx.progress(0.1, 'rendering illustration')
  const imageUrl = await generateImage(ai, { title, track })
  if (!imageUrl) return { imageUrl: null }
  await owner.records.update('scenarios', scenarioId, { imageUrl })
  return { imageUrl }
}
