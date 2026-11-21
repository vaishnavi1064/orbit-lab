/**
 * One answer in the Crew Log: anonymous label, score, explanation, upvotes.
 * Authors are "Crew member N" (submission order); your own entry is "You".
 */

import { useState } from 'react'
import type { AnswerData } from '@/lib/types'
import { crewLabel } from '@/lib/crew'
import { cn } from '@/lib/utils'
import { UpvoteButton } from './UpvoteButton'

interface Props {
  id: string
  answer: AnswerData
  /** 1-based submission order for this scenario. */
  crewNumber: number | undefined
  own: boolean
  voted: boolean
  pending: boolean
  fresh: boolean
  onVote: () => void
}

export function CrewEntry({ id, answer, crewNumber, own, voted, pending, fresh, onVote }: Props) {
  const [expanded, setExpanded] = useState(false)
  const long = answer.text.length > 420
  const label = crewLabel(own, crewNumber)

  return (
    <article
      data-testid="crew-entry"
      data-answer-id={id}
      data-own={own || undefined}
      className={cn(
        'flex gap-4 rounded-xl border bg-card p-4 sm:p-5',
        own ? 'border-primary' : 'border-border',
        fresh && 'crew-flash',
      )}
    >
      <UpvoteButton count={answer.upvoteCount ?? 0} voted={voted} own={own} pending={pending} onVote={onVote} />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            aria-hidden="true"
            className={cn(
              'grid h-7 w-7 place-items-center rounded-full font-mono text-xs',
              own ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
            )}
          >
            {crewNumber ?? '?'}
          </span>
          <span data-testid="crew-label" className={cn('font-medium', own ? 'text-primary' : 'text-foreground')}>
            {label}
          </span>
          <span className="label-mono ml-auto rounded-sm bg-secondary px-2 py-1 text-foreground">{answer.score}/10</span>
        </header>
        <p
          className={cn(
            'mt-3 whitespace-pre-line break-words leading-relaxed text-foreground',
            long && !expanded && 'line-clamp-5',
          )}
        >
          {answer.text}
        </p>
        {long && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="label-mono mt-2 rounded-sm text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : 'Read full transmission'}
          </button>
        )}
      </div>
    </article>
  )
}
