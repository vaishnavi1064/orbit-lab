import { describe, expect, it } from 'vitest'
import { crewLabel, crewNumbers } from './crew'

describe('crewNumbers', () => {
  it('numbers answers by submission order, starting at 1, regardless of input order', () => {
    const n = crewNumbers([
      { recordId: 'c', createdAt: '2026-11-21T10:00:03.000Z' },
      { recordId: 'a', createdAt: '2026-11-21T10:00:01.000Z' },
      { recordId: 'b', createdAt: '2026-11-21T10:00:02.000Z' },
    ])
    expect([n.get('a'), n.get('b'), n.get('c')]).toEqual([1, 2, 3])
  })

  it('breaks createdAt ties by recordId so every viewer gets the same numbers', () => {
    const t = '2026-11-21T10:00:00.000Z'
    const one = crewNumbers([{ recordId: 'y', createdAt: t }, { recordId: 'x', createdAt: t }])
    const two = crewNumbers([{ recordId: 'x', createdAt: t }, { recordId: 'y', createdAt: t }])
    expect(Object.fromEntries(one)).toEqual({ x: 1, y: 2 })
    expect(Object.fromEntries(two)).toEqual(Object.fromEntries(one))
  })

  it('handles an empty log', () => {
    expect(crewNumbers([]).size).toBe(0)
  })
})

describe('crewLabel', () => {
  it('shows "You" for your own entry and "Crew member N" for everyone else', () => {
    expect(crewLabel(true, 2)).toBe('You')
    expect(crewLabel(false, 3)).toBe('Crew member 3')
    expect(crewLabel(false, undefined)).toBe('Crew member')
  })
})
