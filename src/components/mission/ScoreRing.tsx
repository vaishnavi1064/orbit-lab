/** Animated score ring (DESIGN.md sketch 3). Draws once; instant for reduced motion. */

import { useEffect, useState } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'

export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const reduce = useReducedMotion()
  const r = 52
  const c = 2 * Math.PI * r
  const [display, setDisplay] = useState(reduce ? score : 0)

  useEffect(() => {
    if (reduce) {
      setDisplay(score)
      return
    }
    const controls = animate(0, score, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplay(Math.round(v)) })
    return () => controls.stop()
  }, [score, reduce])

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`Score ${score} out of 10`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="8" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - score / 10) : c }}
          animate={{ strokeDashoffset: c * (1 - score / 10) }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="font-mono text-4xl font-medium tabular-nums text-foreground">{display}</span>
        <span className="label-mono text-muted-foreground">/ 10</span>
      </div>
    </div>
  )
}
