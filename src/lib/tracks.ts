/**
 * The five learning tracks (SPEC.md). Shared by client and worker, so keep it
 * free of browser or worker imports.
 */

export const TRACK_IDS = [
  'iss-ops',
  'spacecraft-launch',
  'orbits-gravity',
  'black-holes-stars',
  'planets',
] as const

export type TrackId = (typeof TRACK_IDS)[number]

export interface Track {
  id: TrackId
  /** Two-digit station number for mono labels: `TRK-02`. */
  number: string
  name: string
  /** Short uppercase form for mission headers: `MISSION 04 // ISS OPERATIONS`. */
  callsign: string
  blurb: string
}

export const TRACKS: Track[] = [
  {
    id: 'iss-ops',
    number: '01',
    name: 'ISS Operations',
    callsign: 'ISS OPERATIONS',
    blurb: 'Life support, spacewalks, and keeping a crew alive in orbit.',
  },
  {
    id: 'spacecraft-launch',
    number: '02',
    name: 'Spacecraft & Launch',
    callsign: 'LAUNCH CONTROL',
    blurb: 'Max-Q, staging, abort modes, and the rocket equation.',
  },
  {
    id: 'orbits-gravity',
    number: '03',
    name: 'Orbits & Gravity',
    callsign: 'FLIGHT DYNAMICS',
    blurb: 'Transfers, rendezvous, and why going faster takes you higher.',
  },
  {
    id: 'black-holes-stars',
    number: '04',
    name: 'Black Holes & Stars',
    callsign: 'DEEP FIELD',
    blurb: 'Stellar lives, collapse, and light that never gets out.',
  },
  {
    id: 'planets',
    number: '05',
    name: 'Planets',
    callsign: 'PLANETARY SCIENCE',
    blurb: 'Atmospheres, landers, and worlds beyond our own.',
  },
]

export function isTrackId(value: unknown): value is TrackId {
  return typeof value === 'string' && (TRACK_IDS as readonly string[]).includes(value)
}

export function getTrack(id: string | undefined): Track | undefined {
  return TRACKS.find((t) => t.id === id)
}

/** `MISSION 04` style label from a 1-based number. */
export function missionLabel(n: number): string {
  return `MISSION ${String(n).padStart(2, '0')}`
}
