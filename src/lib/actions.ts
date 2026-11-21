/**
 * Client helper for POST /api/actions/:name. Always resolves to an
 * ActionResult-shaped value (never throws), so UI code has one error path.
 */

import { getAuthToken } from 'deepspace'
import type { Debrief, GenerateScenarioResult } from './types'

export type ActionOutcome<T> = { success: true; data: T } | { success: false; error: string }

export async function callAction<T>(name: string, params: Record<string, unknown>): Promise<ActionOutcome<T>> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'Sign in to contact Mission Control.' }
    const res = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    })
    if (res.status === 401) return { success: false, error: 'Your session expired. Sign in again.' }
    const body = (await res.json().catch(() => null)) as ActionOutcome<T> | null
    if (!body || typeof body.success !== 'boolean') {
      return { success: false, error: 'Mission Control sent an unreadable reply. Try again.' }
    }
    return body
  } catch {
    return { success: false, error: 'No signal. Check your connection and try again.' }
  }
}

export const actions = {
  generateScenario: (track: string) => callAction<GenerateScenarioResult>('generateScenario', { track }),
  submitAnswer: (scenarioId: string, text: string) => callAction<Debrief>('submitAnswer', { scenarioId, text }),
  getDebrief: (scenarioId: string) => callAction<Debrief>('getDebrief', { scenarioId }),
}
