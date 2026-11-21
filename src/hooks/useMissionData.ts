/**
 * Read hooks over the synced collections. RBAC is enforced server-side: the
 * answers query only ever returns rows this user may read.
 */

import { useMemo } from 'react'
import { useAuth, useQuery } from 'deepspace'
import type { TrackStats } from '@/components/space/TrackCard'
import { TRACK_IDS, type TrackId } from '@/lib/tracks'
import type { AnswerData, ScenarioData } from '@/lib/types'

export function useScenarios(track?: TrackId) {
  return useQuery<ScenarioData>('scenarios', track ? { where: { track } } : undefined)
}

/** The signed-in user's own answers (optionally for one track). */
export function useMyAnswers(track?: TrackId) {
  const { userId } = useAuth()
  const where: Record<string, unknown> = { userId: userId ?? '__none__' }
  if (track) where.track = track
  return useQuery<AnswerData>('answers', { where })
}

export function trackStats(scenarios: { data: ScenarioData }[], answers: { data: AnswerData }[]) {
  const stats = {} as Record<TrackId, TrackStats>
  for (const id of TRACK_IDS) {
    const mine = answers.filter((a) => a.data.track === id)
    stats[id] = {
      missions: scenarios.filter((s) => s.data.track === id).length,
      done: mine.length,
      avg: mine.length ? mine.reduce((sum, a) => sum + a.data.score, 0) / mine.length : null,
    }
  }
  return stats
}

export function useTrackStats() {
  const { records: scenarios, status: s1 } = useScenarios()
  const { records: answers, status: s2 } = useMyAnswers()
  const stats = useMemo(() => trackStats(scenarios, answers), [scenarios, answers])
  return { stats, ready: s1 === 'ready' && s2 === 'ready' }
}
