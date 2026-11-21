/**
 * Crew Log: every answer for this scenario, sorted by upvotes, live.
 *
 * Mount it only after the user has submitted. The DO decides what arrives:
 * `answers` rows are readable only by their owner and the scenario's crew,
 * so this query returns nothing to someone who has not submitted.
 */

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth, useQuery } from 'deepspace'
import { Users } from 'lucide-react'
import type { AnswerData, UpvoteData } from '@/lib/types'
import { actions } from '@/lib/actions'
import { useToast } from '@/components/ui'
import { CrewEntry } from './CrewEntry'

export function CrewLog({ scenarioId }: { scenarioId: string }) {
  const { userId } = useAuth()
  const { error: toastError } = useToast()
  const { records, status } = useQuery<AnswerData>('answers', { where: { scenarioId } })
  const { records: myVotes } = useQuery<UpvoteData>('upvotes', { where: { scenarioId, userId: userId ?? '__none__' } })
  const [pending, setPending] = useState<Set<string>>(new Set())

  // Remember which answers were there on first load; later arrivals get a flash.
  const [initialIds, setInitialIds] = useState<Set<string> | null>(null)
  useEffect(() => {
    if (status === 'ready' && initialIds === null) setInitialIds(new Set(records.map((r) => r.recordId)))
  }, [status, records, initialIds])

  const voted = useMemo(() => new Set(myVotes.map((v) => v.data.answerId)), [myVotes])
  const sorted = useMemo(
    () =>
      [...records].sort(
        (a, b) => (b.data.upvoteCount ?? 0) - (a.data.upvoteCount ?? 0) || a.createdAt.localeCompare(b.createdAt),
      ),
    [records],
  )

  const vote = async (answerId: string) => {
    setPending((p) => new Set(p).add(answerId))
    const res = await actions.upvote(answerId)
    setPending((p) => {
      const next = new Set(p)
      next.delete(answerId)
      return next
    })
    if (!res.success) toastError('Vote not recorded', res.error)
  }

  return (
    <section aria-labelledby="crew-title" data-testid="crew-log">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="label-mono text-primary">Crew Log</p>
          <h2 id="crew-title" className="mt-2 text-2xl font-semibold text-foreground">
            How the crew answered
          </h2>
        </div>
        <span className="label-mono text-muted-foreground" aria-live="polite">
          {records.length} transmission{records.length === 1 ? '' : 's'}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="mt-5 space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <ol className="mt-5 space-y-3">
          <AnimatePresence initial={false}>
            {sorted.map((r) => (
              <motion.li
                key={r.recordId}
                layout
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <CrewEntry
                  id={r.recordId}
                  answer={r.data}
                  own={r.data.userId === userId}
                  voted={voted.has(r.recordId) || pending.has(r.recordId)}
                  pending={pending.has(r.recordId)}
                  fresh={initialIds !== null && !initialIds.has(r.recordId)}
                  onVote={() => void vote(r.recordId)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      {status !== 'loading' && records.length <= 1 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden />
          You are the first on this channel. New answers appear here live.
        </p>
      )}
    </section>
  )
}

/** Shown before you submit. Reveals nothing about other answers (not even a count). */
export function CrewLogLocked() {
  return (
    <section className="rounded-xl border border-dashed border-border p-5 sm:p-6" data-testid="crew-log-locked">
      <p className="label-mono text-muted-foreground">Crew Log // Locked</p>
      <p className="mt-2 text-foreground">Transmit your own call to read how the rest of the crew answered.</p>
    </section>
  )
}
