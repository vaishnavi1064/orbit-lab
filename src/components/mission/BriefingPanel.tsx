/**
 * The signature "incoming transmission" panel (DESIGN.md sketch 2):
 * mono header, art, one amber scanline sweep, teleprinter briefing.
 * Screen readers get the full briefing immediately; the reveal is visual only.
 */

import { motion, useReducedMotion } from 'framer-motion'
import type { Track } from '@/lib/tracks'
import { missionLabel } from '@/lib/tracks'
import type { ScenarioData } from '@/lib/types'
import { useTypewriter } from '@/hooks/useTypewriter'
import { ScenarioArt } from './ScenarioArt'
import { SourceList } from './SourceList'

interface Props {
  scenario: ScenarioData
  track: Track
  /** Typewriter only for a first read; revisits show the text at once. */
  animate: boolean
}

export function BriefingPanel({ scenario, track, animate }: Props) {
  const reduce = useReducedMotion()
  const { shown, done, skip } = useTypewriter(scenario.briefing, { enabled: animate })

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="briefing-title">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border px-5 py-3">
        <span className="label-mono flex items-center gap-2 text-primary">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-primary"
            initial={animate && !reduce ? { opacity: 0.2 } : false}
            animate={{ opacity: [0.2, 1, 0.4, 1] }}
            transition={{ duration: 1.2, times: [0, 0.3, 0.6, 1] }}
          />
          Incoming transmission
        </span>
        <span className="label-mono text-muted-foreground">
          {missionLabel(scenario.number)} // {track.callsign}
        </span>
      </header>

      <ScenarioArt imageUrl={scenario.imageUrl} track={scenario.track} title={scenario.title} />

      <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
        {animate && !reduce && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary"
            initial={{ y: 0, opacity: 0.9 }}
            animate={{ y: 260, opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
        <h2 id="briefing-title" className="-mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
          {scenario.title}
        </h2>

        <p className="sr-only">{scenario.briefing}</p>
        <div
          aria-hidden="true"
          onClick={done ? undefined : skip}
          className="mt-4 min-h-[9rem] max-w-[68ch] whitespace-pre-line text-[17px] leading-[1.7] text-foreground"
        >
          {shown}
          {!done && <span className="ml-0.5 inline-block h-[1.1em] w-[0.55ch] translate-y-[3px] animate-pulse bg-primary" />}
        </div>
        {!done && (
          <button onClick={skip} className="label-mono mt-3 rounded-md text-muted-foreground hover:text-foreground">
            Skip to full text
          </button>
        )}

        {scenario.sources.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <SourceList sources={scenario.sources} />
          </div>
        )}
      </div>
    </article>
  )
}
