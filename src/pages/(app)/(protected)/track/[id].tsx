/**
 * /track/:id: the missions in one track. Phase 1 renders the shell and the
 * empty state; Phase 2 wires the scenario list and "Request briefing".
 */

import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, SatelliteDish } from 'lucide-react'
import { getTrack } from '@/lib/tracks'
import { PageHeader } from '@/components/space/PageHeader'
import { TrackGlyph } from '@/components/space/TrackGlyph'
import { EmptyState } from '@/components/ui'

export default function TrackPage() {
  const { id } = useParams()
  const track = getTrack(id)

  if (!track) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <EmptyState
          icon={<SatelliteDish />}
          title="No such station"
          description="That track is not on the manifest."
        />
        <div className="mt-6 text-center">
          <Link to="/home" className="label-mono text-primary hover:underline">
            Back to mission control
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <Link
        to="/home"
        className="label-mono inline-flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All stations
      </Link>

      <div className="mt-6">
        <PageHeader
          label={`TRK-${track.number} // ${track.callsign}`}
          title={track.name}
          aside={<TrackGlyph track={track.id} className="h-16 w-16 text-primary" />}
        >
          {track.blurb}
        </PageHeader>
      </div>

      <section className="mt-10 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="label-mono text-muted-foreground">Mission log</span>
          <span className="label-mono text-muted-foreground">0 missions</span>
        </div>
        <div className="p-6 sm:p-10">
          <EmptyState
            icon={<SatelliteDish />}
            title="No transmissions on this channel yet"
            description="Briefings for this track arrive in the next build. Check back after Phase 2."
          />
        </div>
      </section>
    </div>
  )
}
