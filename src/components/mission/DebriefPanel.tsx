/** Feedback after transmitting: score ring, got right, missed, expert approach, sources. */

import { motion } from 'framer-motion'
import type { Debrief } from '@/lib/types'
import { ScoreRing } from './ScoreRing'
import { SourceList } from './SourceList'

const list = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } } }
const item = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }

function verdict(score: number) {
  if (score >= 9) return 'Flight director signs off.'
  if (score >= 7) return 'Solid call. A few gaps.'
  if (score >= 4) return 'Partly there. Review the procedure.'
  return 'Hold. Read the expert approach.'
}

export function DebriefPanel({ debrief, missionLabel }: { debrief: Debrief; missionLabel: string }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="debrief-title" data-testid="debrief-panel">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border px-5 py-3">
        <span className="label-mono flex items-center gap-2 text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Debrief
        </span>
        <span className="label-mono text-muted-foreground">{missionLabel}</span>
      </div>

      <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-5 md:flex-col md:items-start">
          <ScoreRing score={debrief.score} />
          <p id="debrief-title" className="max-w-[16ch] text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            {verdict(debrief.score)}
          </p>
        </div>

        <motion.div variants={list} initial="hidden" animate="show" className="space-y-7">
          <FeedbackList title="Got right" items={debrief.gotRight} filled empty="Nothing matched the procedure yet." />
          <FeedbackList title="Missed" items={debrief.missed} empty="Nothing missed. Clean call." />

          <motion.div variants={item}>
            <p className="label-mono text-muted-foreground">Expert approach</p>
            <p className="mt-2 max-w-[68ch] leading-relaxed text-foreground">{debrief.correctAnswer}</p>
          </motion.div>

          {debrief.sources.length > 0 && (
            <motion.div variants={item}>
              <SourceList sources={debrief.sources} />
            </motion.div>
          )}

          <motion.details variants={item} className="group rounded-lg border border-border bg-background/60 px-4 py-3">
            <summary className="label-mono cursor-pointer list-none rounded-sm text-muted-foreground hover:text-foreground">
              Your transmission
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{debrief.text}</p>
          </motion.details>
        </motion.div>
      </div>
    </section>
  )
}

function FeedbackList({ title, items, filled = false, empty }: { title: string; items: string[]; filled?: boolean; empty: string }) {
  return (
    <motion.div variants={item}>
      <p className="label-mono text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <motion.ul variants={list} className="mt-2 space-y-2">
          {items.map((text) => (
            <motion.li key={text} variants={item} className="flex gap-3">
              <span
                aria-hidden="true"
                className={filled ? 'mt-2 h-2 w-2 shrink-0 bg-primary' : 'mt-2 h-2 w-2 shrink-0 border border-muted-foreground'}
              />
              <span className={filled ? 'text-foreground' : 'text-muted-foreground'}>{text}</span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </motion.div>
  )
}
