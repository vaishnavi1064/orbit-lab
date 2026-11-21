/**
 * Gated routes. Any file under src/pages/(app)/(protected)/ requires sign-in.
 * The `(protected)` folder is a Generouted route group — parentheses mean
 * it doesn't appear in the URL. For a dynamic page that does NOT require
 * sign-in, put it directly under src/pages/(app)/; for a static page, put it
 * at the top level of src/pages/.
 *
 * Children may call data hooks like `useUser()` safely because the parent
 * (app)/_layout.tsx mounts <RecordProvider> above this layout.
 *
 * The `fallback` keeps signed-out visitors inside the app's own chrome
 * (without it, AuthGate shows the SDK's full-screen, non-dismissible
 * overlay). The sign-in overlay opens on demand and can be dismissed.
 */

import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { AuthGate, AuthOverlay } from 'deepspace'
import { Button } from '@/components/ui'

export default function ProtectedLayout() {
  return (
    <AuthGate fallback={<SignedOutPanel />}>
      <Outlet />
    </AuthGate>
  )
}

function SignedOutPanel() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center px-4 py-16 sm:px-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="label-mono text-muted-foreground">Channel locked</span>
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-foreground">Sign in to open this channel.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Briefings, answers, and the Crew Log are for signed-in crew only.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={() => setShowAuthModal(true)}>
            Sign in
          </Button>
          <Link
            to="/home"
            className="label-mono mt-5 inline-block rounded-md text-muted-foreground hover:text-foreground"
          >
            Back to mission control
          </Link>
        </div>
      </div>

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}
