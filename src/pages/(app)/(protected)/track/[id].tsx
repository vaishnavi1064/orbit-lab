/** /track/:id: the mission log for one track, plus "Request briefing". */

import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, SatelliteDish } from 'lucide-react'
import { getTrack } from '@/lib/tracks'
import { useMyAnswers, useScenarios } from '@/hooks/useMissionData'
import { useRequestBriefing } from '@/hooks/useRequestBriefing'
import { PageHeader } from '@/components/space/PageHeader'
import { TrackGlyph } from '@/components/space/TrackGlyph'
import { MissionRow } from '@/components/mission/MissionRow'
import { Button, EmptyState } from '@/components/ui'

export default function TrackPage() {
  const { id } = useParams()
  const track = getTrack(id)
  const { records: scenarios, status } = useScenarios(track?.id)
  const { records: answers, status: answersStatus } = useMyAnswers(track?.id)
  const briefing = useRequestBriefing(track?.id)

  const rows = useMemo(() => {
    const scoreBy = new Map(answers.map((a) => [a.data.scenarioId, a.data.score]))
    return [...scenarios]
      .sort((a, b) => a.data.number - b.data.number)
      .map((s) => ({ id: s.recordId, number: s.data.number, title: s.data.title, score: scoreBy.get(s.recordId) ?? null }))
  }, [scenarios, answers])

  if (!track) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <EmptyState icon={<SatelliteDish />} title="No such station" description="That track is not on the manifest." />
        <div className="mt-6 text-center">
          <Link to="/home" className="label-mono text-primary hover:underline">
            Back to mission control
          </Link>
        </div>
      </div>
    )
  }

  const loading = status === 'loading' || answersStatus === 'loading'
  const flown = rows.filter((r) => r.score !== null)
  const avg = flown.length ? flown.reduce((s, r) => s + (r.score ?? 0), 0) / flown.length : null
  const allFlown = rows.length > 0 && flown.length === rows.length

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <Link to="/home" className="label-mono inline-flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All stations
      </Link>

      <div className="mt-6">
        <PageHeader
          label={`TRK-${track.number} // ${track.callsign}`}
          title={track.name}
          aside={<TrackGlyph track={track.id} className="hidden h-16 w-16 text-primary md:block" />}
        >
          {track.blurb}
        </PageHeader>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
        <Stat label="Missions" value={loading ? '–' : String(rows.length)} />
        <Stat label="Flown" value={loading ? '–' : String(flown.length)} />
        <Stat label="Avg score" value={loading || avg === null ? '–' : avg.toFixed(1)} />
      </dl>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="log-title">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="log-title" className="label-mono text-muted-foreground">
            Mission log
          </h2>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Button onClick={briefing.request} loading={briefing.pending} disabled={loading} data-testid="request-briefing">
              {rows.length === 0 || allFlown ? 'Request new briefing' : 'Resume next mission'}
            </Button>
          </div>
        </div>

        {(briefing.pending || briefing.error) && (
          <div className="border-b border-border px-5 py-3" aria-live="polite">
            {briefing.pending ? (
              <p className="font-mono text-sm text-primary">
                Contacting Houston... {allFlown || rows.length === 0 ? 'drafting a new briefing (about 15 seconds)' : 'pulling your next mission'}
              </p>
            ) : (
              <p className="text-sm text-destructive" role="alert">
                {briefing.error}
              </p>
            )}
          </div>
        )}

        {loading ? (
          <ul aria-busy="true" className="divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-6 px-5 py-5">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="p-6 sm:p-10">
            <EmptyState
              icon={<SatelliteDish />}
              title="No transmissions on this channel yet"
              description="Request a briefing and Mission Control will write the first scenario for this track."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <MissionRow key={r.id} {...r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-4 sm:px-6">
      <dt className="label-mono text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-2xl tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
