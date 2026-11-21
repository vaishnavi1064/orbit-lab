/**
 * Server actions, exposed at POST /api/actions/:name (auth required; the
 * route in src/server/action-routes.ts rejects unauthenticated callers).
 */

import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { generateScenario } from './generate-scenario'
import { getDebrief } from './get-debrief'
import { submitAnswer } from './submit-answer'
import { upvote } from './upvote'

export const actions: Record<string, ActionHandler<Env>> = {
  generateScenario,
  submitAnswer,
  getDebrief,
  upvote,
}
