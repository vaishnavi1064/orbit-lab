/**
 * Scenario illustration. Lazy-loaded image when present; otherwise (or if the
 * image fails) a token-built gradient "horizon" with the track glyph, so the
 * page never waits on or breaks because of image generation.
 */

import { useState } from 'react'
import type { TrackId } from '@/lib/tracks'
import { cn } from '@/lib/utils'
import { TrackGlyph } from '../space/TrackGlyph'

interface Props {
  imageUrl?: string
  track: TrackId
  title: string
  className?: string
}

export function ScenarioArt({ imageUrl, track, title, className }: Props) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const showImage = !!imageUrl && !failed

  return (
    <div className={cn('relative aspect-[16/9] overflow-hidden bg-muted sm:aspect-[21/9]', className)}>
      {/* Gradient stays underneath until the image has actually loaded. */}
      {(!showImage || !loaded) && <FallbackArt track={track} />}
      {showImage && (
        <img
          src={imageUrl}
          alt={`Illustration for ${title}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          data-testid="scenario-image"
        />
      )}
      {/* bottom fade into the panel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />
    </div>
  )
}

function FallbackArt({ track }: { track: TrackId }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(120% 90% at 50% 120%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 55%), linear-gradient(180deg, var(--color-background), var(--color-secondary))',
      }}
    >
      <svg className="absolute inset-x-0 bottom-0 h-1/2 w-full" viewBox="0 0 400 100" preserveAspectRatio="none">
        <path d="M0 100 Q200 30 400 100 Z" fill="var(--color-card)" />
        <path d="M0 100 Q200 30 400 100" fill="none" stroke="var(--color-primary)" strokeOpacity="0.5" />
      </svg>
      <TrackGlyph track={track} className="absolute right-[8%] top-[18%] h-16 w-16 text-muted-foreground sm:h-24 sm:w-24" />
    </div>
  )
}
