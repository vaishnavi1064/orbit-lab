/**
 * Hero visual: a planet limb, two orbit ellipses, and one amber craft tracing
 * the outer orbit (24s per lap). SVG + token colors only.
 *
 * The motion element is added after mount and only when reduced motion is
 * off, so the prerendered HTML matches the first client render exactly.
 */

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const ORBIT = 'M 60 250 A 230 92 -14 1 1 520 250 A 230 92 -14 1 1 60 250'

export function OrbitHero() {
  const reduce = useReducedMotion()
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setAnimate(!reduce)
  }, [reduce])

  return (
    <svg
      viewBox="0 0 580 500"
      className="h-auto w-full max-w-[560px]"
      role="img"
      aria-label="A small craft tracing an orbit around a planet"
    >
      <defs>
        <radialGradient id="limb" cx="50%" cy="38%" r="60%">
          <stop offset="0%" stopColor="var(--color-secondary)" />
          <stop offset="70%" stopColor="var(--color-card)" />
          <stop offset="100%" stopColor="var(--color-background)" />
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="var(--color-primary)" stopOpacity="0" />
          <stop offset="78%" stopColor="var(--color-primary)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* atmosphere halo + planet */}
      <circle cx="290" cy="250" r="150" fill="url(#halo)" />
      <circle cx="290" cy="250" r="118" fill="url(#limb)" stroke="var(--color-border)" />
      {/* surface bands */}
      <path
        d="M182 228c60 14 156 14 216 0M176 262c66 16 162 16 228 0M196 300c50 10 138 10 188 0"
        stroke="var(--color-border)"
        strokeWidth="1.2"
        fill="none"
      />

      {/* inner orbit, dashed */}
      <ellipse
        cx="290"
        cy="250"
        rx="168"
        ry="62"
        transform="rotate(-14 290 250)"
        fill="none"
        stroke="var(--color-muted-foreground)"
        strokeOpacity="0.35"
        strokeDasharray="3 6"
      />
      {/* outer orbit */}
      <path d={ORBIT} fill="none" stroke="var(--color-muted-foreground)" strokeOpacity="0.55" />

      {/* station marker on the inner orbit */}
      <g transform="translate(140 214)">
        <rect x="-3" y="-3" width="6" height="6" fill="var(--color-foreground)" />
        <path d="M-12 0h24" stroke="var(--color-foreground)" strokeWidth="1.2" />
      </g>

      {/* the craft */}
      <g>
        <circle r="5" fill="var(--color-primary)" cx={animate ? 0 : 520} cy={animate ? 0 : 250} />
        <circle
          r="11"
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity="0.45"
          cx={animate ? 0 : 520}
          cy={animate ? 0 : 250}
        />
        {animate && <animateMotion dur="24s" repeatCount="indefinite" path={ORBIT} rotate="auto" />}
      </g>

      {/* mono callouts */}
      <g fontFamily="var(--font-mono)" fontSize="11" letterSpacing="2" fill="var(--color-muted-foreground)">
        <text x="404" y="120">APOAPSIS 412 KM</text>
        <path d="M400 124 L372 150" stroke="var(--color-border)" />
        <text x="40" y="380">PERIAPSIS 398 KM</text>
        <path d="M128 368 L152 336" stroke="var(--color-border)" />
      </g>
    </svg>
  )
}
