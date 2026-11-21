/** Orbit Lab wordmark: an orbit mark plus type. Token colors only. */

import { cn } from '@/lib/utils'

export function Wordmark({ small = false, className }: { small?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className={small ? 'h-5 w-5' : 'h-7 w-7'} aria-hidden="true">
        <ellipse
          cx="16"
          cy="16"
          rx="13"
          ry="5.5"
          fill="none"
          stroke="var(--color-muted-foreground)"
          strokeWidth="1.4"
          transform="rotate(-24 16 16)"
        />
        <circle cx="16" cy="16" r="4.2" fill="var(--color-foreground)" />
        <circle cx="27" cy="11" r="2.3" fill="var(--color-primary)" />
      </svg>
      <span
        className={cn(
          'font-display font-semibold tracking-[0.14em] text-foreground',
          small ? 'text-xs' : 'text-sm',
        )}
      >
        ORBIT LAB
      </span>
    </span>
  )
}
