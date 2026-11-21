/** One row in a track's mission log: number, title, flown/open, score. */

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { missionLabel } from '@/lib/tracks'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  number: number
  title: string
  score: number | null
}

export function MissionRow({ id, number, title, score }: Props) {
  const flown = score !== null
  return (
    <li>
      <Link
        to={`/scenario/${id}`}
        data-testid="mission-row"
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-accent sm:grid-cols-[7.5rem_1fr_auto_auto] sm:py-5"
      >
        <span className="label-mono text-muted-foreground sm:order-none">{missionLabel(number)}</span>
        <span className="col-span-2 row-start-2 font-medium text-foreground group-hover:text-primary sm:col-span-1 sm:row-start-auto">
          {title}
        </span>
        <span
          className={cn(
            'label-mono col-start-2 row-start-1 justify-self-end rounded-sm px-2 py-1 sm:col-start-auto sm:row-start-auto',
            flown ? 'bg-secondary text-foreground' : 'border border-primary text-primary',
          )}
        >
          {flown ? `Flown · ${score}/10` : 'Open'}
        </span>
        <ArrowRight
          className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:text-primary motion-safe:group-hover:translate-x-0.5 sm:block"
          aria-hidden
        />
      </Link>
    </li>
  )
}
