/**
 * Track card (DESIGN.md sketch 1). Pure CSS hover so it is cheap, prerender
 * safe on the static landing, and honours reduced motion via `motion-safe:`.
 */

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Track } from '@/lib/tracks'
import { cn } from '@/lib/utils'
import { TrackGlyph } from './TrackGlyph'

export interface TrackStats {
  missions: number
  done: number
  avg: number | null
}

interface Props {
  track: Track
  stats?: TrackStats
  wide?: boolean
  className?: string
}

export function TrackCard({ track, stats, wide = false, className }: Props) {
  return (
    <Link
      to={`/track/${track.id}`}
      data-testid={`track-card-${track.id}`}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 sm:p-6',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:border-primary hover:glow-primary motion-safe:hover:-translate-y-1',
        'focus-visible:border-primary',
        wide ? 'md:min-h-[220px]' : 'md:min-h-[200px]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="label-mono text-muted-foreground transition-colors group-hover:text-primary">
          TRK-{track.number}
        </span>
        <TrackGlyph
          track={track.id}
          className={cn(
            'shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-primary',
            wide ? 'h-14 w-14' : 'h-11 w-11',
          )}
        />
      </div>

      <div className="mt-3 md:mt-6">
        <h3 className={cn('font-semibold text-foreground', wide ? 'text-2xl' : 'text-xl')}>
          {track.name}
        </h3>
        <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
          {track.blurb}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {stats ? statLine(stats) : 'OPEN FOR BRIEFING'}
        </span>
        <span className="label-mono flex items-center gap-1.5 text-primary">
          Brief
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  )
}

function statLine({ missions, done, avg }: TrackStats): string {
  if (missions === 0) return 'NO MISSIONS LOGGED'
  const avgPart = avg === null ? '' : `  ·  AVG ${avg.toFixed(1)}`
  return `${done}/${missions} FLOWN${avgPart}`
}
