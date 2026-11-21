/**
 * Hand-built line glyphs, one per track. currentColor only, so they follow
 * the theme tokens (no emoji, no stock icons for the signature marks).
 */

import type { TrackId } from '@/lib/tracks'

interface Props {
  track: TrackId
  className?: string
}

export function TrackGlyph({ track, className }: Props) {
  const common = {
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  switch (track) {
    case 'iss-ops':
      return (
        <svg {...common}>
          <rect x="20" y="20" width="8" height="8" rx="1" />
          <path d="M24 14v6M24 28v6M8 22h12M28 22h12" />
          <rect x="4" y="16" width="6" height="12" />
          <rect x="38" y="16" width="6" height="12" />
          <rect x="12" y="18" width="5" height="8" />
          <rect x="31" y="18" width="5" height="8" />
        </svg>
      )
    case 'spacecraft-launch':
      return (
        <svg {...common}>
          <path d="M24 5c5 5 6 13 6 21H18c0-8 1-16 6-21z" />
          <path d="M18 26l-5 7h5M30 26l5 7h-5" />
          <path d="M21 33h6M22 37l-1 5M26 37l1 5M24 37v6" />
          <circle cx="24" cy="17" r="2.5" />
        </svg>
      )
    case 'orbits-gravity':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="5" />
          <ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(-20 24 24)" />
          <ellipse cx="24" cy="24" rx="12" ry="12" strokeDasharray="2 3" />
          <circle cx="41" cy="18" r="2" fill="currentColor" />
        </svg>
      )
    case 'black-holes-stars':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="6" fill="currentColor" fillOpacity="0.15" />
          <ellipse cx="24" cy="24" rx="20" ry="5" />
          <ellipse cx="24" cy="24" rx="14" ry="3" />
          <path d="M8 8l2 2M40 8l-2 2M24 4v3M6 38l3-1M42 38l-3-1" />
        </svg>
      )
    case 'planets':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="11" />
          <path d="M14 20c6 2 14 2 20 0M13.5 27c6 2 15 2 21 0" />
          <ellipse cx="24" cy="24" rx="21" ry="5.5" transform="rotate(-12 24 24)" />
        </svg>
      )
  }
}
