/** Numbered source citations; external links open in a new tab. */

import { ExternalLink } from 'lucide-react'
import type { Source } from '@/lib/types'

export function SourceList({ sources, label = 'Sources' }: { sources: Source[]; label?: string }) {
  if (sources.length === 0) return null
  return (
    <div>
      <p className="label-mono text-muted-foreground">{label}</p>
      <ol className="mt-2 space-y-1.5">
        {sources.map((s, i) => (
          <li key={s.url} className="flex gap-3 text-sm">
            <span className="font-mono text-xs leading-6 text-primary">[{i + 1}]</span>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-w-0 items-start gap-1.5 rounded-sm leading-6 text-foreground hover:text-primary"
            >
              <span className="break-words">{s.title}</span>
              <ExternalLink className="mt-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}
