/** Waiting room while the model works. Never a blank screen. */

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const DEFAULT_LINES = [
  'Contacting Houston...',
  'Flight director is reading your call...',
  'Cross-checking against the procedures...',
  'Decoding the debrief...',
]

export function GradingState({ lines = DEFAULT_LINES, label = 'Debrief incoming' }: { lines?: string[]; label?: string }) {
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % lines.length), 2200)
    return () => window.clearInterval(t)
  }, [lines.length])

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" data-testid="grading-state">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
        <span className="label-mono text-primary">{label}</span>
      </div>
      <div className="px-5 py-10 sm:px-8">
        <p role="status" aria-live="polite" className="font-mono text-lg text-foreground">
          {lines[i]}
        </p>
        <div className="mt-6 h-px w-full overflow-hidden bg-muted">
          {!reduce && <div className="scan-bar h-full w-1/3 bg-primary" />}
        </div>
        <div className="mt-8 space-y-3" aria-hidden="true">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}
