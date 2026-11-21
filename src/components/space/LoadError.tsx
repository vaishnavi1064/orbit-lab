/** Inline error for a failed live query, with an in-place retry (reconnect). */

import { RadioTower } from 'lucide-react'

export function LoadError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <RadioTower className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        <div>
          <p className="font-medium text-foreground">Lost contact with Mission Control.</p>
          <p className="text-sm text-muted-foreground">{message || 'The live data link dropped. It usually comes back on its own.'}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry ?? (() => window.location.reload())}
        className="h-10 shrink-0 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        Reconnect
      </button>
    </div>
  )
}
