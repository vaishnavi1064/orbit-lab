/**
 * Helpers shared by Orbit Lab server actions.
 *
 * Actions run with RBAC OFF (see src/server/action-routes.ts), so every
 * ownership / visibility rule is checked explicitly in the action itself.
 */

import type { ActionContext, ActionResult } from 'deepspace/worker'
import type { Env } from '../../worker'
import { AiError, type AiContext } from '../server/ai'

export type Ctx = ActionContext<Env>

export const fail = (error: string): ActionResult<never> => ({ success: false, error })

export function aiContext(ctx: Ctx): AiContext {
  return { env: ctx.env, integrate: (endpoint, body) => ctx.tools.integration(endpoint, body) }
}

/** JSON columns may arrive parsed or as text depending on the path; normalize. */
export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

export function stringParam(params: Record<string, unknown>, key: string): string | null {
  const v = params[key]
  return typeof v === 'string' && v.length > 0 && v.length < 200 ? v : null
}

/** Never let an exception become a 500 with a stack: map to a friendly error. */
export async function guarded<T>(name: string, run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run()
  } catch (err) {
    if (err instanceof AiError) return fail(err.message)
    console.error(`[action:${name}] ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`)
    return fail('Something went wrong on our side. Please try again.')
  }
}
