/** Upvote control with a small spring when your vote lands. */

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowBigUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  count: number
  voted: boolean
  own: boolean
  pending: boolean
  onVote: () => void
}

export function UpvoteButton({ count, voted, own, pending, onVote }: Props) {
  const reduce = useReducedMotion()
  const disabled = own || voted || pending
  const label = own ? 'Your answer' : voted ? 'You upvoted this' : 'Upvote this explanation'

  return (
    <button
      type="button"
      onClick={onVote}
      disabled={disabled}
      aria-pressed={voted}
      aria-label={`${label}, ${count} upvote${count === 1 ? '' : 's'}`}
      title={label}
      data-testid="upvote-button"
      className={cn(
        'flex min-h-14 min-w-12 shrink-0 flex-col items-center justify-center self-start rounded-lg border px-2 py-1.5 transition-colors',
        voted ? 'border-primary text-primary' : 'border-border text-muted-foreground',
        !disabled && 'hover:border-primary hover:text-primary',
        own && 'cursor-default opacity-60',
      )}
    >
      <motion.span
        key={voted ? 'on' : 'off'}
        initial={voted && !reduce ? { scale: 1 } : false}
        animate={voted && !reduce ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        className="flex"
      >
        <ArrowBigUp className={cn('h-5 w-5', voted && 'fill-current')} aria-hidden />
      </motion.span>
      <span className="font-mono text-xs tabular-nums" data-testid="upvote-count">
        {count}
      </span>
    </button>
  )
}
