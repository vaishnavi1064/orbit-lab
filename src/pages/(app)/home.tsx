/* home pattern: data-forward — five track consoles with your missions flown and average score above the fold */

import { useState } from 'react'
import { AuthOverlay, useAuth } from 'deepspace'
import { Radio } from 'lucide-react'
import { PageHeader } from '../../components/space/PageHeader'
import { TrackGrid } from '../../components/space/TrackGrid'

export default function HomePage() {
  const { isSignedIn } = useAuth()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <PageHeader label="Mission control" title="Choose your station.">
        Each track hands you real scenarios. Finish them all and a new one is generated for you.
      </PageHeader>

      {!isSignedIn && <SignInStrip />}

      <div className="mt-10">
        <TrackGrid />
      </div>
    </div>
  )
}

/** Signed-out: the same surface in preview, with an inline sign-in. */
function SignInStrip() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-medium text-foreground">You are listening in, not on the channel.</p>
          <p className="text-sm text-muted-foreground">Sign in to receive briefings, transmit answers, and read the Crew Log.</p>
        </div>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="h-11 shrink-0 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-110"
      >
        Sign in to join
      </button>
      {open && <AuthOverlay onClose={() => setOpen(false)} />}
    </div>
  )
}
