/**
 * /scenario/:id: briefing, answer box, then debrief.
 * The answer key never reaches this page until the server has saved this
 * user's answer (it arrives in the submitAnswer / getDebrief response).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth, useQuery } from 'deepspace'
import { ArrowLeft, ArrowRight, SatelliteDish } from 'lucide-react'
import { getTrack, missionLabel } from '@/lib/tracks'
import type { AnswerData, Debrief, ScenarioData } from '@/lib/types'
import { actions } from '@/lib/actions'
import { useRequestBriefing } from '@/hooks/useRequestBriefing'
import { BriefingPanel } from '@/components/mission/BriefingPanel'
import { AnswerConsole } from '@/components/mission/AnswerConsole'
import { GradingState } from '@/components/mission/GradingState'
import { DebriefPanel } from '@/components/mission/DebriefPanel'
import { CrewLog, CrewLogLocked } from '@/components/crew/CrewLog'
import { LoadError } from '@/components/space/LoadError'
import { Button, EmptyState } from '@/components/ui'

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export default function ScenarioPage() {
  const { id = '' } = useParams()
  const { userId } = useAuth()
  const { records: scenarios, status } = useQuery<ScenarioData>('scenarios')
  const { records: mine, status: mineStatus } = useQuery<AnswerData>('answers', {
    where: { scenarioId: id, userId: userId ?? '__none__' },
  })
  const scenarioRecord = useMemo(() => scenarios.find((s) => s.recordId === id), [scenarios, id])
  const scenario = scenarioRecord?.data
  const track = getTrack(scenario?.track)
  const hasAnswered = mine.length > 0

  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<'answer' | 'grading'>('answer')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [debrief, setDebrief] = useState<Debrief | null>(null)
  const [debriefError, setDebriefError] = useState<string | null>(null)

  // Revisit: load the debrief (server checks that this user has answered).
  useEffect(() => {
    if (!hasAnswered || debrief || phase === 'grading') return
    let cancelled = false
    actions.getDebrief(id).then((res) => {
      if (cancelled) return
      if (res.success) setDebrief(res.data)
      else setDebriefError(res.error)
    })
    return () => {
      cancelled = true
    }
  }, [hasAnswered, debrief, id, phase])

  const transmit = async (text: string) => {
    setPhase('grading')
    setSubmitError(null)
    const res = await actions.submitAnswer(id, text)
    if (res.success) {
      setDebrief(res.data)
      setDraft('')
    } else {
      setSubmitError(res.error)
    }
    setPhase('answer')
  }

  const next = useRequestBriefing(track?.id)

  if (status === 'error' || mineStatus === 'error') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8">
        <LoadError />
      </div>
    )
  }
  if (status === 'loading' || mineStatus === 'loading') return <ScenarioSkeleton />

  if (!scenario || !track) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <EmptyState icon={<SatelliteDish />} title="Transmission not found" description="This mission is not in the log." />
        <div className="mt-6 text-center">
          <Link to="/home" className="label-mono text-primary hover:underline">
            Back to mission control
          </Link>
        </div>
      </div>
    )
  }

  const label = `${missionLabel(scenario.number)} // ${track.callsign}`
  const showDebrief = !!debrief
  const answeredNoDebrief = hasAnswered && !debrief

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <Link
        to={`/track/${track.id}`}
        className="label-mono inline-flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {track.name}
      </Link>

      <div className="mt-5">
        <BriefingPanel scenario={scenario} track={track} animate={!hasAnswered} />
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {phase === 'grading' ? (
            <motion.div key="grading" {...fade}>
              <GradingState />
            </motion.div>
          ) : showDebrief ? (
            <motion.div key="debrief" {...fade} className="space-y-6">
              <DebriefPanel debrief={debrief} missionLabel={label} />
              <NextMission onNext={next.request} pending={next.pending} error={next.error} />
            </motion.div>
          ) : answeredNoDebrief ? (
            <motion.div key="loading-debrief" {...fade}>
              {debriefError ? (
                <p role="alert" className="rounded-xl border border-border bg-card p-5 text-destructive">
                  {debriefError}
                </p>
              ) : (
                <GradingState label="Retrieving debrief" lines={['Pulling your debrief from the archive...']} />
              )}
            </motion.div>
          ) : (
            <motion.div key="answer" {...fade}>
              <AnswerConsole
                text={draft}
                onTextChange={setDraft}
                onTransmit={transmit}
                pending={false}
                error={submitError}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-12">{hasAnswered ? <CrewLog scenarioId={id} /> : phase === 'answer' && <CrewLogLocked />}</div>
    </div>
  )
}

function NextMission({ onNext, pending, error }: { onNext: () => void; pending: boolean; error: string | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">Ready for the next transmission?</p>
        {pending ? (
          <p className="font-mono text-sm text-primary" role="status">
            Contacting Houston... drafting your briefing
          </p>
        ) : error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Same track. A new one is written if you have flown them all.</p>
        )}
      </div>
      <Button size="lg" onClick={onNext} loading={pending} data-testid="next-briefing">
        Next briefing
        {!pending && <ArrowRight aria-hidden />}
      </Button>
    </div>
  )
}

function ScenarioSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12" aria-busy="true">
      <p className="label-mono text-muted-foreground" role="status">
        Acquiring signal...
      </p>
      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-11 border-b border-border" />
        <div className="aspect-[16/9] animate-pulse bg-muted sm:aspect-[21/9]" />
        <div className="space-y-3 p-8">
          <div className="h-7 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
