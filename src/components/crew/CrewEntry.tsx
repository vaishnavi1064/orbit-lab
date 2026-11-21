/** One answer in the Crew Log: author, score, explanation, upvotes. */

import { useState } from 'react'
import type { AnswerData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UpvoteButton } from './UpvoteButton'

interface Props {
  id: string
  answer: AnswerData
  own: boolean
  voted: boolean
  pending: boolean
  fresh: boolean
  onVote: () => void
}

export function CrewEntry({ id, answer, own, voted, pending, fresh, onVote }: Props) {
  const [expanded, setExpanded] = useState(false)
  const long = answer.text.length > 420
  const name = answer.displayName || 'Crew member'

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
            className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-mono text-xs text-foreground"
          >
            {name[0]?.toUpperCase()}
          </span>
          <span className="font-medium text-foreground">{name}</span>
          {own && <span className="label-mono text-primary">You</span>}
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
