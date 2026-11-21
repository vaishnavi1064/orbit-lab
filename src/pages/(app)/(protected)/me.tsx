/** /me: your flight record. Progress is derived from your answers (SPEC). */

import { useMemo } from 'react'
import { useAuthUser } from 'deepspace'
import { Link } from 'react-router-dom'
import { Satellite } from 'lucide-react'
import { TRACKS } from '@/lib/tracks'
import { trackStats, useMyAnswers, useScenarios } from '@/hooks/useMissionData'
import { PageHeader } from '@/components/space/PageHeader'
import { LoadError } from '@/components/space/LoadError'
import { TrackProgressRow } from '@/components/progress/TrackProgressRow'
import { PastAnswerRow } from '@/components/progress/PastAnswerRow'
import { EmptyState } from '@/components/ui'

export default function MePage() {
  const { user } = useAuthUser()
  const { records: scenarios, status: s1, error: e1 } = useScenarios()
  const { records: answers, status: s2, error: e2 } = useMyAnswers()

  const stats = useMemo(() => trackStats(scenarios, answers), [scenarios, answers])
  const scenarioById = useMemo(() => new Map(scenarios.map((s) => [s.recordId, s.data])), [scenarios])
  const past = useMemo(() => [...answers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [answers])

  const loading = s1 === 'loading' || s2 === 'loading'
  const failed = s1 === 'error' || s2 === 'error'
  const flown = answers.length
  const avg = flown ? answers.reduce((s, a) => s + a.data.score, 0) / flown : null
  const upvotes = answers.reduce((s, a) => s + (a.data.upvoteCount ?? 0), 0)
  const firstName = user?.firstName || user?.fullName?.split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <PageHeader label="Flight record" title={firstName ? `${firstName}'s missions.` : 'Your missions.'}>
        Average score per track, and every call you have transmitted.
      </PageHeader>

      {failed && (
        <div className="mt-8">
          <LoadError message={e1 || e2} />
        </div>
      )}

      <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
        <Stat label="Flown" value={loading ? '–' : String(flown)} />
        <Stat label="Avg score" value={loading || avg === null ? '–' : avg.toFixed(1)} />
        <Stat label="Upvotes received" value={loading ? '–' : String(upvotes)} />
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <section className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="tracks-title">
          <h2 id="tracks-title" className="label-mono border-b border-border px-5 py-3 text-muted-foreground">
            By track
          </h2>
          {loading ? (
            <Skeleton rows={5} />
          ) : (
            <ul className="divide-y divide-border">
              {TRACKS.map((t, i) => (
                <TrackProgressRow key={t.id} track={t} stats={stats[t.id]} index={i} />
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="past-title">
          <h2 id="past-title" className="label-mono border-b border-border px-5 py-3 text-muted-foreground">
            Past transmissions
          </h2>
          {loading ? (
            <Skeleton rows={4} />
          ) : past.length === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                icon={<Satellite />}
                title="No transmissions yet"
                description="Pick a station and answer your first briefing. It will be logged here."
              />
              <div className="mt-4 text-center">
                <Link to="/home" className="label-mono text-primary hover:underline">
                  Choose a station
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {past.map((a) => (
                <PastAnswerRow
                  key={a.recordId}
                  scenarioId={a.data.scenarioId}
                  answer={a.data}
                  scenario={scenarioById.get(a.data.scenarioId)}
                  createdAt={a.createdAt}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
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

function Skeleton({ rows }: { rows: number }) {
  return (
    <ul aria-busy="true" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-5">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-5 w-10 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  )
}
