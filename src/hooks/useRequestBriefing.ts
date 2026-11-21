/** Ask the server for the next briefing in a track, then open it. */

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { actions } from '@/lib/actions'
import type { TrackId } from '@/lib/tracks'

export function useRequestBriefing(track: TrackId | undefined) {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async () => {
    if (!track || pending) return
    setPending(true)
    setError(null)
    const res = await actions.generateScenario(track)
    setPending(false)
    if (res.success) navigate(`/scenario/${res.data.scenarioId}`)
    else setError(res.error)
  }, [track, pending, navigate])

  return { request, pending, error }
}
