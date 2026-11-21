/**
 * Anonymous Crew Log labels. Real names are never stored on answers; each
 * answer is labelled by the order it was submitted for its scenario.
 *
 * Everyone who can read a scenario's Crew Log reads ALL of its answers (the
 * DO enforces that), so numbering by submission order gives every viewer the
 * same numbers.
 */

type Submitted = { recordId: string; createdAt: string }

/** recordId -> 1-based submission order (createdAt, then recordId to break ties). */
export function crewNumbers(records: readonly Submitted[]): Map<string, number> {
  const ordered = [...records].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.recordId.localeCompare(b.recordId),
  )
  return new Map(ordered.map((r, i) => [r.recordId, i + 1]))
}

export function crewLabel(own: boolean, n: number | undefined): string {
  if (own) return 'You'
  return n ? `Crew member ${n}` : 'Crew member'
}
