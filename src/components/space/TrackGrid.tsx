/** Asymmetric bento of the five tracks: two wide stations, three narrow. */

import { TRACKS, type TrackId } from '@/lib/tracks'
import { TrackCard, type TrackStats } from './TrackCard'

const SPANS = ['md:col-span-3', 'md:col-span-3', 'md:col-span-2', 'md:col-span-2', 'md:col-span-2']

export function TrackGrid({ stats }: { stats?: Partial<Record<TrackId, TrackStats>> }) {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      {TRACKS.map((track, i) => (
        <TrackCard key={track.id} track={track} wide={i < 2} stats={stats?.[track.id]} className={SPANS[i]} />
      ))}
    </div>
  )
}
