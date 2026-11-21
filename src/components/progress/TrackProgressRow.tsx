/** One track's progress: flown count and an average-score bar (transform-animated). */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Track } from '@/lib/tracks'
import type { TrackStats } from '../space/TrackCard'
import { TrackGlyph } from '../space/TrackGlyph'

export function TrackProgressRow({ track, stats, index }: { track: Track; stats: TrackStats; index: number }) {
  const pct = stats.avg === null ? 0 : stats.avg / 10
  return (
    <li>
      <Link
        to={`/track/${track.id}`}
        data-testid={`progress-${track.id}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-accent"
      >
        <TrackGlyph track={track.id} className="h-9 w-9 text-muted-foreground transition-colors group-hover:text-primary" />
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-medium text-foreground group-hover:text-primary">{track.name}</span>
            <span className="label-mono hidden shrink-0 text-muted-foreground sm:inline">
              {stats.done}/{stats.missions} flown
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label={`${track.name} average score`}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={stats.avg === null ? 0 : Number(stats.avg.toFixed(1))}
          >
            <motion.div
              className="h-full origin-left rounded-full bg-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: pct }}
              transition={{ duration: 0.8, delay: 0.1 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="label-mono mt-1.5 block text-muted-foreground sm:hidden">
            {stats.done}/{stats.missions} flown
          </span>
        </div>
        <span className="w-12 text-right font-mono text-lg tabular-nums text-foreground">
          {stats.avg === null ? '–' : stats.avg.toFixed(1)}
        </span>
      </Link>
    </li>
  )
}
